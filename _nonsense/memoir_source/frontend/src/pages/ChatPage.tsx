import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Mic } from 'lucide-react';
import * as ReactWindow from 'react-window';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const List = (ReactWindow as any).VariableSizeList;

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface SpeechRecognitionResult {
    [index: number]: { transcript: string };
    transcript: string;
}

interface SpeechRecognitionEvent {
    results: {
        [index: number]: SpeechRecognitionResult;
        length: number;
        [Symbol.iterator](): Iterator<SpeechRecognitionResult>;
    };
}

const MessageItem = ({ index, style, data }: { index: number; style: React.CSSProperties; data: { messages: Message[]; isThinking: boolean } }) => {
    const m = data.messages[index];
    const isUser = m.role === 'user';
    return (
        <div style={style} className="px-4 lg:px-8 py-3">
            <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm text-sm lg:text-base leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                    {m.content}
                    {!isUser && index === data.messages.length - 1 && data.isThinking && m.content.length === 0 && (
                        <span className="animate-pulse">...</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const ChatPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listRef = useRef<any>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    const scrollToBottom = () => {
        if (listRef.current && messages.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (listRef.current as any).scrollToItem(messages.length - 1, 'end');
        }
    };

    useEffect(() => {
        scrollToBottom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        try {
            // Prepare history (excluding last message which is the current input, handled by backend usually?)
            // Actually API expects history + current message separate or combined.
            // My API: history (list), message (string).

            const history = messages; // current state before this send

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: history,
                    message: userMsg.content
                })
            });

            if (!response.ok) throw new Error('Failed to start chat');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader');

            // Add placeholder for assistant
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr === '[DONE]') break;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.chunk) {
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    const last = newMsgs[newMsgs.length - 1];
                                    last.content += data.chunk;
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            console.error("Parse Error", e);
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble thinking about that." }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 relative">
            {/* Header */}
            <div className="h-16 px-8 flex items-center border-b border-slate-200 bg-white shadow-sm z-10 shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-500 mr-2" />
                <h1 className="font-semibold text-slate-800">Chat with Memories</h1>
                <div className="ml-auto text-xs text-slate-400">GPT-4 Turbo</div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 min-h-0 relative">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <Bot className="w-16 h-16 mb-4" />
                        <p className="text-lg font-medium">Ask me anything about your past.</p>
                        <p className="text-sm">"What did I do in Paris?" • "Who is Sarah?"</p>
                    </div>
                ) : (
                    <div className="absolute inset-0">
                        <List
                            height={800} // Placeholder, ideally should be dynamic via ResizeObserver or similar
                            width="100%"
                            itemCount={messages.length}
                            itemSize={(index: number) => {
                                const m = messages[index];
                                const lines = m.content.split('\n').length;
                                return Math.max(80, 60 + lines * 24); // Heuristic height calculation
                            }}
                            itemData={{ messages, isThinking }}
                            ref={listRef}
                        >
                            {MessageItem}
                        </List>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 border-t border-slate-200 shrink-0">
                <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-inner">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask a question about your life..."
                        className="w-full bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 resize-none max-h-32 py-3 px-2"
                        rows={1}
                    />
                    <button
                        onClick={() => {
                            // Check browser support
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                            if (!SpeechRecognition) {
                                alert("Voice input not supported in this browser.");
                                return;
                            }

                            if (isListening) {
                                recognitionRef.current?.stop();
                                setIsListening(false);
                            } else {
                                const recognition = new SpeechRecognition();
                                recognition.lang = 'en-US';
                                recognition.continuous = false;
                                recognition.interimResults = true;

                                recognition.onstart = () => setIsListening(true);
                                recognition.onend = () => setIsListening(false);
                                recognition.onresult = (event: SpeechRecognitionEvent) => {

                                    const transcript = Array.from(event.results)
                                        .map((result) => result[0])
                                        .map((result) => result.transcript)
                                        .join('');
                                    setInput(transcript);
                                };

                                recognitionRef.current = recognition;
                                recognition.start();
                            }
                        }}
                        className={`p-2 rounded-xl transition-colors mb-1 mr-1 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        title="Voice Input"
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking}
                        className="p-2 bg-indigo-600 rounded-xl text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors mb-1"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-center mt-2 text-[10px] text-slate-400">
                    AI can make mistakes. Check important info.
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
