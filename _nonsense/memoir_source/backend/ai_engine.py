from openai import OpenAI
import os
import yaml
import tiktoken
from settings_engine import SettingsEngine

class AIEngine:
    def __init__(self):
        self.settings = SettingsEngine()
        self.client = None
        self._init_client()
        self.prompts_dir = os.path.join(os.path.dirname(__file__), "prompts")
        
        # Tokenizer for GPT-4
        try:
            self.tokenizer = tiktoken.encoding_for_model("gpt-4")
        except:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")

    def _init_client(self):
        api_key = self.settings.get("openai_api_key")
        if api_key:
            try:
                self.client = OpenAI(api_key=api_key)
                print("AIEngine: OpenAI Client Initialized.")
            except Exception as e:
                print(f"AIEngine: Failed to init OpenAI client: {e}")
        else:
             print("AIEngine: No OPENAI_API_KEY found in settings.")
    
    def prepare_draft_context(self, messages, notes):
        """
        Augment message list with RAG-retrieved context if needed.
        
        Args:
            messages (list): Initial message list
            notes (str): User notes for context
            
        Returns:
            list: Augmented message list
        """
        if messages or not notes:
            return messages
            
        from rag_engine import get_rag_engine
        rag = get_rag_engine()
        if not rag:
            return messages
            
        results = rag.query_similar(notes, n_results=5)
        augmented = list(messages) if messages else []
        for r in results:
            meta = r['metadata']
            augmented.append({
                'sender_name': meta.get('sender', 'Unknown'),
                'content_text': r['text']
            })
        return augmented
    
    def get_rewrite_instruction(self, mode):
        """
        Get AI rewrite instruction based on mode.
        
        Args:
            mode (str): Rewrite mode (improve/expand/shorten/tone/fix)
            
        Returns:
            str: Instruction for AI
        """
        instructions = {
            'expand': "Expand on this text, adding more descriptive details.",
            'shorten': "Shorten this text, keeping only the essential meaning.",
            'tone': "Make the tone more reflective and nostalgic.",
            'fix': "Fix any grammar or spelling errors."
        }
        return instructions.get(mode, "Improve the writing.")

    def _load_prompt(self, name):
        try:
            with open(os.path.join(self.prompts_dir, f"{name}.yaml"), "r") as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"Error loading prompt {name}: {e}")
            return None

    def _count_tokens(self, text):
        return len(self.tokenizer.encode(text))

    def _truncate_context(self, context_messages, max_tokens=6000):
        """
        Truncates list of messages to fit within max_tokens.
        Prioritizes recent messages? Or just fits them all?
        For Drafting, all evidence is important, but if too big, we cut from end?
        Actually, we usually want to keep everything if possible.
        Let's simple truncate content_text of huge messages or drop list items.
        """
        current_tokens = 0
        truncated_list = []
        
        # Simple estimation: 
        # Format: "[Sender]: Content"
        
        for msg in context_messages:
            line = f"[{msg.get('sender_name')}]: {msg.get('content_text')}"
            t_count = self._count_tokens(line)
            
            if current_tokens + t_count > max_tokens:
                # Room left?
                remaining = max_tokens - current_tokens
                if remaining > 50:
                    # Partial include
                    cutoff = int(remaining * 3) # rough char est
                    truncated_line = line[:cutoff] + "... (truncated)"
                    truncated_list.append(truncated_line)
                break
            else:
                truncated_list.append(line)
                current_tokens += t_count
                
        return "\n".join(truncated_list)

    def generate_draft(self, context_messages, user_notes="", style="narrative"):
        """
        Generates a narrative draft based on provided messages and notes.
        """
        if not self.client:
            self._init_client()
        if not self.client:
             return "Error: OpenAI API Key not configured. Please go to Settings."

        template = self._load_prompt("drafting")
        if not template:
            return "Error: Prompt template 'drafting' not found."
            
        # Context Management
        # GPT-4 8k limit mainly, but we want to be safe.
        # User Notes are high priority. System prompt is high priority.
        # Evidence is variable.
        
        system_prompt = template['system']
        base_user = template['user'] \
            .replace("{{ style }}", style) \
            .replace("{{ user_notes }}", user_notes) 
            
        sys_tokens = self._count_tokens(system_prompt)
        base_user_tokens = self._count_tokens(base_user)
        
        RESERVE = 1000 # For generation
        AVAILABLE = 8192 - sys_tokens - base_user_tokens - RESERVE
        AVAILABLE = max(AVAILABLE, 2000) # Minimum context
        
        evidence_text = self._truncate_context(context_messages, max_tokens=AVAILABLE)
        
        final_user_prompt = base_user.replace("{{ evidence_text }}", evidence_text)

        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": final_user_prompt}
                ],
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI Generation Error: {e}")
            return f"Error generation draft: {str(e)}"

    def generate_draft_stream(self, context_messages, user_notes="", style="narrative"):
        """
        Generates a narrative draft via SSE stream.
        """
        if not self.client:
            self._init_client()
        if not self.client:
             yield "Error: OpenAI API Key not configured. Please go to Settings."
             return

        template = self._load_prompt("drafting")
        if not template:
            yield "Error: Prompt template 'drafting' not found."
            return
            
        system_prompt = template['system']
        base_user = template['user'] \
            .replace("{{ style }}", style) \
            .replace("{{ user_notes }}", user_notes)
            
        sys_tokens = self._count_tokens(system_prompt)
        base_user_tokens = self._count_tokens(base_user)
        AVAILABLE = 6000 # Safe margin
        
        evidence_text = self._truncate_context(context_messages, max_tokens=AVAILABLE)
        final_user_prompt = base_user.replace("{{ evidence_text }}", evidence_text)

        try:
            stream = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": final_user_prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            print(f"OpenAI Stream Error: {e}")
            yield f"Error generating stream: {str(e)}"

    def chat_completion_stream(self, messages, model="gpt-4"):
        """
        Generic, low-level chat completion stream.
        """
        if not self.client:
            self._init_client()
            if not self.client:
                 yield "Error: OpenAI Client not initialized."
                 return

        try:
            stream = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                stream=True
            )
            for chunk in stream:
                 if chunk.choices[0].delta.content is not None:
                     yield chunk.choices[0].delta.content
        except Exception as e:
            print(f"OpenAI Chat Error: {e}")
            yield f"Error: {str(e)}"

    def rewrite_text(self, text, instruction):
        """
        Rewrites text based on instruction (Magic Edit).
        """
        if not self.client:
            self._init_client()
            
        system = "You are an expert editor. Rewrite the following text according to the user's instruction. Return ONLY the rewritten text."
        
        try:
            res = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": f"Text: \"{text}\"\n\nInstruction: {instruction}"}
                ]
            )
            return res.choices[0].message.content
        except Exception as e:
            return f"Error: {e}"

    def analyze_timeline(self, events):
        # Placeholder for future analysis
        return {"summary": "Timeline analysis not yet implemented via AI."}

    def analyze_image(self, image_path):
        """
        Analyzes an image using GPT-4o Vision.
        Supports local paths and HTTP URLs.
        """
        import base64
        
        if not self.client:
            self._init_client()
            if not self.client:
                return "Error: OpenAI API Key not configured."

        image_payload = {}
        
        if image_path.startswith('http'):
            return "Error: External URLs are not allowed in Local-First mode."
            # image_payload = {"url": image_path}
        else:
            if not os.path.exists(image_path):
                return "Error: Image file not found."
            try:
                with open(image_path, "rb") as image_file:
                    base64_image = base64.b64encode(image_file.read()).decode('utf-8')
                image_payload = {"url": f"data:image/jpeg;base64,{base64_image}"}
            except Exception as e:
                return f"Error reading image: {e}"

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "What is in this image? Provide a concise description suitable for searching."},
                            {
                                "type": "image_url",
                                "image_url": image_payload
                            }
                        ]
                    }
                ],
                max_tokens=300
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error analyzing image: {e}"

