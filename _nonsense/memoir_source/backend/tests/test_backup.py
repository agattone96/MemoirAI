import os
import sys
# Add parent directory to path so we can import 'backup_engine' etc
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
from backup_engine import BackupEngine
from path_manager import path_manager

def verify_backup():
    print("--- Verifying Backup System ---")
    
    # 1. Clean previous backups for test
    backup_dir = os.path.join(path_manager.base_dir, "backups")
    if os.path.exists(backup_dir):
        print(f"Cleaning backup dir: {backup_dir}")
        for f in os.listdir(backup_dir):
            os.remove(os.path.join(backup_dir, f))
    
    engine = BackupEngine()
    
    # 2. Run Backup
    print("Triggering run_daily_backup()...")
    engine.run_daily_backup()
    
    # 3. Assert File Exists
    files = os.listdir(backup_dir)
    print(f"Backups found: {files}")
    
    if len(files) == 1 and files[0].endswith(".sqlite"):
        print("✅ Backup created successfully.")
    else:
        print("❌ Backup failed or not found.")
        exit(1)
        
    # 4. Test Rotation (Simulate many backups)
    print("Testing Rotation (creating dummy files)...")
    for i in range(10):
        fname = f"db_backup_2020-01-{i:02d}.sqlite"
        with open(os.path.join(backup_dir, fname), 'w') as f:
            f.write("dummy")
            
    files_before = len(os.listdir(backup_dir))
    print(f"Files before rotation: {files_before}")
    
    engine._rotate_backups()
    
    files_after = len(os.listdir(backup_dir))
    print(f"Files after rotation: {files_after}")
    
    # Should be 7
    if files_after == 7:
        print("✅ Rotation verified (7 files kept).")
    else:
        print(f"❌ Rotation failed. Expected 7, got {files_after}")
        exit(1)

if __name__ == "__main__":
    verify_backup()
