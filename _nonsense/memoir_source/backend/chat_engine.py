from rag_engine import get_rag_engine
from ai_engine import AIEngine
import json

class ChatEngine:
    def __init__(self):
        self.rag = get_rag_engine()
        self.ai = AIEngine()
        
    def chat_stream(self, history, current_query):
        """
        Streams a response to the current_query, using history for context 
        and RAG for grounding.
        
        history: List of {'role': 'user'|'assistant', 'content': '...'}
        current_query: str
        """
        
        # 1. Retrieve Context (RAG)
        context_str = ""
        if self.rag:
            # We search based on the current query. 
            # Advanced: Summarize history + query? For now, just query.
            # Using hybrid search to get best of vector + keyword
            try:
                results = self.rag.query_hybrid(current_query, n_results=5)
                # Format context
                snippets = []
                for r in results:
                    meta = r.get('metadata', {})
                    sender = meta.get('sender', 'Unknown')
                    date = meta.get('timestamp', 'Unknown Date')
                    # format timestamp if it's a number
                    try:
                        import datetime
                        if isinstance(date, (int, float)):
                            date = datetime.datetime.fromtimestamp(date).strftime('%Y-%m-%d')
                    except:
                        pass
                        
                    snippets.append(f"[{date}] {sender}: {r['text']}")
                
                context_str = "\n\n".join(snippets)
            except Exception as e:
                print(f"Chat RAG Error: {e}")
                
        # 2. Construct System Prompt
        system_prompt = f"""You are MemoirAI, a personal biographer assistant.
You have access to the user's digital memories (chat logs, photos, etc).
Answer the user's question based on the provided CONTEXT.

CONTEXT FROM MEMORIES:
{context_str}

INSTRUCTIONS:
- If the answer is in the context, cite it naturally (e.g., "According to a chat with Mom in 2012...").
- If the answer is NOT in the context, admit it. Do not hallucinate.
- Be empathetic and thoughtful. You are helping them write their autobiography.
- Keep answers concise unless asked for a long explanation.
"""

        # 3. Assemble Messages
        # Filter history to last N messages to save tokens? 
        # For now, trust the client to send reasonable history or truncate in AIEngine logic (which we don't strictly have for generic chat yet)
        # Let's take last 10 messages.
        truncated_history = history[-10:]
        
        messages = [
            {"role": "system", "content": system_prompt}
        ] + truncated_history + [
            {"role": "user", "content": current_query}
        ]
        
        # 4. Stream Response
        # Using the generic chat stream I added to AIEngine
        return self.ai.chat_completion_stream(messages)
