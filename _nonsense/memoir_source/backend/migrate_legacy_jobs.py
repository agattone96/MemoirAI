#!/usr/bin/env python3
"""
Migration script to consolidate ingestion_jobs and forensics_runs into unified jobs table.
Preserves historical data while enabling new unified job system.

Usage:
    python migrate_legacy_jobs.py [--dry-run] [--db-path /path/to/memoir.db]
"""

import sqlite3
import json
import argparse
from datetime import datetime

def migrate_ingestion_jobs(conn, dry_run=False):
    """Migrate ingestion_jobs to jobs table."""
    cursor = conn.cursor()
    
    # Get all ingestion jobs
    legacy_jobs = cursor.execute("""
        SELECT id, status, progress, started_at, completed_at, error_msg, metadata_json
        FROM ingestion_jobs
    """).fetchall()
    
    print(f"Found {len(legacy_jobs)} ingestion jobs to migrate")
    
    if dry_run:
        print("[DRY RUN] Would migrate:")
        for job in legacy_jobs[:5]:  # Show first 5
            print(f"  - {job[0]} ({job[1]}, {job[2]}%)")
        if len(legacy_jobs) > 5:
            print(f"  ... and {len(legacy_jobs) - 5} more")
        return len(legacy_jobs)
    
    migrated = 0
    for job in legacy_jobs:
        job_id, status, progress, started_at, completed_at, error_msg, metadata_json = job
        
        # Check if already migrated
        existing = cursor.execute("SELECT id FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if existing:
            print(f"  Skipping {job_id} (already exists)")
            continue
        
        # Insert into jobs table
        cursor.execute("""
            INSERT INTO jobs (
                id, type, status, progress, 
                created_at, started_at, completed_at,
                error_msg, metadata_json,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            job_id,
            'ingestion',
            status or 'pending',
            progress or 0,
            started_at or datetime.utcnow().isoformat(),
            started_at,
            completed_at,
            error_msg,
            metadata_json,
            completed_at or started_at or datetime.utcnow().isoformat()
        ))
        migrated += 1
    
    conn.commit()
    print(f"✓ Migrated {migrated} ingestion jobs")
    return migrated

def migrate_forensics_runs(conn, dry_run=False):
    """Migrate forensics_runs to jobs table."""
    cursor = conn.cursor()
    
    # Get all forensics runs
    legacy_runs = cursor.execute("""
        SELECT id, person_id, transcript_id, status, variables_json, 
               report_path, appendix_path, error_msg, created_at, completed_at
        FROM forensics_runs
    """).fetchall()
    
    print(f"Found {len(legacy_runs)} forensics runs to migrate")
    
    if dry_run:
        print("[DRY RUN] Would migrate:")
        for run in legacy_runs[:5]:
            print(f"  - {run[0]} ({run[3]})")
        if len(legacy_runs) > 5:
            print(f"  ... and {len(legacy_runs) - 5} more")
        return len(legacy_runs)
    
    migrated = 0
    for run in legacy_runs:
        (run_id, person_id, transcript_id, status, variables_json,
         report_path, appendix_path, error_msg, created_at, completed_at) = run
        
        # Check if already migrated
        existing = cursor.execute("SELECT id FROM jobs WHERE id = ?", (run_id,)).fetchone()
        if existing:
            print(f"  Skipping {run_id} (already exists)")
            continue
        
        # Build payload from forensics-specific fields
        payload = {
            'run_id': run_id,
            'person_id': person_id,
            'transcript_id': transcript_id
        }
        
        # Build metadata
        metadata = {}
        if report_path:
            metadata['report_path'] = report_path
        if appendix_path:
            metadata['appendix_path'] = appendix_path
        
        # Determine progress based on status
        progress = 0
        if status == 'completed':
            progress = 100
        elif status == 'running':
            progress = 50
        elif status == 'failed':
            progress = 0
        
        # Insert into jobs table
        cursor.execute("""
            INSERT INTO jobs (
                id, type, status, progress,
                payload_json, metadata_json,
                result_ref, error_msg,
                created_at, started_at, completed_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            run_id,
            'forensics',
            status or 'pending',
            progress,
            json.dumps(payload),
            json.dumps(metadata),
            report_path,
            error_msg,
            created_at or datetime.utcnow().isoformat(),
            created_at,
            completed_at,
            completed_at or created_at or datetime.utcnow().isoformat()
        ))
        migrated += 1
    
    conn.commit()
    print(f"✓ Migrated {migrated} forensics runs")
    return migrated

def verify_migration(conn):
    """Verify migration success."""
    cursor = conn.cursor()
    
    # Count jobs by type
    ingestion_count = cursor.execute("SELECT COUNT(*) FROM jobs WHERE type = 'ingestion'").fetchone()[0]
    forensics_count = cursor.execute("SELECT COUNT(*) FROM jobs WHERE type = 'forensics'").fetchone()[0]
    total_jobs = cursor.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    
    print("\n=== Migration Verification ===")
    print(f"Total jobs in unified table: {total_jobs}")
    print(f"  - Ingestion jobs: {ingestion_count}")
    print(f"  - Forensics jobs: {forensics_count}")
    
    # Verify indexes exist
    indexes = cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name='jobs'
    """).fetchall()
    
    print(f"\nIndexes on jobs table: {len(indexes)}")
    for idx in indexes:
        print(f"  - {idx[0]}")
    
    return total_jobs > 0

def main():
    parser = argparse.ArgumentParser(description='Migrate legacy job tables to unified jobs table')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be migrated without making changes')
    parser.add_argument('--db-path', default='Vault/memoir.db', help='Path to SQLite database')
    
    args = parser.parse_args()
    
    print(f"{'='*60}")
    print(f"Job Table Migration Script")
    print(f"Database: {args.db_path}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE MIGRATION'}")
    print(f"{'='*60}\n")
    
    try:
        conn = sqlite3.connect(args.db_path)
        conn.row_factory = sqlite3.Row
        
        # Verify jobs table exists
        cursor = conn.cursor()
        table_check = cursor.execute("""
            SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'
        """).fetchone()
        
        if not table_check:
            print("ERROR: 'jobs' table does not exist. Run database initialization first.")
            return 1
        
        # Migrate ingestion jobs
        print("\n[1/2] Migrating ingestion_jobs...")
        ing_count = migrate_ingestion_jobs(conn, args.dry_run)
        
        # Migrate forensics runs
        print("\n[2/2] Migrating forensics_runs...")
        for_count = migrate_forensics_runs(conn, args.dry_run)
        
        if not args.dry_run:
            # Verify migration
            if verify_migration(conn):
                print("\n✓ Migration completed successfully!")
                print(f"\nIMPORTANT: Legacy tables (ingestion_jobs, forensics_runs) are still intact.")
                print(f"After verifying the migration, you can manually drop them if desired:")
                print(f"  DROP TABLE ingestion_jobs;")
                print(f"  DROP TABLE forensics_runs;")
            else:
                print("\n✗ Migration verification failed")
                return 1
        else:
            print(f"\n[DRY RUN] Would migrate {ing_count + for_count} total jobs")
            print("Run without --dry-run to perform actual migration")
        
        conn.close()
        return 0
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    exit(main())
