import sys
import os
import json
import sqlite3

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from db import init_db, get_db
from ingestion_engine import IngestionEngine

def run_test():
    print("--- Verifying Stream Ingestion ---")
    
    # 1. Initialize DB
    init_db()
    
    # 2. Create Dummy Large JSON
    dummy_file = "test_stream_dump.json"
    print(f"Generating {dummy_file}...")
    
    # Structure mimicking Instagram export
    data = {
        "messages": []
    }
    
    for i in range(2500):
        data["messages"].append({
            "sender_name": "Stream User",
            "timestamp_ms": 1672531200000 + (i * 1000), # 2023-01-01 + seconds
            "content": f"Streaming message number {i}",
            "title": "Stream Thread"
        })
        
    with open(dummy_file, 'w') as f:
        json.dump(data, f)
        
    # 3. Ingest
    print("Starting Ingestion...")
    engine = IngestionEngine(upload_folder="tests/uploads")
    batch_id = engine.create_batch(dummy_file, source_type="local_file")
    
    # Manually invoke logic to be synchronous for test
    conn = get_db()
    report = None
    
    # We call the internal method or just use the public process logic if we can mock the backgrounder
    # Let's use the internal logic directly for unit testing the parser
    
    # We need to simulate what _process_directory_logic or _process_zip_logic does is cumbersome
    # Let's just create a quick wrapper to call _process_json_stream
    from schemas import IngestionReport
    report = IngestionReport(batch_id=batch_id, start_time="now")
    
    with open(dummy_file, 'rb') as f:
        engine._process_json_stream(f, batch_id, report, conn, filename=dummy_file)
        
    conn.commit()
    conn.close()
    
    # 4. Verify DB
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM messages WHERE thread_id IN (SELECT id FROM threads WHERE title='Stream Thread')").fetchone()[0]
    print(f"Messages Ingested: {count}")
    
    if count == 2500:
        print("SUCCESS: 2500 messages ingested via stream.")
    else:
        print(f"FAIL: Expected 2500 messages, got {count}")
        
    conn.close()
    
    # Cleanup
    if os.path.exists(dummy_file):
        os.remove(dummy_file)

if __name__ == "__main__":
    run_test()
