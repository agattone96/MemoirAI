import React from 'react';

interface KpiCardProps {
    label: string;
    value: string | number;
    sub: string;
    icon: React.ElementType;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, icon: Icon }) => (
    <div className="p-6 rounded-2xl border border-slate-200 shadow-sm bg-white flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
            <span className="text-slate-500 font-medium text-sm uppercase tracking-wider">{label}</span>
            <Icon className="text-slate-400 w-5 h-5" />
        </div>
        <div>
            <div className="text-3xl font-bold text-slate-800 mt-2">{value}</div>
            <div className="text-xs text-slate-400 mt-1">{sub}</div>
        </div>
    </div>
);
