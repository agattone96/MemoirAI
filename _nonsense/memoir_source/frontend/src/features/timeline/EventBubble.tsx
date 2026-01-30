import React from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import classNames from 'classnames';
import type { TimelineEvent } from '../../types';

interface EventBubbleProps {
    event: TimelineEvent;
    zoom: number;
    minDate: Date;
    onClick?: (event: TimelineEvent) => void;
}

export const EventBubble: React.FC<EventBubbleProps> = ({ event, zoom, minDate, onClick }) => {
    const getPosition = (dateStr: string) => {
        const date = parseISO(dateStr);
        const days = differenceInDays(date, minDate);
        return days * zoom;
    };

    const left = getPosition(event.start_date);
    const width = Math.max(zoom, differenceInDays(parseISO(event.end_date), parseISO(event.start_date)) * zoom);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onClick?.(event)}
            className={classNames(
                "absolute top-8 p-3 bg-indigo-500 shadow-lg rounded-lg border border-indigo-400 cursor-pointer hover:shadow-xl hover:bg-indigo-600 transition-colors group"
            )}
            style={{
                left,
                width: width < 150 ? 150 : width, // Min width for readability
            }}
        >
            <h3 className="font-semibold text-white text-sm truncate">{event.title}</h3>
            <p className="text-indigo-100 text-xs mt-1">
                {format(parseISO(event.start_date), 'MMM d, yyyy')}
            </p>
        </motion.div>
    );
};
