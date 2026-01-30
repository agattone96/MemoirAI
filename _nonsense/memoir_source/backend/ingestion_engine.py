import os
import sqlite3
import hashlib
import zipfile
import json
import uuid
import threading
from datetime import datetime
from bs4 import BeautifulSoup
from rag_engine import get_rag_engine
from schemas import NormalizedMessage, IngestionReport
from pydantic import ValidationError
from db import get_db

# Removed: executor = ThreadPoolExecutor(max_workers=2)
# Now using unified job_runner from job_runner.py

from db import get_db

def generate_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"

from path_manager import path_manager

class DeadLetterQueue:
    def __init__(self, path=None):
        self.path = path or path_manager.dlq_file
        
    def push(self, raw_data: dict, error_reason: str, batch_id: str):
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "batch_id": batch_id,
            "error": error_reason,
            "raw_data": str(raw_data) # Convert to string to ensure serializability
        }
        with open(self.path, "a") as f:
            f.write(json.dumps(entry) + "\n")

class IngestionEngine:
    def __init__(self, upload_folder=None, media_folder=None):
        self.upload_folder = upload_folder or path_manager.uploads_path
        self.media_folder = media_folder or path_manager.media_path
        self.rag = get_rag_engine()
        self.dlq = DeadLetterQueue()
        
        if not os.path.exists(self.upload_folder):
            os.makedirs(self.upload_folder)
        if not os.path.exists(self.media_folder):
            os.makedirs(self.media_folder)

    def create_batch(self, filename, source_type='generic_zip'):
        batch_id = generate_id("BATCH")
        conn = get_db()
        # Also create a job record if it's going to be backgrounded
        conn.execute("""
            INSERT INTO ingestion_jobs (id, status, progress, started_at)
            VALUES (?, ?, ?, ?)
        """, (batch_id, 'pending', 0, datetime.utcnow().isoformat()))
        
        conn.execute("""
            INSERT INTO import_batches (id, source_type, status, file_name, started_at)
            VALUES (?, ?, ?, ?, ?)
        """, (batch_id, source_type, 'pending', filename, datetime.utcnow().isoformat()))
        conn.commit()
        conn.close()
        return batch_id

    def update_job_progress(self, job_id, progress, status=None, error=None):
        conn = get_db()
        try:
            sql = "UPDATE ingestion_jobs SET progress = ?"
            params = [progress]
            if status:
                sql += ", status = ?"
                params.append(status)
            if error:
                sql += ", error_msg = ?"
                params.append(error)
            if status in ['completed', 'failed']:
                sql += ", completed_at = ?"
                params.append(datetime.utcnow().isoformat())
            
            sql += " WHERE id = ?"
            params.append(job_id)
            conn.execute(sql, tuple(params))
            conn.commit()
        finally:
            conn.close()

    def update_batch_status(self, batch_id, status, report: IngestionReport=None, conn=None):
        should_close = False
        if not conn:
            conn = get_db()
            should_close = True
            
        sql = "UPDATE import_batches SET status = ?, completed_at = ? WHERE id = ?"
        params = [status, None, batch_id]
        if status in ['completed', 'failed']:
            params[1] = datetime.utcnow().isoformat()
        
        if report:
             conn.execute("UPDATE import_batches SET report_json = ? WHERE id = ?", (report.json(), batch_id))
        
        conn.execute(sql, tuple(params))
        conn.commit()
        
        if should_close:
            conn.close()

    def process_background(self, batch_id, file_path, is_directory=False):
        """
        Process file/directory in background using unified JobRunner.
        """
        from job_runner import job_runner
        
        # Create unified job
        job_id = job_runner.create_job('ingestion', {
            'batch_id': batch_id,
            'file_path': file_path,
            'is_directory': is_directory
        })
        
        # Submit to job runner
        if is_directory:
            job_runner.submit_job(job_id, self._process_directory_with_progress, job_id, batch_id, file_path)
        else:
            job_runner.submit_job(job_id, self._process_zip_with_progress, job_id, batch_id, file_path)
            
        return job_id
    
    def _process_directory_with_progress(self, job_id, batch_id, file_path):
        """Wrapper for directory processing with job progress updates."""
        from job_runner import job_runner
        try:
            # Update ingestion_jobs for backward compatibility
            self.update_job_progress(batch_id, 0, 'running')
            job_runner.update_progress(job_id, 0, "Starting directory processing...")
            
            self._process_directory_logic(batch_id, file_path, job_id)
            
            job_runner.update_progress(job_id, 100, "Directory processing complete")
            self.update_job_progress(batch_id, 100, 'completed')
            return batch_id
        except Exception as e:
            job_runner.fail_job(job_id, str(e))
            self.update_job_progress(batch_id, 0, 'failed', str(e))
            raise
    
    def _process_zip_with_progress(self, job_id, batch_id, file_path):
        """Wrapper for ZIP processing with job progress updates."""
        from job_runner import job_runner
        try:
            self.update_job_progress(batch_id, 0, 'running')
            job_runner.update_progress(job_id, 0, "Starting ZIP processing...")
            
            self._process_zip_logic(batch_id, file_path, job_id)
            
            job_runner.update_progress(job_id, 100, "ZIP processing complete")
            self.update_job_progress(batch_id, 100, 'completed')
            return batch_id
        except Exception as e:
            job_runner.fail_job(job_id, str(e))
            self.update_job_progress(batch_id, 0, 'failed', str(e))
            raise

    def _process_single_file(self, conn, filename, content_bytes, batch_id, report):
        """
        Reusable logic to process a single file's content (Artifact -> Media/Message).
        Returns True if something was processed, False otherwise.
        """
        # 1. Hashing for File Level Idempotency
        file_hash = hashlib.sha256(content_bytes).hexdigest()
        
        cursor = conn.execute("SELECT id FROM source_artifacts WHERE raw_hash = ?", (file_hash,))
        if cursor.fetchone():
            return False
            
        # 2. Record Artifact
        art_id = generate_id("ART")
        conn.execute("""
            INSERT INTO source_artifacts (id, batch_id, file_path, raw_hash, status)
            VALUES (?, ?, ?, ?, ?)
        """, (art_id, batch_id, filename, file_hash, 'parsed'))
        
        # 3. Media Extraction
        if self._is_media_file(filename):
                self._ingest_media(filename, content_bytes)
                return True

        # 4. Message Parse Logic
        if filename.endswith('.html') and 'messages/inbox' in filename:
            try:
                msg_count = self._parse_facebook_thread(conn, content_bytes, art_id, batch_id, report, filename)
                report.messages_created += msg_count
                report.files_parsed += 1
                return True
            except Exception as e:
                report.log_error(f"File Parse Error {filename}: {str(e)}")
        
        return True

    def _process_directory_logic(self, batch_id, root_path):
        conn = get_db()
        report = IngestionReport(batch_id=batch_id, start_time=datetime.utcnow().isoformat())
        
        try:
            self.update_batch_status(batch_id, 'processing', conn=conn)
            
            # Walk directory
            file_count = 0
            for root, dirs, files in os.walk(root_path):
                file_count += len(files)
            report.files_found = file_count
            
            for i, (root, dirs, files) in enumerate(os.walk(root_path)):
                for name in files:
                    full_path = os.path.join(root, name)
                    rel_path = os.path.relpath(full_path, root_path)
                    
                    try:
                        with open(full_path, 'rb') as f:
                            content_bytes = f.read()
                            
                        self._process_single_file(conn, rel_path, content_bytes, batch_id, report)
                        
                        # Update progress every 10 files
                        if report.files_parsed % 10 == 0:
                            progress = (report.files_parsed / report.files_found) * 100 if report.files_found else 0
                            self.update_job_progress(batch_id, progress)
                            
                    except Exception as e:
                        report.log_error(f"Read Error {rel_path}: {e}")

            report.finish('completed')
            self.update_batch_status(batch_id, 'completed', report, conn=conn)
            self.update_job_progress(batch_id, 100, status='completed')
            
        except Exception as e:
            print(f"Batch Failed: {e}")
            report.log_error(f"Fatal Batch Error: {str(e)}")
            report.finish('failed')
            try:
                self.update_batch_status(batch_id, 'failed', report, conn=conn)
            except:
                self.update_batch_status(batch_id, 'failed', report)
        finally:
            conn.close()

    def _process_zip_logic(self, batch_id, file_path):
        conn = get_db()
        report = IngestionReport(batch_id=batch_id, start_time=datetime.utcnow().isoformat())
        
        try:
            self.update_batch_status(batch_id, 'processing', conn=conn)
            
            with zipfile.ZipFile(file_path, 'r') as z:
                file_list = z.namelist()
                report.files_found = len(file_list)
                
                for i, name in enumerate(file_list):
                    if name.endswith('/'): continue
                    
                    content_bytes = z.read(name)
                    self._process_single_file(conn, name, content_bytes, batch_id, report)
                    
                    # Update progress every 10 files
                    if i % 10 == 0:
                        progress = (i / report.files_found) * 100 if report.files_found else 0
                        self.update_job_progress(batch_id, progress)
            
            report.finish('completed')
            self.update_batch_status(batch_id, 'completed', report, conn=conn)
            self.update_job_progress(batch_id, 100, status='completed')
            
        except Exception as e:
            print(f"Batch Failed: {e}")
            report.log_error(f"Fatal Batch Error: {str(e)}")
            report.finish('failed')
            try:
                self.update_batch_status(batch_id, 'failed', report, conn=conn)
            except:
                self.update_batch_status(batch_id, 'failed', report)
        finally:
            conn.close()

    def _is_media_file(self, filename):
        ext = filename.lower().split('.')[-1]
        return ext in ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'webp']

    def _ingest_media(self, filename, content_bytes):
        # Flatten structure: photos/and/videos/IMG_123.jpg -> data/media/IMG_123.jpg
        basename = os.path.basename(filename)
        
        # 1. Calculate Hash of the *media content*
        media_hash = hashlib.sha256(content_bytes).hexdigest()
        
        # 2. Check global artifact registry for this hash
        # We need a db connection here. Since this is usually called from _process_zip_logic which has a conn,
        # but _ingest_media signature didn't take conn. We should modify it or open a quick one.
        # Ideally, _ingest_media is called inside the loop with an open conn.
        # Optimization: To avoid opening one every time, let's just use a fresh one if not passed, 
        # but for bulk ingest it's better to reuse.
        # However, _process_zip_logic calls self._ingest_media(name, content_bytes).
        # Let's verify _ingest_media usage. It's used in line 119: self._ingest_media(name, content_bytes).
        # We need to change signature to accept conn or open one.
        
        # Let's open a transient connection for safety/simplicity as duplicate checks are fast reads.
        conn = get_db()
        try:
            # Check if `raw_hash` exists in `source_artifacts`.
            
            exists = conn.execute("SELECT id FROM source_artifacts WHERE raw_hash = ?", (media_hash,)).fetchone()
            # Note: We rely on the caller loop to skip duplicates usually, but if called directly, we might double write.
            # However, for pure storage dedup, we proceed to write with HASH filename.
            # If the file exists on disk (checked below), we skip write.
            
        except Exception as e:
            print(f"Media Dedupe Check Error: {e}")
        finally:
            conn.close()
        
        ext = os.path.splitext(basename)[1].lower()
        # Rename to Hash to prevent filename collisions for different content
        # and ensure identical content maps to one file.
        safe_filename = f"{media_hash}{ext}"
        target_path = os.path.join(self.media_folder, safe_filename)
        
        if not os.path.exists(target_path):
            with open(target_path, 'wb') as f:
                f.write(content_bytes)
        
        return safe_filename

    def _apply_tags(self, text):
        tags = []
        text_lower = text.lower()
        keywords = {
            'travel': ['flight', 'airport', 'hotel', 'trip', 'vacation', 'passport'],
            'family': ['mom', 'dad', 'sister', 'brother', 'grandma', 'family'],
            'work': ['meeting', 'deadline', 'boss', 'office', 'work', 'project'],
            'celebration': ['birthday', 'party', 'congrats', 'anniversary', 'wedding'],
            'food': ['dinner', 'lunch', 'breakfast', 'restaurant', 'cook']
        }
        for tag, words in keywords.items():
            if any(w in text_lower for w in words):
                tags.append(tag)
        return list(set(tags))

    def _parse_timestamp(self, time_str):
        if not time_str: return 0.0
        
        # Clean string: remove non-ascii, extra spaces
        clean_str = time_str.strip()
        
        formats = [
            '%b %d, %Y %I:%M:%S %p', # Jan 01, 2024 12:00:00 PM
            '%b %d, %Y, %I:%M %p',   # CSV export style sometimes
            '%Y-%m-%d %H:%M:%S',     # ISO-ish
            '%A, %B %d, %Y at %I:%M %p' # Facebook "Saturday, January 1, 2022 at 12:00 PM"
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(clean_str, fmt)
                return dt.timestamp()
            except ValueError:
                continue
        
        # Fallback: validation will catch 0.0
        return 0.0

    def _parse_facebook_thread(self, conn, content_bytes, art_id, batch_id, report, filename):
        soup = BeautifulSoup(content_bytes, 'html.parser')
        
        # Get Title
        title_tag = soup.find('title')
        title = title_tag.string.replace("Participants: ", "") if title_tag else "Unknown"
        
        # Get/Create Thread
        cursor = conn.execute("SELECT id FROM threads WHERE title=?", (title,))
        row = cursor.fetchone()
        if row:
            thread_id = row['id']
        else:
            thread_id = generate_id("THR")
            conn.execute("INSERT INTO threads (id, title) VALUES (?, ?)", (thread_id, title))
            
        # Parse Messages
        messages_to_insert = []
        batch_size = 500
        count = 0
        
        # Selectors
        sections = soup.find_all('section', class_='_a6-g')
        if not sections: sections = soup.find_all('div', class_='pam')

        for section in sections:
            # Extraction
            sender = "Unknown"
            s_tag = section.find('h2') or section.find('div', class_='_3-96')
            if s_tag: sender = s_tag.text
            
            text = ""
            text_div = section.find('div', class_='_a6-p') or section.find('div', class_='_3-95')
            if text_div: text = text_div.text.strip()
            
            timestamp = 0.0
            time_div = section.find('div', class_='_a72d') or section.find('div', class_='_3-94')
            if time_div:
                timestamp = self._parse_timestamp(time_div.text)
            
            if not text: continue
            
            try:
                # 1. auto-tag
                tags = self._apply_tags(text)

                # 2. Validation
                norm_msg = NormalizedMessage(
                    sender=sender,
                    content=text,
                    timestamp=timestamp,
                    thread_title=title,
                    source_file=filename,
                    tags=tags
                )
                
                # 3. Content Hash (Idempotency)
                raw_sig = f"{norm_msg.sender}{norm_msg.timestamp}{norm_msg.content}"
                msg_hash = hashlib.sha256(raw_sig.encode()).hexdigest()
                
                # Batch preparation
                msg_id = generate_id("MSG")
                messages_to_insert.append((
                    msg_id, thread_id, None, norm_msg.sender, norm_msg.timestamp, 
                    norm_msg.content, msg_hash, batch_id, filename, json.dumps(tags)
                ))
                
                # RAG (Still per-message for now, but we'll optimize if needed)
                if self.rag:
                    try:
                        self.rag.ingest_message(norm_msg.content, {
                            'id': msg_id,
                            'sender': norm_msg.sender,
                            'timestamp': norm_msg.timestamp,
                            'thread': norm_msg.thread_title,
                            'tags': ','.join(tags) 
                        })
                    except Exception:
                        pass # Non-fatal
                        
                count += 1
                
                if len(messages_to_insert) >= batch_size:
                    self._perform_batch_insert(conn, messages_to_insert, report)
                    messages_to_insert = []
                
            except ValidationError as ve:
                report.log_error(f"Validation Failed: {ve}")
                self.dlq.push(raw_data={'sender': sender, 'text': text}, error_reason=str(ve), batch_id=batch_id)
            except Exception as e:
                report.log_error(f"Message Parse Error: {e}")
                
        # Final batch
        if messages_to_insert:
            self._perform_batch_insert(conn, messages_to_insert, report)
                
        conn.commit()
        return count

    def _perform_batch_insert(self, conn, records, report):
        """
        Executes a batch insert with deduplication check.
        Records: list of tuples (id, thread_id, sender_entity_id, sender_name, timestamp_utc, content_text, content_hash, source_export_id, source_file_path, tags)
        """
        if not records: return
        
        # Check hashes for the entire batch to avoid unique constraint violations
        hashes = [r[6] for r in records]
        placeholders = ','.join('?' * len(hashes))
        
        cursor = conn.execute(f"SELECT content_hash FROM messages WHERE content_hash IN ({placeholders})", hashes)
        existing_hashes = {row['content_hash'] for row in cursor.fetchall()}
        
        # Filter records: keep only those not in DB
        filtered_records = [r for r in records if r[6] not in existing_hashes]
        report.duplicates_skipped += (len(records) - len(filtered_records))
        
        if not filtered_records: return
        
        sql = """
            INSERT INTO messages (
                id, thread_id, sender_entity_id, sender_name, timestamp_utc, 
                content_text, content_hash, source_export_id, source_file_path, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        conn.executemany(sql, filtered_records)

        
    def get_dlq_errors(self, limit=50):
        """Reads the last N errors from the Dead Letter Queue"""
        errors = []
        if not os.path.exists(self.dlq.path):
            return []
            
        try:
            # Read all lines then take last N (for simple file based queue)
            # For massive files, 'deque(file, limit)' is better but this is fine for phase 1
            with open(self.dlq.path, 'r') as f:
                lines = f.readlines()
                for line in reversed(lines[-limit:]):
                    try:
                        errors.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        except Exception:
            return []
