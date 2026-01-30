import os
import sys
# Add backend to path so imports work
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import time
import zipfile
import hashlib
from ingestion_engine import IngestionEngine
from db import get_db, init_db
from path_manager import path_manager

HTML_TEMPLATE = """
<html><head><title>Participants: Test User</title></head>
<body>
<div class="pam _3-95 _2pi0 _2lej uiBoxWhite noborder">
<div class="_3-96 _2pio _2lek _2lel">{sender}</div>
<div class="_3-95 _2pim _2lek _2lel _2len">
<div class="_3-95 _2let">
<div>
<div>{content}</div>
</div>
</div>
</div>
<div class="_3-94 _2lem">{time_str}</div>
</div>
</body></html>
"""

def create_test_zip(filename, sender="Test User", content="Hello World", time_str="Jan 01, 2024 12:00:00 PM"):
    html = HTML_TEMPLATE.format(sender=sender, content=content, time_str=time_str)
    with zipfile.ZipFile(filename, 'w') as z:
        z.writestr("messages/inbox/test_thread/message_1.html", html)
        z.writestr("messages/inbox/test_thread/photos/beach.jpg", b"fake_image_bytes")

def main():
    print("--- Starting Ingestion v2 Verification ---")
    
    # Setup
    init_db()
    engine = IngestionEngine()
    
    # 1. Valid Case
    print("\n[Test 1] Valid Ingestion...")
    # Add 'flight' to test auto-tagging + Unique timestamp
    unique_sig = f"flight_{int(time.time())}"
    content_str = f"Valid Payload {unique_sig}"
    
    create_test_zip("test_valid.zip", content=content_str)
    try:
        batch_id = engine.create_batch("test_valid.zip")
        # Direct call to logic (bypassing job runner for sync test)
        engine._process_zip_logic(batch_id, "test_valid.zip")
    except Exception as e:
        print(f"❌ Ingestion Crashed: {e}")
        return 1
    
    # Check Verification
    with get_db() as conn:
        # Check for content and tag
        try:
            msg = conn.execute("SELECT * FROM messages WHERE content_text=?", (content_str,)).fetchone()
            if msg:
                tags = msg['tags'] if 'tags' in msg.keys() else "[]"
                print(f"✅ Message found in DB. Tags: {tags}")
                if "travel" in tags:
                    print("✅ Smart Tagging Verified.")
                else:
                    print("❌ Smart Tagging Failed.")
            else:
                print("❌ Message NOT found in DB.")
                print("DEBUG: Dumping all messages in DB:")
                rows = conn.execute("SELECT content_text, tags FROM messages").fetchall()
                for r in rows:
                    print(f" - Content: '{r['content_text']}' | Tags: {r['tags']}")
        except Exception as e:
            print(f"❌ DB Check Failed: {e}")
            return 1
            
        # Check Media Extraction
        # Ingestion v2 hashes content. b"fake_image_bytes" -> hash
        expected_hash = hashlib.sha256(b"fake_image_bytes").hexdigest()
        expected_path = os.path.join(path_manager.media_path, f"{expected_hash}.jpg")
        
        if os.path.exists(expected_path):
            print(f"✅ Media Extraction Verified ({expected_hash}.jpg found).")
        else:
            print(f"❌ Media Extraction Failed ({expected_path} missing).")
            return 1
        
    # 2. Duplicate Case
    print("\n[Test 2] Idempotency (Duplicate Import)...")
    # Re-use the SAME zip file (same hash)
    batch_id_2 = engine.create_batch("test_valid.zip")
    engine._process_zip_logic(batch_id_2, "test_valid.zip")
    
    # Check Report (Should show skipped)
    # We can check DB count (should still be 1 for this content)
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM messages WHERE content_text=?", (content_str,)).fetchone()[0]
        if count == 1:
            print(f"✅ Idempotency success. Count is {count}.")
        else:
            print(f"❌ Idempotency failed. Count is {count}.")
            return 1
        
    # 3. Malformed Case (DLQ)
    print("\n[Test 3] Malformed Data (DLQ)...")
    # Invalid timestamp format should be caught by our parser returning 0.0, 
    # then Pydantic validation failing on 0.0.
    
    create_test_zip("test_malformed.zip", time_str="Actually Invalid Time", content="Bad Data")
    batch_id_3 = engine.create_batch("test_malformed.zip")
    engine._process_zip_logic(batch_id_3, "test_malformed.zip")
    
    # Check DLQ File
    dlq_path = path_manager.dlq_file
    if os.path.exists(dlq_path):
        found = False
        with open(dlq_path, "r") as f:
            for line in f:
                if "Bad Data" in line and "validation error" in line.lower():
                    found = True
        
        if found:
            print("✅ DLQ entry found with Validation Error.")
        else:
            print("❌ DLQ entry not found or mismatch.")
            # debug
            with open(dlq_path, "r") as f:
                lines = f.readlines()
                if lines:
                    print(f"Last line: {lines[-1]}")
                else:
                    print("DLQ file is empty.")
            return 1
    else:
        print(f"❌ DLQ file not created at {dlq_path}.")
        return 1

    print("\n--- Verification Complete ---")
    return 0

if __name__ == "__main__":
    sys.exit(main())

