import uuid
import sqlite3

class EntityEngine:
    def __init__(self, db_path):
        self.db_path = db_path

    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def populate_entities(self):
        conn = self._get_db()
        cursor = conn.cursor()
        
        # Find all unique senders in messages not yet in entities
        rows = cursor.execute("SELECT DISTINCT sender_name FROM messages").fetchall()
        added = 0
        for r in rows:
            name = r['sender_name']
            if not name: continue
            
            # Check existence
            exist = cursor.execute("SELECT id FROM entities WHERE name=?", (name,)).fetchone()
            if not exist:
                ent_id = f"PER_{uuid.uuid4().hex[:8]}"
                cursor.execute("INSERT INTO entities (id, name) VALUES (?, ?)", (ent_id, name))
                added += 1
                
        conn.commit()
        conn.close()
        return added

    def get_entities(self):
        conn = self._get_db()
        # optimized query with count
        query = """
            SELECT e.id, e.name, e.type, e.aliases,
            (SELECT COUNT(*) FROM messages m WHERE m.sender_entity_id = e.id) as msg_count
            FROM entities e
            ORDER BY name ASC
        """
        rows = conn.execute(query).fetchall()
        conn.close()
        entities = []
        for r in rows:
            entities.append({
                'id': r[0],
                'name': r[1],
                'type': r[2],
                'aliases': r[3],
                'msg_count': r[4]
            })
        return entities

    def merge_entities(self, target_id, source_ids):
        conn = self._get_db()
        cursor = conn.cursor()
        
        try:
            placeholders = ','.join('?' * len(source_ids))
            sql = f"UPDATE messages SET sender_entity_id = ? WHERE sender_entity_id IN ({placeholders})"
            cursor.execute(sql, [target_id] + source_ids)
            msg_count = cursor.rowcount
            
            cursor.execute(f"DELETE FROM entities WHERE id IN ({placeholders})", source_ids)
            ent_count = cursor.rowcount
            
            conn.commit()
            return {
                'success': True, 
                'messages_updated': msg_count,
                'entities_merged': ent_count
            }
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
