import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Upload, FileText, Clock, Users, MessageSquare, Image as ImageIcon } from 'lucide-react';
import type { DashboardSummary } from '../types';

import { KpiCard } from '../features/dashboard/KpiCard';
import emptyState from '../assets/images/empty-state.png';

// Interfaces matching backend payload from DashboardEngine
// Interface moved to ../types.ts

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [onThisDay, setOnThisDay] = useState<{ id: string; date: string; content: string; sender: string; tags: string[] }[]>([]);

    useEffect(() => {
        Promise.all([
            axios.get('/api/dashboard/summary').then(res => setData(res.data)),
            axios.get('/api/dashboard/on_this_day').then(res => setOnThisDay(res.data))
        ])
            .catch(err => console.error("Failed to fetch dashboard data", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-12 text-slate-400">Loading Command Center...</div>;
    if (!data) return <div className="p-12 text-red-500">Failed to load dashboard. check server.</div>;

    const { kpis, nextAction, drafts, suggestedMoments, activity, system } = data;
    const hasData = kpis.messages > 0;

    if (!hasData) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50">
                <div className="text-center max-w-lg">
                    <img src={emptyState} alt="Welcome" className="w-64 h-64 mx-auto mb-8 opacity-90 drop-shadow-xl" />
                    <h1 className="text-3xl font-bold text-slate-800 mb-4">Welcome to Memoir.ai</h1>
                    <p className="text-slate-600 mb-8 text-lg">
                        Your memory bank is currently empty. Import your digital archives to start building your autobiography.
                    </p>
                    <button
                        onClick={() => navigate('/settings')} // Or re-trigger onboarding? Settings is safer for now.
                        className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-2 mx-auto"
                    >
                        <Upload className="w-5 h-5" /> Import Data
                    </button>
                    <p className="mt-4 text-sm text-slate-400">
                        Supports Facebook JSON and Instagram Zip exports.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="px-12 pt-10 pb-14 bg-slate-50 min-h-full">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-10">
                <h1 className="text-4xl font-semibold text-slate-900">Dashboard</h1>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 relative">
                        <Search className="absolute left-4 text-slate-400 w-5 h-5" />
                        <input
                            className="h-12 w-[320px] lg:w-[420px] rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="Search memories..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') navigate(`/search?q=${(e.target as HTMLInputElement).value}`);
                            }}
                        />
                    </div>

                    <button
                        onClick={() => navigate('/settings')}
                        className="h-12 px-5 rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Upload className="w-5 h-5" />
                        Import Archive
                    </button>
                </div>
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Row 1: Next Action (col-span-8) */}
                <div className="col-span-12 lg:col-span-8 p-8 rounded-2xl border border-slate-200 shadow-sm bg-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <h2 className="text-xl font-semibold text-slate-800">{nextAction.title}</h2>
                        <p className="mt-3 text-slate-600 max-w-lg text-lg">{nextAction.description}</p>

                        <div className="mt-8 flex items-center gap-3">
                            <button
                                onClick={() => navigate(nextAction.primaryCta.href)}
                                className="h-11 px-6 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                {nextAction.primaryCta.label}
                            </button>
                            {nextAction.secondaryCtas.map((cta, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => navigate(cta.href)}
                                    className="h-11 px-6 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    {cta.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-700" />
                </div>

                {/* Row 1: KPI Stats (col-span-4) */}
                <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
                    <KpiCard icon={MessageSquare} label="Messages" value={kpis.messages.toLocaleString()} sub={hasData ? "Indexed" : "No data"} />
                    <KpiCard icon={Clock} label="Threads" value={kpis.conversations.toLocaleString()} sub={hasData ? "Conversations" : "No data"} />
                    <KpiCard icon={Users} label="People" value={kpis.people.toLocaleString()} sub="Identified" />
                    <KpiCard icon={ImageIcon} label="Media" value={kpis.media.toLocaleString()} sub="Pending" />
                </div>

                {/* Row 2: Continue Writing (col-span-7) */}
                <div className="col-span-12 lg:col-span-7 p-6 rounded-2xl border border-slate-200 shadow-sm bg-white min-h-[300px]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-slate-800">Continue writing</h2>
                        <button onClick={() => navigate('/drafting')} className="text-indigo-600 text-sm font-semibold hover:underline">View all</button>
                    </div>

                    <div className="space-y-3">
                        {drafts.length > 0 ? (
                            drafts.map(draft => (
                                <div key={draft.id} onClick={() => navigate(`/drafting?draft=${draft.id}`)} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-white cursor-pointer transition-all group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700">{draft.title || "Untitled Draft"}</h3>
                                            <p className="text-sm text-slate-500 mt-1">Status: {draft.status}</p>
                                        </div>
                                        <span className="bg-white px-2 py-1 rounded text-xs font-medium text-slate-500 border border-slate-200">Open</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <img src={emptyState} alt="No drafts" className="w-24 h-24 mb-3 opacity-75 grayscale" />
                                <p className="text-slate-500 text-sm font-medium">No drafts started yet.</p>
                                <p className="text-xs text-slate-400 mt-1">Start writing your first memory!</p>
                            </div>
                        )}
                    </div>

                    <button onClick={() => navigate('/drafting')} className="mt-6 w-full h-11 rounded-xl border border-dashed border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4" /> Start a New Draft
                    </button>
                </div>

                {/* Row 2: Suggested Moments (col-span-5) */}
                <div className="col-span-12 lg:col-span-5 p-6 rounded-2xl border border-slate-200 shadow-sm bg-white min-h-[300px]">
                    <h2 className="text-xl font-semibold text-slate-800 mb-6">Suggested moments</h2>

                    <div className="space-y-3">
                        {suggestedMoments.length > 0 ? (
                            suggestedMoments.map(moment => (
                                <div key={moment.id} className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 hover:shadow-sm cursor-pointer transition-all">
                                    <h3 className="font-medium text-indigo-900">{moment.title}</h3>
                                    <div className="flex gap-2 mb-2 mt-1">
                                        {moment.tags.map(t => (
                                            <span key={t} className="text-[10px] uppercase tracking-wide text-indigo-500 font-bold">{t}</span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-200 hover:border-indigo-400 font-medium transition-colors">Draft This</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <p className="text-slate-500 mb-2">Detailed suggestions appear after import.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 3: Memory Lane (On This Day) - New Feature */}
                {onThisDay.length > 0 && (
                    <div className="col-span-12 lg:col-span-12 p-6 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
                        <h2 className="text-xl font-semibold text-amber-900 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5" /> Memory Lane <span className="text-sm font-normal text-amber-700 opacity-75">(On this day)</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {onThisDay.map(memory => (
                                <div key={memory.id} className="p-4 bg-white rounded-xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="text-xs text-amber-600 font-bold mb-2 uppercase tracking-wide">
                                        {new Date(memory.date).getFullYear()}
                                    </div>
                                    <p className="text-slate-700 text-sm line-clamp-3 mb-3">"{memory.content}"</p>
                                    <div className="text-xs text-slate-400 flex justify-between items-center">
                                        <span>{memory.sender}</span>
                                        {memory.tags.length > 0 && (
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">{memory.tags[0]}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Row 4: Recent Activity (col-span-12) */}
                <div className="col-span-12 p-6 rounded-2xl border border-slate-200 shadow-sm bg-white">
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">Recent activity</h2>
                    <div className="space-y-2">
                        {activity.length > 0 ? (
                            activity.map((act, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 text-slate-600 border-b border-slate-50 last:border-0">
                                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                    <span>{act.description}</span>
                                    <span className="text-slate-400 text-sm ml-auto">{new Date(act.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-slate-400 italic">No recent activity logged.</div>
                        )}
                    </div>
                </div>

                {/* System Status Banner (col-span-12) */}
                <div className="col-span-12 rounded-2xl border border-dashed border-slate-300 p-4 text-center text-slate-500 bg-slate-50/50 text-sm flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${system.indexStatus === 'ready' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                    System Status: {system.ingestStatus} | Index: {system.indexStatus}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
