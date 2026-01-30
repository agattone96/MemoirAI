import os
import chromadb
import uuid
# from chromadb.utils import embedding_functions # Might not exist or be different
from sentence_transformers import SentenceTransformer
from path_manager import path_manager

# Configuration
CHROMA_DB_DIR = path_manager.chroma_path
COLLECTION_NAME = "memoir_messages"

class RAGEngine:
    def __init__(self):
        print(f"Initializing RAG Engine at {CHROMA_DB_DIR}...")
        
        # Initialize Embeddings
        self.embed_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Wrapper for Chroma 0.3.x embedding function
        # In 0.3.x, embedding_function was passed to collection, expecting a callable or class with __call__
        class LocalEmbeddingFunction:
            def __init__(self, model):
                self.model = model
            def __call__(self, input):
                # input can be list of strings
                if isinstance(input, str):
                    input = [input]
                embeddings = self.model.encode(input).tolist()
                return embeddings

        self.embedding_fn = LocalEmbeddingFunction(self.embed_model)

        # Initialize Client (Chroma 0.3.x style)
        try:
             # Try 0.4.x+ style first
            self.client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        except AttributeError:
            # Fallback to 0.3.x style
            from chromadb.config import Settings
            self.client = chromadb.Client(Settings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=CHROMA_DB_DIR
            ))
        
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self.embedding_fn
        )
        print(f"RAG Engine ready. Collection '{COLLECTION_NAME}' loaded.")

    def ingest_message(self, message_text, metadata):
        if not message_text or len(message_text.strip()) == 0:
            return
            
        doc_id = metadata.get('id', str(uuid.uuid4()))
        
        # Chroma expects lists
        self.collection.upsert(
            documents=[message_text],
            metadatas=[metadata],
            ids=[doc_id]
        )
        
        # In 0.3.x we might need this, in 0.4.x it's auto
        if hasattr(self.client, 'persist'):
            self.client.persist()

    def query_similar(self, query_text, n_results=5):
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )
        
        flattened = []
        if results['documents'] and results['metadatas']:
            for i in range(min(n_results, len(results['documents'][0]))):
                flattened.append({
                    'id': results['ids'][0][i],
                    'text': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'distance': results['distances'][0][i] if results.get('distances') else 0,
                    'score': 1.0 / (1.0 + (results['distances'][0][i] if results.get('distances') else 0)) # Normalize distance to score
                })
                
        return flattened

    def query_hybrid(self, query_text, sql_conn, n_results=10, filters=None):
        """
        Combines Vector Search (Chroma) with Full-Text Search (SQLite FTS5).
        Uses Reciprocal Rank Fusion (RRF).
        
        Filters support: {
            'entity_id': 'PER_...', (Mapped to sender name currently?)
            'start_date': float_timestamp,
            'end_date': float_timestamp
        }
        """
        # Build Chroma Where Clause
        chroma_where = {}
        if filters:
            conditions = []
            if filters.get('start_date'):
                conditions.append({'timestamp': {'$gte': filters['start_date']}})
            if filters.get('end_date'):
                conditions.append({'timestamp': {'$lte': filters['end_date']}})
                
            if len(conditions) == 1:
                chroma_where.update(conditions[0])
            elif len(conditions) > 1:
                chroma_where['$and'] = conditions
                
        # 1. Vector Search
        # Pass 'where' if we have filters. Note: query_similar helper needs update if we want to delegate.
        # Let's call collection.query directly here for control.
        
        vector_resp = self.collection.query(
            query_texts=[query_text],
            n_results=n_results,
            where=chroma_where if chroma_where else None
        )
        
        vector_results = []
        if vector_resp['documents'] and vector_resp['metadatas']:
            for i in range(min(n_results, len(vector_resp['documents'][0]))):
                vector_results.append({
                    'id': vector_resp['ids'][0][i],
                    'text': vector_resp['documents'][0][i],
                    'metadata': vector_resp['metadatas'][0][i],
                    'distance': vector_resp['distances'][0][i] if vector_resp.get('distances') else 0
                })
        
        # 2. FTS Search
        fts_results = []
        try:
            cursor = sql_conn.execute("""
                SELECT id, content_text, sender_name, tags, timestamp_utc
                FROM messages_fts 
                JOIN messages ON messages.id = messages_fts.id
                WHERE messages_fts MATCH ? 
                ORDER BY rank 
                LIMIT ?
            """, (query_text, n_results * 2)) # Fetch more to allow post-filtering
            
            for row in cursor.fetchall():
                # Python-side filtering for FTS
                ts = row['timestamp_utc']
                if filters:
                    if filters.get('start_date') and ts < filters['start_date']: continue
                    if filters.get('end_date') and ts > filters['end_date']: continue
                
                fts_results.append({
                    'id': row['id'],
                    'text': row['content_text'],
                    'metadata': {'sender': row['sender_name'], 'tags': row['tags']}
                })
        except Exception as e:
            print(f"FTS Error: {e}")

        # 3. Fusion (RRF)
        alpha = 60
        scores = {}
        meta_map = {}
        
        for rank, item in enumerate(vector_results):
            mid = item['id']
            scores[mid] = scores.get(mid, 0) + (1.0 / (alpha + rank + 1))
            meta_map[mid] = item
            
        for rank, item in enumerate(fts_results):
            mid = item['id']
            scores[mid] = scores.get(mid, 0) + (1.0 / (alpha + rank + 1))
            if mid not in meta_map:
                meta_map[mid] = item
                
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        
        final_results = []
        for mid in sorted_ids[:n_results]:
            item = meta_map[mid]
            item['rrf_score'] = scores[mid]
            final_results.append(item)
            
        return final_results

_rag_instance = None

def get_rag_engine():
    global _rag_instance
    if _rag_instance is None:
        try:
            _rag_instance = RAGEngine()
        except Exception as e:
            print(f"Failed to initialize RAG Engine: {e}")
            return None
    return _rag_instance
