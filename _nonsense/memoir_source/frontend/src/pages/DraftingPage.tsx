import React, { useState, useEffect, useRef } from 'react';
import { DndContext, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Check, Sparkles, Wand2, ArrowRight } from 'lucide-react';
import type { Message } from '../types';
import { EvidenceBin } from '../features/drafting/EvidenceBin';

// Drops zone wrapper
function DropZone({ children, id }: { children: React.ReactNode, id: string }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`flex-1 flex flex-col relative ${isOver ? 'ring-2 ring-indigo-400 ring-inset' : ''}`}>
            {children}
            {isOver && <div className="absolute inset-0 bg-indigo-50/20 pointer-events-none flex items-center justify-center text-indigo-500 font-bold text-2xl">Drop to Append</div>}
        </div>
    );
}

const Drafting: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const draftIdParam = searchParams.get('draft');

    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [content, setContent] = useState(''); // EDITOR STATE (Single String)
    const [draftNotes, setDraftNotes] = useState(''); // "Instructions for AI"
    const [draftTitle, setDraftTitle] = useState('Untitled Draft');
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftIdParam);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isGenerating, setIsGenerating] = useState(false);

    // Magic Edit State
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 1. Load Draft
    useEffect(() => {
        if (!draftIdParam) {
            // New Draft: Start empty
            setDraftTitle('New Draft');
            setContent('');
            setMessages([]);
            return;
        }

        axios.get(`/api/drafts/${draftIdParam}`)
            .then(res => {
                const d = res.data;
                setDraftTitle(d.title);
                setContent(d.content || '');
                if (d.evidence) setMessages(d.evidence);
                setStatus('idle');
            })
            .catch(console.error);
    }, [draftIdParam]);

    // 2. Handle Drag & Drop
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && over.id === 'draft-editor') {
            const msg = active.data.current as Message;
            if (msg) {
                // Append to end of content
                const toAppend = `\n\n[${msg.sender_name}]: ${msg.content_text}`;
                setContent(prev => prev + toAppend);
                setStatus('idle');
            }
        }
    };

    // 3. Magic Edit (Rewrite Selection)
    const handleMagic = async (mode: 'expand' | 'shorten' | 'tone' | 'fix') => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const fullText = content;

        const selectedText = fullText.substring(start, end);
        if (!selectedText.trim()) {
            alert("Please select some text to edit first.");
            return;
        }

        setIsGenerating(true);
        setStatus('idle');

        try {
            const res = await axios.post('/api/ai/rewrite', {
                text: selectedText,
                mode: mode
            });

            const rewritten = res.data.text;

            // Replace text
            const newText = fullText.substring(0, start) + rewritten + fullText.substring(end);
            setContent(newText);

        } catch (e) {
            console.error("Magic Edit Failed", e);
            alert("Failed to rewrite text.");
        } finally {
            setIsGenerating(false);
        }
    };

    // 4. Auto-Write (Append Streaming)
    const handleAutoWrite = async () => {
        setIsGenerating(true);
        setStatus('idle');
        setContent(prev => prev + "\n\n"); // break

        try {
            const payload = {
                messages: [{ sender_name: 'System', content_text: content }], // Send context
                notes: draftNotes
            };

            const response = await fetch('/api/ai/draft/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.body) throw new Error('No response body');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') break;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.chunk) {
                                setContent(prev => prev + data.chunk);
                            }
                        } catch { /* ignore */ }
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    // 5. Save Draft
    const handleSave = async () => {
        setStatus('saving');
        try {
            const payload = {
                title: draftTitle,
                content: content,
                status: 'in_progress',
                evidence_ids: messages.map(m => m.id)
            };

            if (currentDraftId) {
                await axios.put(`/api/drafts/${currentDraftId}`, payload);
                setStatus('saved');
            } else {
                const res = await axios.post('/api/drafts', payload);
                setCurrentDraftId(res.data.id);
                setStatus('saved');
                navigate(`/drafting?draft=${res.data.id}`, { replace: true });
            }
        } catch {
            setStatus('error');
        }
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="flex h-full overflow-hidden">
                <EvidenceBin messages={messages} />

                <div className="flex-1 flex flex-col h-full bg-white relative">
                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm z-20">
                        <input
                            value={draftTitle}
                            onChange={(e) => { setDraftTitle(e.target.value); setStatus('idle'); }}
                            className="text-xl font-bold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none transition-all px-1"
                        />

                        <div className="flex items-center gap-3">
                            {/* Magic Edit Dropdown */}
                            <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 relative group">
                                <Wand2 className="w-4 h-4 text-indigo-500 ml-2" />
                                <span className="text-xs font-semibold text-indigo-700 cursor-default py-2">Magic Edit</span>

                                {/* Hover Menu */}
                                <div className="absolute top-full right-0 mt-0 pt-2 w-56 hidden group-hover:block z-50">
                                    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-2 flex flex-col gap-1">
                                        <div className="text-[10px] uppercase font-bold text-gray-400 px-2 py-1">Select Text First</div>
                                        <button onClick={() => handleMagic('fix')} className="text-left px-3 py-2 text-sm hover:bg-indigo-50 rounded-lg text-gray-700 flex items-center gap-2">
                                            <Check className="w-3 h-3" /> Fix Grammar
                                        </button>
                                        <button onClick={() => handleMagic('expand')} className="text-left px-3 py-2 text-sm hover:bg-indigo-50 rounded-lg text-gray-700 flex items-center gap-2">
                                            <ArrowRight className="w-3 h-3" /> Make Longer
                                        </button>
                                        <button onClick={() => handleMagic('shorten')} className="text-left px-3 py-2 text-sm hover:bg-indigo-50 rounded-lg text-gray-700 flex items-center gap-2">
                                            <ArrowRight className="w-3 h-3 rotate-180" /> Make Shorter
                                        </button>
                                        <div className="h-px bg-gray-100 my-1" />
                                        <div className="px-2 pb-1">
                                            <input
                                                placeholder="Instructions..."
                                                className="w-full text-xs border-b border-gray-200 focus:border-indigo-500 outline-none pb-1 mb-2"
                                                value={draftNotes}
                                                onChange={e => setDraftNotes(e.target.value)}
                                            />
                                            <button onClick={handleAutoWrite} className="w-full bg-indigo-600 text-white text-xs py-1.5 rounded-md hover:bg-indigo-700 font-medium">
                                                Auto-Complete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={status === 'saving'}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${status === 'saved' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'}`}
                            >
                                {status === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : (status === 'saved' ? 'Saved' : 'Save')}
                            </button>
                        </div>
                    </div>

                    {/* Editor */}
                    <DropZone id="draft-editor">
                        <textarea
                            ref={textareaRef}
                            className="flex-1 w-full p-8 resize-none focus:outline-none text-lg leading-relaxed text-gray-800 font-serif placeholder:text-gray-300"
                            placeholder="Start writing your story here... Drag memories from the left to append them."
                            value={content}
                            onChange={e => { setContent(e.target.value); setStatus('idle'); }}
                        />
                    </DropZone>

                    {isGenerating && (
                        <div className="absolute bottom-6 right-6 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce z-30">
                            <Sparkles className="w-4 h-4" /> AI writing...
                        </div>
                    )}
                </div>
            </div>
        </DndContext>
    );
};

export default Drafting;
