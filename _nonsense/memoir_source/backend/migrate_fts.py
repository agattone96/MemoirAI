import sqlite3
import sys
import os

# Ensure we can import from parent/current dir
sys.path.append(os.path.dirname(__file__))

from path_manager import path_manager
from db import SCHEMA_SQL

def migrate():
    db_path = path_manager.database_path
    print(f"Migrating database at: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Apply Schema (create FTS table if not exists)
    # Note: executescript handles multiple statements and ignores CREATE IF NOT EXISTS correctly.
    print("Applying schema updates...")
    cursor.executescript(SCHEMA_SQL)
    
    # 2. Check if re-index is needed (if FTS is empty but messages are not)
    msg_count = cursor.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
    fts_count = cursor.execute("SELECT COUNT(*) FROM messages_fts").fetchone()[0]
    
    print(f"Messages: {msg_count}, FTS Index: {fts_count}")
    
    if msg_count > 0 and fts_count == 0:
        print("Backfilling FTS index...")
        cursor.execute("""
            INSERT INTO messages_fts(id, content_text, sender_name, tags)
            SELECT id, content_text, sender_name, tags FROM messages
        """)
        print(f"Backfilled {cursor.rowcount} rows.")
    elif msg_count != fts_count:
        print("Warning: Counts mismatch. Consider full reindex.")
    else:
        print("Index appears up to date.")
        
    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
