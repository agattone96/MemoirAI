import os
from sqlcipher3 import dbapi2 as sqlite3
from datetime import datetime
from path_manager import path_manager

DB_KEY = os.environ.get('MEMOIR_DB_KEY')

DB_PATH = path_manager.database_path

SCHEMA_SQL = """
-- 1. Exports (Source Folders)
CREATE TABLE IF NOT EXISTS exports (
    id TEXT PRIMARY KEY, -- EXP_01
    path TEXT NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Entities (Cast Registry)
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY, -- PER_01
    name TEXT NOT NULL,
    type TEXT DEFAULT 'person',
    is_user BOOLEAN DEFAULT 0,
    color TEXT,
    aliases TEXT, -- JSON list
    notes TEXT,
    latest_forensics_run_id TEXT
);

-- 3. Threads (Canonical Conversations)
CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY, -- THR_01
    title TEXT,
    is_group BOOLEAN DEFAULT 0
);

-- 4. Messages (Canonical Evidence)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, -- MSG_01
    thread_id TEXT,
    sender_entity_id TEXT, -- Link to entities
    sender_name TEXT, -- Keeping raw name for now
    timestamp_utc REAL,
    content_text TEXT,
    content_hash TEXT, -- SHA256 for dedup
    source_export_id TEXT,
    source_file_path TEXT,
    tags TEXT, -- JSON list of tags
    FOREIGN KEY(thread_id) REFERENCES threads(id),
    FOREIGN KEY(sender_entity_id) REFERENCES entities(id),
    FOREIGN KEY(source_export_id) REFERENCES exports(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_messages_thread_timestamp ON messages(thread_id, timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_messages_sender_entity ON messages(sender_entity_id);

-- 5. FTS5 Index for Messages (Hybrid Search Support)
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    id UNINDEXED, 
    content_text,
    sender_name,
    tags
);

-- Triggers to keep FTS synced
CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(id, content_text, sender_name, tags)
  VALUES (new.id, new.content_text, new.sender_name, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
  DELETE FROM messages_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
  UPDATE messages_fts SET 
    content_text = new.content_text,
    sender_name = new.sender_name,
    tags = new.tags
  WHERE id = old.id;
END;

-- 6. Events (Timeline Backbone)
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, -- EVT_2023_01
    title TEXT,
    start_date TEXT,
    end_date TEXT
);

-- 7. Event Evidence Linking
CREATE TABLE IF NOT EXISTS event_evidence (
    event_id TEXT,
    message_id TEXT,
    FOREIGN KEY(event_id) REFERENCES events(id),
    FOREIGN KEY(message_id) REFERENCES messages(id)
);

-- 8. Chapters
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    title TEXT,
    order_index INTEGER,
    content_markdown TEXT
);


-- 9. Scenes
CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    chapter_id TEXT,
    title TEXT,
    event_id TEXT, -- Linked Event
    notes TEXT,
    FOREIGN KEY(chapter_id) REFERENCES chapters(id)
);

-- 10. Ingestion Tracking (Phase 1)
CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY,
    source_type TEXT, -- 'generic_zip', 'facebook', 'instagram'
    status TEXT, -- 'pending', 'processing', 'completed', 'failed'
    file_name TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    report_json TEXT
);

CREATE TABLE IF NOT EXISTS source_artifacts (
    id TEXT PRIMARY KEY,
    batch_id TEXT REFERENCES import_batches(id),
    file_path TEXT, -- relative path inside zip
    raw_hash TEXT, -- SHA256 of content
    status TEXT -- 'parsed', 'skipped', 'error'
);

-- 11. Ingestion Jobs (Background Worker)
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed'
    progress REAL DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_msg TEXT,
    metadata_json TEXT
);

-- 12. Drafts
CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    title TEXT,
    content_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT -- 'draft', 'in_progress', 'completed'
);

-- 13. Draft Evidence Linking
CREATE TABLE IF NOT EXISTS draft_evidence (
    draft_id TEXT,
    message_id TEXT,
    FOREIGN KEY(draft_id) REFERENCES drafts(id),
    FOREIGN KEY(message_id) REFERENCES messages(id)
);

-- 14. Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    event_type TEXT, -- 'ingest', 'draft', 'system'
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata_json TEXT
);

-- 15. Story Arcs (Kanban)
CREATE TABLE IF NOT EXISTS story_arcs (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    order_index INTEGER
);

CREATE TABLE IF NOT EXISTS arc_events (
    arc_id TEXT,
    event_id TEXT,
    FOREIGN KEY(arc_id) REFERENCES story_arcs(id),
    FOREIGN KEY(event_id) REFERENCES events(id)
);

-- 16. Conversation Forensics Runs
CREATE TABLE IF NOT EXISTS forensics_runs (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    transcript_id TEXT, -- Can be thread_id or source_export_id
    status TEXT DEFAULT 'pending', -- pending, running, completed, failed
    variables_json TEXT, -- Serialized Variables Pack
    report_path TEXT, -- Path to 00_reader_report.md
    appendix_path TEXT, -- Path to 01_forensics_appendix.md
    error_msg TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES entities(id)
);

CREATE INDEX IF NOT EXISTS idx_forensics_person ON forensics_runs(person_id);

-- 17. Unified Background Jobs System
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,              -- 'ingestion', 'forensics', 'export', 'analysis'
    status TEXT NOT NULL,             -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    progress REAL DEFAULT 0,          -- 0.0 to 100.0
    payload_json TEXT,                -- Job-specific input data
    result_ref TEXT,                  -- Reference to result (path, ID, URL)
    error_msg TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    metadata_json TEXT                -- Additional job-specific metadata
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);

-- 18. User Authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 19. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 20. Roles (IAM)
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    capabilities_json TEXT NOT NULL
);

-- 21. User Vault Access (RBAC Link)
CREATE TABLE IF NOT EXISTS user_vault_access (
    user_id TEXT NOT NULL,
    vault_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (user_id, vault_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);
"""

def init_db():
    if not DB_KEY:
        raise ValueError("Vault Locked: No Key Provided")
    conn = sqlite3.connect(DB_PATH)
    conn.execute(f"PRAGMA key='{DB_KEY}'")
    cursor = conn.cursor()
    
    # Pre-Schema Migration: Ensure columns exist before creating indices in SCHEMA_SQL
    # Entities Migration
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='entities'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(entities)")
        columns = [row[1] for row in cursor.fetchall()]
        new_cols = {
            'type': "TEXT DEFAULT 'person'",
            'aliases': "TEXT",
            'notes': "TEXT",
            'latest_forensics_run_id': "TEXT"
        }
        for col, definition in new_cols.items():
            if col not in columns:
                print(f"Migrating entities: adding column {col}")
                cursor.execute(f"ALTER TABLE entities ADD COLUMN {col} {definition}")

    # Messages Migration
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(messages)")
        msg_columns = [row[1] for row in cursor.fetchall()]
        msg_new_cols = {
            'sender_entity_id': "TEXT",
            'content_hash': "TEXT",
            'source_export_id': "TEXT",
            'source_file_path': "TEXT",
            'tags': "TEXT"
        }
        for col, definition in msg_new_cols.items():
            if col not in msg_columns:
                print(f"Migrating messages: adding column {col}")
                cursor.execute(f"ALTER TABLE messages ADD COLUMN {col} {definition}")

    # Now run schema (Create tables if not exist, Create indices)
    cursor.executescript(SCHEMA_SQL)

    # Seed Default Roles
    import json
    default_roles = [
        ('owner', 'Owner', 'Full access to everything', ['*']),
        ('co_author', 'Co-Author', 'Collaborator with write access', ['content_write', 'forensics_run', 'share_link', 'data_import']),
        ('contributor', 'Contributor', 'Can submit data and drafts', ['data_import', 'content_write']),
        ('viewer', 'Legacy Viewer', 'Read-only access', ['share_link', 'audit_view']),
        ('auditor', 'Auditor', 'Audit logging access only', ['audit_view']),
        ('bot', 'Service Bot', 'Automated service actions', ['data_import', 'audit_view'])
    ]

    for r_id, r_name, r_desc, caps in default_roles:
        cursor.execute("INSERT OR REPLACE INTO roles (id, name, description, capabilities_json) VALUES (?, ?, ?, ?)",
                      (r_id, r_name, r_desc, json.dumps(caps)))
            
    conn.commit()
    conn.close()
    print(f"Database initialized/updated at {DB_PATH}")

def get_db():
    if not DB_KEY:
        raise ValueError("Vault Locked: No Key Provided")
    conn = sqlite3.connect(DB_PATH)
    conn.execute(f"PRAGMA key='{DB_KEY}'")
    conn.row_factory = sqlite3.Row
    # Enable WAL Mode for concurrency
    conn.execute("PRAGMA journal_mode=WAL;")
    # Normal sync is safe in WAL mode and faster
    conn.execute("PRAGMA synchronous=NORMAL;") 
    return conn

if __name__ == "__main__":
    init_db()

