"""
SearchEngine - Handles all search operations including semantic search, message queries, and thread management.
"""
from db import get_db
from rag_engine import get_rag_engine
from datetime import datetime
import json


class SearchEngine:
    def __init__(self):
        pass

    def semantic_search(self, query, filters=None):
        """
        Perform hybrid semantic search using RAG engine.
        
        Args:
            query (str): Search query
            filters (dict): Optional filters with start_date, end_date
            
        Returns:
            list: Search results from RAG engine
        """
        if not query or not query.strip():
            return []
            
        rag = get_rag_engine()
        if not rag:
            raise RuntimeError('RAG Engine not initialized')
        
        filter_dict = {}
        if filters:
            if 'start_date' in filters:
                try:
                    filter_dict['start_date'] = float(filters['start_date'])
                except:
                    pass
            if 'end_date' in filters:
                try:
                    filter_dict['end_date'] = float(filters['end_date'])
                except:
                    pass
                    
        conn = get_db()
        try:
            results = rag.query_hybrid(query, conn, filters=filter_dict)
            return results
        finally:
            conn.close()

    def list_messages(self, thread_id=None, limit=50, offset=0, last_id=None):
        """
        List messages with optional filtering and pagination.
        
        Args:
            thread_id (str): Optional thread ID filter
            limit (int): Maximum number of results
            offset (int): Offset for pagination
            last_id (str): Optional last message ID for keyset pagination
            
        Returns:
            list: List of message dictionaries
        """
        conn = get_db()
        try:
            query = """
                SELECT m.id, m.thread_id, m.sender_name, m.timestamp_utc, m.content_text, m.tags,
                       e.name as entity_name, e.color as entity_color
                FROM messages m
                LEFT JOIN entities e ON m.sender_entity_id = e.id
                WHERE 1=1
            """
            params = []
            
            if thread_id:
                query += " AND m.thread_id = ?"
                params.append(thread_id)
                
            if last_id:
                # Keyset pagination
                query += " AND (m.timestamp_utc, m.id) < (SELECT timestamp_utc, id FROM messages WHERE id = ?)"
                params.append(last_id)
                query += " ORDER BY m.timestamp_utc DESC, m.id DESC"
            else:
                query += " ORDER BY m.timestamp_utc DESC, m.id DESC"
                query += " LIMIT ? OFFSET ?"
                params.extend([limit, offset])
                
            rows = conn.execute(query, params).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def search_messages(self, query_text=None, start_date=None, end_date=None, entity_id=None):
        """
        Search messages with text and/or filters.
        
        Args:
            query_text (str): Text to search for
            start_date (str): Start date in YYYY-MM-DD format
            end_date (str): End date in YYYY-MM-DD format
            entity_id (str): Filter by entity ID
            
        Returns:
            list: Matching messages
        """
        if not query_text and not start_date and not entity_id:
            return []
            
        conn = get_db()
        try:
            sql = """
                SELECT m.id, m.content_text, m.timestamp_utc, m.sender_name, t.title as thread_title,
                       e.name as entity_name, e.color
                FROM messages m
                JOIN threads t ON m.thread_id = t.id
                LEFT JOIN entities e ON m.sender_entity_id = e.id
                WHERE 1=1
            """
            params = []
            
            if query_text:
                sql += " AND m.content_text LIKE ?"
                params.append(f'%{query_text}%')
                
            if entity_id:
                sql += " AND m.sender_entity_id = ?"
                params.append(entity_id)
                
            if start_date:
                try:
                    dt = datetime.strptime(start_date, '%Y-%m-%d')
                    ts = dt.timestamp()
                    sql += " AND m.timestamp_utc >= ?"
                    params.append(ts)
                except:
                    pass
                    
            if end_date:
                try:
                    dt = datetime.strptime(end_date, '%Y-%m-%d')
                    dt = dt.replace(hour=23, minute=59, second=59)
                    ts = dt.timestamp()
                    sql += " AND m.timestamp_utc <= ?"
                    params.append(ts)
                except:
                    pass

            sql += " ORDER BY m.timestamp_utc DESC LIMIT 100"
            
            rows = conn.execute(sql, params).fetchall()
            
            results = []
            for r in rows:
                results.append({
                    'id': r['id'],
                    'text': r['content_text'],
                    'date': datetime.fromtimestamp(r['timestamp_utc']).strftime('%Y-%m-%d %H:%M'),
                    'sender': r['entity_name'] or r['sender_name'],
                    'color': r['color'] or '#374151',
                    'thread': r['thread_title']
                })
                
            return results
        finally:
            conn.close()

    def update_threads(self, thread_ids, action, value):
        """
        Bulk update threads with specified action.
        
        Args:
            thread_ids (list): List of thread IDs to update
            action (str): Action type ('status', 'important', 'note', 'tag_add', 'tag_remove')
            value: Value for the action
            
        Returns:
            dict: Success status
        """
        if not thread_ids or not action:
            raise ValueError('Missing thread_ids or action')
            
        conn = get_db()
        cursor = conn.cursor()
        
        try:
            placeholders = ','.join('?' * len(thread_ids))
            
            if action == 'status':
                sql = f"UPDATE threads SET status = ? WHERE id IN ({placeholders})"
                cursor.execute(sql, [value] + thread_ids)
                
            elif action == 'important':
                sql = f"UPDATE threads SET is_important = ? WHERE id IN ({placeholders})"
                cursor.execute(sql, [1 if value else 0] + thread_ids)
                
            elif action == 'note':
                sql = f"UPDATE threads SET note = ? WHERE id IN ({placeholders})"
                cursor.execute(sql, [value] + thread_ids)
                
            elif action == 'tag_add':
                rows = cursor.execute(f"SELECT id, tags FROM threads WHERE id IN ({placeholders})", thread_ids).fetchall()
                for r in rows:
                    current_tags = set(r['tags'].split(',')) if r['tags'] else set()
                    current_tags.discard('')
                    current_tags.add(value)
                    new_tags = ','.join(sorted(current_tags))
                    cursor.execute("UPDATE threads SET tags = ? WHERE id = ?", (new_tags, r['id']))
                    
            elif action == 'tag_remove':
                rows = cursor.execute(f"SELECT id, tags FROM threads WHERE id IN ({placeholders})", thread_ids).fetchall()
                for r in rows:
                    current_tags = set(r['tags'].split(',')) if r['tags'] else set()
                    current_tags.discard(value)
                    new_tags = ','.join(sorted(current_tags))
                    cursor.execute("UPDATE threads SET tags = ? WHERE id = ?", (new_tags, r['id']))

            conn.commit()
            return {'success': True}
        except Exception as e:
            conn.rollback()
            raise
        finally:
            conn.close()

    def list_threads(self):
        """List all threads with message counts."""
        from db import get_db
        conn = get_db()
        try:
            query = """
            SELECT t.*, COUNT(m.id) as message_count, MAX(m.timestamp_utc) as last_activity
            FROM threads t
            LEFT JOIN messages m ON m.thread_id = t.id
            GROUP BY t.id
            ORDER BY last_activity DESC
            """
            rows = conn.execute(query).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()
