import uuid
from datetime import datetime
import json
import sqlite3

class EventEngine:
    def __init__(self, db_path):
        self.db_path = db_path

    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def autodetect_events(self):
        conn = self._get_db()
        cursor = conn.cursor()
        
        # Heuristic:
        # 1. Get all messages sorted by time
        # 2. Iterate: If Gap > 4 hours, break cluster
        # 3. If cluster size > 15, save as Event
        
        print("Fetching messages for event detection...")
        rows = cursor.execute("SELECT timestamp_utc FROM messages WHERE timestamp_utc > 0 ORDER BY timestamp_utc").fetchall()
        
        events_found = 0
        current_cluster_start = 0
        current_cluster_count = 0
        last_time = 0
        GAP_THRESHOLD = 4 * 60 * 60 # 4 hours
        SIZE_THRESHOLD = 20
        
        if rows:
            current_cluster_start = rows[0][0]
            last_time = rows[0][0]
            current_cluster_count = 1
            
        for r in rows[1:]:
            t = r[0]
            if (t - last_time) > GAP_THRESHOLD:
                # Check previous cluster
                if current_cluster_count >= SIZE_THRESHOLD:
                    # Save Event
                    evt_id = f"EVT_{uuid.uuid4().hex[:8]}"
                    # Format Date for Title: "Jan 15, 2026"
                    try:
                        dt = datetime.fromtimestamp(current_cluster_start)
                        title = f"Conversation on {dt.strftime('%b %d, %Y')}"
                        start_s = dt.isoformat()
                        end_s = datetime.fromtimestamp(last_time).isoformat()
                        
                        cursor.execute(
                            "INSERT INTO events (id, title, start_date, end_date) VALUES (?, ?, ?, ?)",
                            (evt_id, title, start_s, end_s)
                        )
                        events_found += 1
                    except Exception as e:
                        print(f"Error creating event: {e}")
                
                # Reset
                current_cluster_start = t
                current_cluster_count = 1
            else:
                current_cluster_count += 1
                
            last_time = t
            
        # Check final cluster
        if current_cluster_count >= SIZE_THRESHOLD:
             evt_id = f"EVT_{uuid.uuid4().hex[:8]}"
             dt = datetime.fromtimestamp(current_cluster_start)
             title = f"Conversation on {dt.strftime('%b %d, %Y')}"
             start_s = dt.isoformat()
             end_s = datetime.fromtimestamp(last_time).isoformat()
             cursor.execute(
                "INSERT INTO events (id, title, start_date, end_date) VALUES (?, ?, ?, ?)",
                (evt_id, title, start_s, end_s)
             )
             events_found += 1
        conn.commit()
        conn.close()
        return events_found

    def list_events(self):
        conn = self._get_db()
        rows = conn.execute("SELECT * FROM events ORDER BY start_date DESC").fetchall()
        events = [dict(r) for r in rows]
        conn.close()
        return events

    def get_event_messages(self, event_id):
        conn = self._get_db()
        
        # 1. Get Event Details
        evt = conn.execute("SELECT * FROM events WHERE id=?", (event_id,)).fetchone()
        if not evt: 
            conn.close()
            return None
            
        # 2. Get Messages in Time Range
        query = """
            SELECT m.sender_name, m.timestamp_utc, m.content_text, e.name as entity_name, e.color
            FROM messages m
            LEFT JOIN entities e ON m.sender_entity_id = e.id
            WHERE 
                datetime(m.timestamp_utc, 'unixepoch') >= ? 
                AND datetime(m.timestamp_utc, 'unixepoch') <= ?
            ORDER BY m.timestamp_utc ASC
            LIMIT 500
        """
        
        start_t = evt['start_date'].replace('T', ' ')
        end_t = evt['end_date'].replace('T', ' ')
        
        rows = conn.execute(query, (start_t, end_t)).fetchall()
        conn.close()
        
        # Format for UI
        msgs = []
        for r in rows:
            msgs.append({
                'sender': r['entity_name'] or r['sender_name'],
                'time': datetime.fromtimestamp(r['timestamp_utc']).strftime('%I:%M %p'),
                'text': r['content_text'],
                'color': r['color'] or '#ccc'
            })
            
        return {'event': dict(evt), 'messages': msgs}
