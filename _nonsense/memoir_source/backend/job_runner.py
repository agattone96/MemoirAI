import os
import json
import uuid
import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, Future
from typing import Callable, Any, Dict, Optional, List
from db import get_db

class JobRunner:
    """
    Unified background job system for handling long-running tasks.
    Manages job lifecycle, progress tracking, and event broadcasting.
    """
    
    def __init__(self, max_workers=4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="JobRunner")
        self.active_jobs: Dict[str, Future] = {}
        self.lock = threading.Lock()
        
    def _generate_job_id(self, prefix="JOB"):
        return f"{prefix}_{uuid.uuid4().hex[:12]}"

    def _redact_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Redact sensitive keys from payload before storage."""
        sensitive_keys = {'api_key', 'password', 'secret', 'token', 'auth'}
        redacted = payload.copy()
        for key in payload:
            if any(s in key.lower() for s in sensitive_keys):
                redacted[key] = "***REDACTED***"
        return redacted

    
    def create_job(self, job_type: str, payload: Dict[str, Any] = None, metadata: Dict[str, Any] = None) -> str:
        """
        Create a new job record in the database.
        
        Args:
            job_type: Type of job ('ingestion', 'forensics', 'export', 'analysis')
            payload: Job-specific input data
            metadata: Additional metadata
            
        Returns:
            job_id: Unique identifier for the job
        """
        job_id = self._generate_job_id()
        conn = get_db()
        
        conn.execute("""
            INSERT INTO jobs (id, type, status, progress, payload_json, metadata_json, created_at, updated_at)
            VALUES (?, ?, 'pending', 0, ?, ?, ?, ?)
        """, (
            job_id,
            job_type,
            json.dumps(self._redact_payload(payload or {})),
            json.dumps(metadata or {}),
            datetime.utcnow().isoformat(),
            datetime.utcnow().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        print(f"[JobRunner] Created job {job_id} (type={job_type})")
        return job_id
    
    def submit_job(self, job_id: str, func: Callable, *args, **kwargs) -> Future:
        """
        Submit a job to the executor and start tracking.
        
        Args:
            job_id: Job identifier
            func: Function to execute
            *args, **kwargs: Arguments to pass to func
            
        Returns:
            Future object for the submitted job
        """
        def wrapped_execution():
            try:
                # Mark as running
                self._update_status(job_id, 'running', started_at=datetime.utcnow().isoformat())
                
                # Execute the actual job function
                result = func(*args, **kwargs)
                
                # Mark as completed
                self.complete_job(job_id, result_ref=str(result) if result else None)
                
                return result
                
            except Exception as e:
                # Mark as failed
                self.fail_job(job_id, str(e))
                raise
            finally:
                # Remove from active jobs
                with self.lock:
                    self.active_jobs.pop(job_id, None)
        
        # Submit to executor
        future = self.executor.submit(wrapped_execution)
        
        with self.lock:
            self.active_jobs[job_id] = future
            
        print(f"[JobRunner] Submitted job {job_id} to executor")
        return future
    
    def update_progress(self, job_id: str, progress: float, message: str = None):
        """
        Update job progress.
        
        Args:
            job_id: Job identifier
            progress: Progress percentage (0-100)
            message: Optional progress message
        """
        conn = get_db()
        
        metadata = {}
        if message:
            # Load existing metadata and add message
            row = conn.execute("SELECT metadata_json FROM jobs WHERE id = ?", (job_id,)).fetchone()
            if row and row['metadata_json']:
                metadata = json.loads(row['metadata_json'])
            metadata['last_message'] = message
        
        conn.execute("""
            UPDATE jobs 
            SET progress = ?, updated_at = ?, metadata_json = ?
            WHERE id = ?
        """, (progress, datetime.utcnow().isoformat(), json.dumps(metadata), job_id))
        
        conn.commit()
        conn.close()
        
    def _update_status(self, job_id: str, status: str, **extra_fields):
        """Internal method to update job status and additional fields."""
        conn = get_db()
        
        fields = ['status', 'updated_at']
        values = [status, datetime.utcnow().isoformat()]
        
        for key, value in extra_fields.items():
            fields.append(key)
            values.append(value)
        
        set_clause = ', '.join([f"{field} = ?" for field in fields])
        values.append(job_id)
        
        conn.execute(f"UPDATE jobs SET {set_clause} WHERE id = ?", values)
        conn.commit()
        conn.close()
        
    def complete_job(self, job_id: str, result_ref: str = None):
        """Mark job as completed."""
        conn = get_db()
        conn.execute("""
            UPDATE jobs 
            SET status = 'completed', progress = 100, result_ref = ?, 
                completed_at = ?, updated_at = ?
            WHERE id = ?
        """, (result_ref, datetime.utcnow().isoformat(), datetime.utcnow().isoformat(), job_id))
        conn.commit()
        conn.close()
        
        print(f"[JobRunner] Job {job_id} completed")
    
    def fail_job(self, job_id: str, error_msg: str):
        """Mark job as failed."""
        conn = get_db()
        conn.execute("""
            UPDATE jobs 
            SET status = 'failed', error_msg = ?, 
                completed_at = ?, updated_at = ?
            WHERE id = ?
        """, (error_msg, datetime.utcnow().isoformat(), datetime.utcnow().isoformat(), job_id))
        conn.commit()
        conn.close()
        
        print(f"[JobRunner] Job {job_id} failed: {error_msg}")
    
    def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running job.
        
        Returns:
            True if job was cancelled, False if not running
        """
        with self.lock:
            future = self.active_jobs.get(job_id)
            if future and not future.done():
                future.cancel()
                self._update_status(job_id, 'cancelled')
                self.active_jobs.pop(job_id, None)
                print(f"[JobRunner] Job {job_id} cancelled")
                return True
        return False
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get current job status."""
        conn = get_db()
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        conn.close()
        
        if not row:
            return None
            
        return dict(row)
    
    def list_jobs(self, job_type: str = None, status: str = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """
        List jobs with optional filters.
        
        Args:
            job_type: Filter by job type
            status: Filter by status
            limit: Maximum number of results
            offset: Pagination offset
            
        Returns:
            List of job records
        """
        conn = get_db()
        
        query = "SELECT * FROM jobs WHERE 1=1"
        params = []
        
        if job_type:
            query += " AND type = ?"
            params.append(job_type)
            
        if status:
            query += " AND status = ?"
            params.append(status)
            
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        rows = conn.execute(query, params).fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def delete_job(self, job_id: str) -> bool:
        """
        Delete a job record (only if not running).
        
        Returns:
            True if deleted, False if job is still running
        """
        with self.lock:
            if job_id in self.active_jobs:
                return False
        
        conn = get_db()
        conn.execute("DELETE FROM jobs WHERE id = ? AND status IN ('completed', 'failed', 'cancelled')", (job_id,))
        conn.commit()
        deleted = conn.total_changes > 0
        conn.close()
        
        return deleted
    
    def shutdown(self, wait=True):
        """Shutdown the executor."""
        self.executor.shutdown(wait=wait)
        print("[JobRunner] Executor shutdown")


# Global instance
job_runner = JobRunner(max_workers=4)
