import sqlite3
import json
import os
from datetime import datetime
from db import DB_PATH

class DashboardEngine:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path

    def _get_conn(self):
        return sqlite3.connect(self.db_path)

    def get_summary(self):
        """
        Aggregates all dashboard data into a single payload.
        """
        kpis = self.get_kpis()
        has_data = kpis['messages'] > 0
        
        return {
            "system": {
                "ingestStatus": "idle", # Placeholder for real pipeline status
                "indexStatus": "ready" if has_data else "not_started",
                "lastIngestAt": self._get_last_ingest_time()
            },
            "kpis": kpis,
            "nextAction": self.determine_next_action(kpis),
            "drafts": self.get_recent_drafts(limit=3),
            "suggestedMoments": self.get_suggested_moments(limit=3),
            "activity": self.get_recent_activity(limit=5)
        }

    def get_kpis(self):
        conn = self._get_conn()
        cursor = conn.cursor()
        
        try:
            # Count Messages
            cursor.execute("SELECT COUNT(*) FROM messages")
            msg_count = cursor.fetchone()[0]
            
            # Count Threads
            cursor.execute("SELECT COUNT(*) FROM threads")
            thread_count = cursor.fetchone()[0]
            
            # Count People (Entities)
            cursor.execute("SELECT COUNT(*) FROM entities")
            entity_count = cursor.fetchone()[0]
            
            # Count Drafts
            cursor.execute("SELECT COUNT(*) FROM drafts")
            draft_count = cursor.fetchone()[0]
            
            return {
                "conversations": thread_count,
                "messages": msg_count,
                "people": entity_count,
                "media": 0, # Placeholder until media table exists
                "drafts": draft_count
            }
        except Exception as e:
            print(f"Error fetching KPIs: {e}")
            return {"conversations": 0, "messages": 0, "people": 0, "media": 0, "drafts": 0}
        finally:
            conn.close()

    def determine_next_action(self, kpis):
        """
        Logic tree for Suggested Next Action.
        """
        if kpis['messages'] == 0:
            return {
                "title": "Welcome to Memoir",
                "description": "Import an archive to unlock timeline clustering and drafting.",
                "primaryCta": { "label": "Import Facebook Export", "href": "/search" }, # Using /search as import entry for now
                "secondaryCtas": []
            }
        
        if kpis['drafts'] == 0:
            return {
                "title": "Start Your First Draft",
                "description": f"You have {kpis['messages']:,} messages indexed. Pick a suggested moment or start fresh.",
                "primaryCta": { "label": "Start New Draft", "href": "/drafting" },
                "secondaryCtas": [ { "label": "Open Timeline", "href": "/timeline" } ]
            }
            
        return {
            "title": "Continue Writing",
            "description": "Resume your latest draft or explore new timeline clusters.",
            "primaryCta": { "label": "Continue Drafting", "href": "/drafting" },
            "secondaryCtas": [ { "label": "Review People", "href": "/entities" } ]
        }

    def get_recent_drafts(self, limit=3):
        conn = self._get_conn()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT id, title, updated_at, status FROM drafts ORDER BY updated_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception:
            return []
        finally:
            conn.close()

    def get_recent_activity(self, limit=5):
        conn = self._get_conn()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT event_type, description, timestamp FROM activity_log ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception:
            return []
        finally:
            conn.close()

    def get_suggested_moments(self, limit=3):
        # MVP: Mock suggestions until RAG analysis is fully connected
        return [
            {
                "id": "mock_01",
                "title": "Winter 2022 Activity Spike",
                "confidence": "High",
                "tags": ["Activity", "Cluster"]
            }
        ]

    def _get_last_ingest_time(self):
        conn = self._get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT completed_at FROM import_batches WHERE status='completed' ORDER BY completed_at DESC LIMIT 1")
            row = cursor.fetchone()
            return row[0] if row else None
        except:
            return None
        finally:
            conn.close()

    def log_activity(self, event_type, description):
        """
        Helper to log system events.
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        try:
            import uuid
            log_id = str(uuid.uuid4())
            cursor.execute("INSERT INTO activity_log (id, event_type, description) VALUES (?, ?, ?)", 
                           (log_id, event_type, description))
            conn.commit()
        except Exception as e:
            print(f"Failed to log activity: {e}")
        finally:
            conn.close()
