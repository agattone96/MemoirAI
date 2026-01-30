
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { FileText } from 'lucide-react';
import type { Message } from '../../types';

function DraggableMessage({ message }: { message: Message }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: message.id,
        data: message,
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-3 mb-2 bg-white border border-gray-200 rounded shadow-sm cursor-grab hover:shadow-md active:cursor-grabbing">
            <div className="text-xs text-gray-500 mb-1">{message.sender_name}</div>
            <div className="text-sm text-gray-800 line-clamp-3">{message.content_text}</div>
        </div>
    );
}

interface EvidenceBinProps {
    messages: Message[];
}

export function EvidenceBin({ messages }: EvidenceBinProps) {
    return (
        <div className="w-80 bg-slate-50 flex flex-col border-r border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Evidence Bin
                </h3>
                <p className="text-xs text-gray-400 mt-1">Found {messages.length} relevant clips</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 content-start space-y-2">
                {messages.map(m => (
                    <DraggableMessage key={m.id} message={m} />
                ))}
            </div>
        </div>
    );
}
