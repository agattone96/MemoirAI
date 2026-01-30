import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Pause, Trash2, XOctagon } from 'lucide-react';
import { api } from '../lib/axios';
import { JobMonitor } from '../components/JobMonitor';

interface Job {
    id: string;
    type: string;
    status: string;
    progress: number;
    created_at: string;
    completed_at?: string;
    error_msg?: string;
}

const JobHistoryPage: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [filter, setFilter] = useState<string>('all');
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchJobs = React.useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { limit: 100 };
            if (filter !== 'all') params.status = filter;

            const res = await api.get('/jobs', { params });
            setJobs(res.data);
        } catch (err) {
            console.error('Failed to fetch jobs:', err);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const deleteJob = async (jobId: string) => {
        try {
            await api.delete(`/jobs/${jobId}`);
            fetchJobs();
        } catch (err) {
            console.error('Failed to delete job:', err);
        }
    };

    const cancelJob = async (jobId: string) => {
        try {
            await api.post(`/jobs/${jobId}/cancel`);
            fetchJobs();
        } catch (err) {
            console.error('Failed to cancel job:', err);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="text-green-600" size={20} />;
            case 'failed': return <XCircle className="text-red-600" size={20} />;
            case 'running': return <div className="w-5 h-5 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />;
            case 'cancelled': return <Pause className="text-gray-600" size={20} />;
            default: return <Clock className="text-gray-400" size={20} />;
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Job History</h1>
                <p className="text-gray-600">View and manage all background jobs</p>
            </header>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {['all', 'running', 'completed', 'failed', 'cancelled'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Job List */}
            {loading ? (
                <div className="text-center py-20 text-gray-500">Loading jobs...</div>
            ) : jobs.length === 0 ? (
                <div className="text-center py-20 text-gray-500">No jobs found</div>
            ) : (
                <div className="space-y-3">
                    {jobs.map(job => (
                        <div
                            key={job.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    {getStatusIcon(job.status)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-semibold capitalize">{job.type}</span>
                                            <span className="text-xs text-gray-500">ID: {job.id}</span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Created: {new Date(job.created_at).toLocaleString()}
                                            {job.completed_at && ` • Completed: ${new Date(job.completed_at).toLocaleString()}`}
                                        </div>
                                        {job.error_msg && (
                                            <div className="mt-2 text-sm text-red-600">
                                                Error: {job.error_msg}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-gray-700">
                                            {job.progress.toFixed(0)}%
                                        </div>
                                        <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                                            <div
                                                className="bg-blue-600 h-1.5 rounded-full"
                                                style={{ width: `${job.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    {job.status === 'running' ? (
                                        <>
                                            <button
                                                onClick={() => setSelectedJob(job.id)}
                                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => cancelJob(job.id)}
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                                title="Cancel job"
                                            >
                                                <XOctagon size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => deleteJob(job.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Delete job"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Job Details Modal */}
            {selectedJob && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <JobMonitor jobId={selectedJob} onClose={() => setSelectedJob(null)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobHistoryPage;
