import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { api } from '../lib/axios';
import { Plus, GripVertical, Map, Calendar, Loader2 } from 'lucide-react';

interface Event {
    id: string;
    title: string;
    start_date: string;
    description: string;
    emoji?: string;
}

interface Arc {
    id: string;
    title: string;
    events: Event[];
}

function EventCard({ event, isOverlay = false }: { event: Event, isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: event.id,
        data: event
    });

    if (isDragging && !isOverlay) {
        return <div ref={setNodeRef} className="h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300" />;
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group ${isOverlay ? 'shadow-xl rotate-2 scale-105' : ''}`}
        >
            <div className="flex items-start gap-2">
                <div className="mt-1 text-gray-400 group-hover:text-indigo-500 transition-colors">
                    <GripVertical size={14} />
                </div>
                <div>
                    <h4 className="font-semibold text-gray-800 text-sm line-clamp-2">{event.title || "Untitled Event"}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Calendar size={10} />
                        {event.start_date || "Unknown Date"}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ArcColumn({ arc, children }: { arc: Arc, children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id: arc.id
    });

    return (
        <div ref={setNodeRef} className={`w-80 shrink-0 flex flex-col bg-gray-50 rounded-xl border transition-colors max-h-full ${isOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}`}>
            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl">
                <h3 className="font-bold text-gray-700">{arc.title}</h3>
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500">{arc.events.length}</span>
            </div>
            <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[100px]">
                {children}
                {arc.events.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg">
                        Drag events here
                    </div>
                )}
            </div>
        </div>
    );
}

const ArcsPage: React.FC = () => {
    const [arcs, setArcs] = useState<Arc[]>([]);
    const [unassignedEvents, setUnassignedEvents] = useState<Event[]>([]);
    const [activeEvent, setActiveEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [newArcTitle, setNewArcTitle] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [arcsRes, eventsRes] = await Promise.all([
                api.get('/api/arcs'),
                api.get('/api/events') // Assume this returns all events
            ]);

            const allEvents: Event[] = eventsRes.data;
            const loadedArcs: Arc[] = arcsRes.data;

            // Filter unassigned
            const assignedIds = new Set<string>();
            loadedArcs.forEach(a => a.events.forEach(e => assignedIds.add(e.id)));

            const unassigned = allEvents.filter(e => !assignedIds.has(e.id));

            setArcs(loadedArcs);
            setUnassignedEvents(unassigned);
        } catch {
            console.error("Failed to load arcs");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateArc = async () => {
        if (!newArcTitle.trim()) return;
        try {
            await api.post('/api/arcs', { title: newArcTitle });
            setNewArcTitle('');
            loadData(); // Reload to get id
        } catch {
            alert("Failed to create arc");
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveEvent(event.active.data.current as Event);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveEvent(null);

        if (!over) return;

        const eventId = active.id as string;
        const targetArcId = over.id as string; // 'unassigned' or arc_id

        // Optimistic Update? Too complex for 1:N relations check.
        // Let's just call API and reload for safety, but we can do simple move.

        const targetIdForApi = targetArcId === 'unassigned' ? null : targetArcId;

        // Optimistic UI
        // Remove from source
        const sourceArc = arcs.find(a => a.events.some(e => e.id === eventId));
        const eventObj = active.data.current as Event;

        if (sourceArc) {
            setArcs(prev => prev.map(a => a.id === sourceArc.id ? { ...a, events: a.events.filter(e => e.id !== eventId) } : a));
        } else {
            setUnassignedEvents(prev => prev.filter(e => e.id !== eventId));
        }

        // Add to target
        if (targetIdForApi) {
            setArcs(prev => prev.map(a => a.id === targetIdForApi ? { ...a, events: [...a.events, eventObj] } : a));
        } else {
            setUnassignedEvents(prev => [eventObj, ...prev]);
        }

        try {
            await api.post('/api/arcs/assign', {
                event_id: eventId,
                arc_id: targetIdForApi
            });
        } catch (e) {
            console.error("Assign failed", e);
            loadData(); // Revert
        }
    };

    const { setNodeRef: setUnassignedRef, isOver: isOverUnassigned } = useDroppable({ id: 'unassigned' });

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
                {/* Header */}
                <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Map className="w-5 h-5 text-indigo-600" />
                        <h1 className="font-bold text-lg">Narrative Board</h1>
                    </div>
                    <div className="flex gap-2">
                        <input
                            placeholder="New Arc Title..."
                            value={newArcTitle}
                            onChange={e => setNewArcTitle(e.target.value)}
                            className="bg-gray-100 border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 w-48"
                            onKeyDown={e => e.key === 'Enter' && handleCreateArc()}
                        />
                        <button onClick={handleCreateArc} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Board */}
                <div className="flex-1 flex overflow-x-auto p-6 gap-6 items-start">

                    {/* Unassigned Sidebar */}
                    <div
                        ref={setUnassignedRef}
                        className={`w-72 shrink-0 flex flex-col bg-slate-200/50 rounded-xl border border-dashed border-slate-300 max-h-full ${isOverUnassigned ? 'bg-slate-200 border-slate-400' : ''}`}
                    >
                        <div className="p-3 border-b border-slate-200/50 flex justify-between items-center bg-slate-100 rounded-t-xl">
                            <h3 className="font-bold text-slate-600 text-sm uppercase tracking-wide">Unassigned Events</h3>
                            <span className="text-xs font-mono text-slate-400">{unassignedEvents.length}</span>
                        </div>
                        <div className="p-3 flex-1 overflow-y-auto space-y-2 min-h-[100px]">
                            {unassignedEvents.map(e => (
                                <EventCard key={e.id} event={e} />
                            ))}
                        </div>
                    </div>

                    {/* Arcs Columns */}
                    {arcs.map(arc => (
                        <ArcColumn key={arc.id} arc={arc}>
                            {arc.events.map(e => (
                                <EventCard key={e.id} event={e} />
                            ))}
                        </ArcColumn>
                    ))}

                    {arcs.length === 0 && (
                        <div className="flex items-center justify-center p-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl opacity-50">
                            Create your first Arc to start organizing
                        </div>
                    )}
                </div>
            </div>

            <DragOverlay>
                {activeEvent ? <EventCard event={activeEvent} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
};

export default ArcsPage;
