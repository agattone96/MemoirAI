import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { format, parseISO, differenceInDays, min, max } from 'date-fns';
import type { TimelineEvent } from '../types';
import { EventBubble } from '../features/timeline/EventBubble';

const Timeline: React.FC = () => {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [zoom, setZoom] = useState(20); // pixels per day
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/events')
            .then(res => setEvents(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const { minDate, totalDays } = useMemo(() => {
        if (events.length === 0) return { minDate: new Date(), totalDays: 1 };
        const dates = events.flatMap(e => [parseISO(e.start_date), parseISO(e.end_date)]);
        const minD = min(dates);
        const maxD = max(dates);
        // Add padding
        return {
            minDate: minD,
            totalDays: differenceInDays(maxD, minD) + 30 // Padding
        };
    }, [events]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading timeline...</div>;

    if (events.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Timeline is Empty</h2>
                <p className="text-slate-500">Import your chat history to see your life on a timeline.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm z-10">
                <h2 className="text-xl font-bold text-slate-800">Timeline</h2>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">Zoom</span>
                    <input
                        type="range"
                        min="2"
                        max="100"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-32"
                    />
                </div>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden relative p-8">
                <div
                    className="relative h-full border-t border-gray-300 mt-20"
                    style={{ width: `${Math.max(100, totalDays * zoom)}px` }}
                >
                    {/* Time Axis Markers (Simplified) */}
                    {Array.from({ length: Math.ceil(totalDays / 30) }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute top-0 w-px h-4 bg-gray-400"
                            style={{ left: `${i * 30 * zoom}px` }}
                        >
                            <span className="absolute -top-6 left-1 text-xs text-gray-500 whitespace-nowrap">
                                {format(new Date(minDate.getTime() + i * 30 * 24 * 60 * 60 * 1000), 'MMM yyyy')}
                            </span>
                        </div>
                    ))}

                    {/* Events */}
                    {events.map((event) => (
                        <EventBubble
                            key={event.id}
                            event={event}
                            zoom={zoom}
                            minDate={minDate}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Timeline;
