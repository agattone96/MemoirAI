import os
import re
import json
import uuid
from datetime import datetime
from path_manager import path_manager
from db import get_db
from ai_engine import AIEngine

class ForensicsEngine:
    def __init__(self):
        self.base_dir = os.path.join(path_manager.base_dir, "Forensics")
        self.ai = AIEngine()

    def _generate_id(self, prefix):
        return f"{prefix}_{uuid.uuid4().hex[:8]}"

    def create_run(self, person_id, transcript_id, variables=None):
        run_id = self._generate_id("RUN")
        conn = get_db()
        cursor = conn.cursor()
        
        variables_json = json.dumps(variables or {})
        
        cursor.execute("""
            INSERT INTO forensics_runs (id, person_id, transcript_id, variables_json, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (run_id, person_id, transcript_id, variables_json, datetime.utcnow().isoformat()))
        
        conn.commit()
        conn.close()
        return run_id

    def get_run_status(self, run_id):
        conn = get_db()
        row = conn.execute("SELECT * FROM forensics_runs WHERE id = ?", (run_id,)).fetchone()
        conn.close()
        if not row:
            return None
        return dict(row)

    def scan_participants(self, transcript_path):
        """
        Scans a file for speaker labels.
        Heuristic: Lines starting with [Name]: or Name: or containing timestamps.
        """
        if not os.path.exists(transcript_path):
            raise FileNotFoundError(f"Transcript not found: {transcript_path}")
            
        labels = set()
        # Heuristic 1: Facebook HTML PAM div
        if transcript_path.endswith(".html"):
            from bs4 import BeautifulSoup
            with open(transcript_path, 'rb') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
                # Find speaker headers
                for h in soup.find_all(['h2', 'div'], class_=['_3-96', 'pam']):
                    name = h.text.strip()
                    if name and len(name) < 50:
                        labels.add(name)
        else:
            # Generic Text Heuristic
            with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    # Match "Name:" or "[Timestamp] Name:"
                    match = re.search(r'^(?:\[.*?\]\s+)?([^:]+):', line)
                    if match:
                        name = match.group(1).strip()
                        if 1 < len(name) < 50:
                            labels.add(name)
                            
        return sorted(list(labels))

    def resolve_participants(self, run_id, mapping):
        """
        mapping: { "Speaker Label": "PER_ID" }
        Updates the run's variables_json with the participant map.
        """
        conn = get_db()
        row = conn.execute("SELECT variables_json FROM forensics_runs WHERE id = ?", (run_id,)).fetchone()
        if not row:
            conn.close()
            return False
            
        variables = json.loads(row['variables_json'] or '{}')
        variables['participant_map'] = mapping
        
        conn.execute("UPDATE forensics_runs SET variables_json = ? WHERE id = ?", (json.dumps(variables), run_id))
        conn.commit()
        conn.close()
        return True

    def _load_transcript_content(self, transcript_path):
        """
        Loads transcript file content.
        """
        if not os.path.exists(transcript_path):
            raise FileNotFoundError(f"Transcript file not found: {transcript_path}")
            
        # Handle HTML files
        if transcript_path.endswith('.html'):
            from bs4 import BeautifulSoup
            with open(transcript_path, 'rb') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
                # Extract text, preserving structure
                return soup.get_text(separator='\n', strip=True)
        else:
            # Plain text or markdown
            with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()

    def prepare_execution(self, run_id):
        """
        Reads the canonical prompts and interpolates variables.
        """
        conn = get_db()
        run = conn.execute("SELECT * FROM forensics_runs WHERE id = ?", (run_id,)).fetchone()
        conn.close()
        
        if not run: return None
        
        variables = json.loads(run['variables_json'] or '{}')
        
        # Load Execution Template
        # Ensure we look in the right place relative to the package
        base_path = os.path.dirname(os.path.abspath(__file__))
        # Try finding templates in 'analyzer' sibling or 'prompts' folder
        potential_paths = [
            os.path.join(base_path, "../analyzer/EXECUTION PROMPT TEMPLATE.txt"),
            os.path.join(base_path, "prompts/EXECUTION PROMPT TEMPLATE.txt"),
            os.path.join(path_manager.base_dir, "templates/EXECUTION PROMPT TEMPLATE.txt")
        ]
        
        exec_path = None
        for p in potential_paths:
            if os.path.exists(p):
                exec_path = p
                break
        
        if not exec_path:
            # Check dev relative path
            dev_path = os.path.join(path_manager.base_dir, "..", "analyzer", "EXECUTION PROMPT TEMPLATE.txt")
            if os.path.exists(dev_path):
                exec_path = dev_path
                          
        if not os.path.exists(exec_path):
             return None # Or raise error
        
        with open(exec_path, 'r') as f:
            template = f.read()
            
        # Load transcript content if path provided
        transcript_path = variables.get('transcript', '')
        if transcript_path and os.path.exists(transcript_path):
            transcript_content = self._load_transcript_content(transcript_path)
        else:
            transcript_content = variables.get('transcript', 'NO TRANSCRIPT PROVIDED')
            
        # Interpolate variables into template
        # Template uses placeholders like <<<{TRANSCRIPT}>>>
        final_prompt = template
        
        # Replace <<<{TRANSCRIPT}>>> with actual content
        final_prompt = final_prompt.replace('<<<{TRANSCRIPT}>>>', transcript_content)
        final_prompt = final_prompt.replace('<<<{GOAL}>>>', variables.get('goal', 'Clarity + documentation'))
        final_prompt = final_prompt.replace('<<<{STYLE}>>>', variables.get('style', 'Premium'))
        final_prompt = final_prompt.replace('<<<{EVIDENCE_MODE}>>>', variables.get('evidence_mode', 'Balanced citations'))
        final_prompt = final_prompt.replace('<<<{MODULE_SELECTION}>>>', variables.get('module_selection', ''))
        
        return final_prompt
    
    def execute_with_progress(self, job_id, run_id):
        """
        Wrapper for execute_full_run with JobRunner progress updates.
        """
        from job_runner import job_runner
        try:
            job_runner.update_progress(job_id, 10, "Preparing execution...")
            result = self.execute_full_run(run_id, job_id)
            return result
        except Exception as e:
            job_runner.fail_job(job_id, str(e))
            raise

    def execute_full_run(self, run_id, job_id=None):
        """
        Full pipeline: Prepare Prompt -> Call LLM -> Parse & Store Results -> Update DB
        """
        from job_runner import job_runner
        conn = get_db()
        run = conn.execute("SELECT * FROM forensics_runs WHERE id = ?", (run_id,)).fetchone()
        if not run:
            conn.close()
            return False
            
        person_id = run['person_id']
        variables = json.loads(run['variables_json'] or '{}')
        transcript_ref = variables.get('transcript') # e.g. "path/to/file.txt"
        
        # 1. Update Status
        conn.execute("UPDATE forensics_runs SET status = 'running' WHERE id = ?", (run_id,))
        conn.commit()
        if job_id:
            job_runner.update_progress(job_id, 20, "Preparing forensics prompt...")
        
        try:
            # 2. Prepare Prompt
            prompt = self.prepare_execution(run_id)
            if not prompt:
                raise Exception("Failed to prepare prompt")
                
            # 3. Call LLM
            if job_id:
                job_runner.update_progress(job_id, 40, "Calling GPT-4o for analysis...")
            
            # Forensics template is essentially a complete instruction.
            # We'll use chat_completion with a simple system prompt.
            messages = [
                {"role": "system", "content": "You are a Conversation Forensics Specialist. Follow the execution template EXACTLY."},
                {"role": "user", "content": prompt}
            ]
            
            # Note: Forensics can be LONG. GPT-4o might be better for context window.
            # Using generic chat_completion (non-streaming for storage)
            from openai import OpenAI
            api_key = self.ai.settings.get("openai_api_key")
            client = OpenAI(api_key=api_key)
            
            response = client.chat.completions.create(
                model="gpt-4o", # Using 4o for better entity resolution and context
                messages=messages,
                temperature=0.1 # Low temperature for analytical consistency
            )
            
            full_result = response.choices[0].message.content
            
            if job_id:
                job_runner.update_progress(job_id, 80, "Parsing and storing results...")
            
            # 4. Parse & Split Results
            # Heuristic: Dual-Layer Output often separates Reader Report and Forensics Appendix.
            # The prompt templates might define specific markers.
            # If not found, we'll store the whole block as Reader Report and mark Appendix as 'embedded'.
            
            parts = re.split(r'#+\s*(?:FORENSICS APPENDIX|APPENDIX)', full_result, flags=re.IGNORECASE)
            reader_report = parts[0]
            appendix = parts[1] if len(parts) > 1 else ""
            
            # 5. Store Files in Vault
            # Path: Vault/People/{PersonID}/Forensics/Runs/{RunID}/
            run_dir = os.path.join(path_manager.base_dir, "People", person_id, "Forensics", "Runs", run_id)
            if not os.path.exists(run_dir):
                os.makedirs(run_dir)
                
            report_path = os.path.join(run_dir, "00_reader_report.md")
            appendix_path = os.path.join(run_dir, "01_forensics_appendix.md")
            meta_path = os.path.join(run_dir, "meta.json")
            
            with open(report_path, 'w') as f: f.write(reader_report)
            with open(appendix_path, 'w') as f: f.write(appendix)
            with open(meta_path, 'w') as f:
                json.dump({
                    "run_id": run_id,
                    "person_id": person_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "variables": variables
                }, f)
                
            # 6. Update DB
            conn.execute("""
                UPDATE forensics_runs 
                SET status = 'completed', 
                    report_path = ?, 
                    appendix_path = ?, 
                    completed_at = ? 
                WHERE id = ?
            """, (report_path, appendix_path, datetime.utcnow().isoformat(), run_id))
            
            # Update Link in Person
            conn.execute("UPDATE entities SET latest_forensics_run_id = ? WHERE id = ?", (run_id, person_id))
            
            conn.commit()
            return True
            
        except Exception as e:
            print(f"Forensics Error (Run {run_id}): {e}")
            conn.execute("UPDATE forensics_runs SET status = 'failed', error_msg = ? WHERE id = ?", (str(e), run_id))
            conn.commit()
            return False
        finally:
            conn.close()
