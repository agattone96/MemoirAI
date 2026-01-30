import os
import sqlite3
import shutil
import time
import threading
from datetime import datetime
from path_manager import path_manager

class BackupEngine:
    def __init__(self):
        self.db_path = path_manager.database_path
        # Store backups in user_data_dir/backups
        self.backup_dir = os.path.join(path_manager.base_dir, "backups")
        
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)

    def run_daily_backup(self):
        """
        Runs a backup if one hasn't been created today.
        Keeps last 7 daily backups.
        Safe to run in a background thread.
        """
        today = datetime.now().strftime("%Y-%m-%d")
        backup_filename = f"db_backup_{today}.sqlite"
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        # 1. Check if backup exists
        if os.path.exists(backup_path):
            print(f"[Backup] Backup for {today} already exists.")
            return

        print(f"[Backup] Starting backup for {today}...")
        
        # 2. Perform Backup (VACUUM INTO)
        # SQLite's VACUUM INTO is safe even if DB is in use (esp with WAL)
        try:
            # Connect to source DB
            src = sqlite3.connect(self.db_path)
            src.execute(f"VACUUM INTO '{backup_path}'")
            src.close()
            print(f"[Backup] Success: {backup_path}")
        except Exception as e:
            print(f"[Backup] Failed: {e}")
            return

        # 3. Rotate Old Backups (Keep latest 7)
        self._rotate_backups()

    def _rotate_backups(self):
        try:
            files = [f for f in os.listdir(self.backup_dir) if f.startswith("db_backup_") and f.endswith(".sqlite")]
            # Sort by primitive verification of date in filename or mtime
            # files are "db_backup_YYYY-MM-DD.sqlite", so lexical sort works for YYYY-MM-DD
            files.sort()
            
            # Keep last 7 (latest)
            if len(files) > 7:
                to_delete = files[:-7]
                for f in to_delete:
                    p = os.path.join(self.backup_dir, f)
                    try:
                        os.remove(p)
                        print(f"[Backup] Pruned old backup: {f}")
                    except OSError as e:
                        print(f"[Backup] Error pruning {f}: {e}")
                        
        except Exception as e:
            print(f"[Backup] Rotation error: {e}")

    def start_background_job(self):
        """Starts the backup check in a separate thread so it doesn't block app startup"""
        t = threading.Thread(target=self.run_daily_backup, daemon=True)
        t.start()
