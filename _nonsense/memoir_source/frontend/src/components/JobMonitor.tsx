import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, XCircle, Clock, Pause } from 'lucide-react';
import { api } from '../lib/axios';

interface Job {
    id: string;
    type: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    created_at: string;
    error_msg?: string;
    metadata_json?: string;
}

interface JobMonitorProps {
    jobId: string;
    onClose?: () => void;
    compact?: boolean;
}

export const JobMonitor: React.FC<JobMonitorProps> = ({ jobId, onClose, compact = false }) => {
    const [job, setJob] = useState<Job | null>(null);
    const [useSSE, setUseSSE] = useState(true);

    useEffect(() => {
        if (useSSE) {
            // Try SSE first
            const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setJob(data);

                    // Close SSE when job is done
                    if (['completed', 'failed', 'cancelled'].includes(data.status)) {
                        eventSource.close();
                    }
                } catch (err) {
                    console.error('SSE parse error:', err);
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                setUseSSE(false); // Fall back to polling
            };

            return () => eventSource.close();
        } else {
            // Fallback: Polling
            const interval = setInterval(async () => {
                try {
                    const res = await api.get(`/jobs/${jobId}`);
                    setJob(res.data);

                    if (['completed', 'failed', 'cancelled'].includes(res.data.status)) {
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error('Failed to fetch job status:', err);
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [jobId, useSSE]);

    if (!job) {
        return (
            <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm">Loading job status...</span>
            </div>
        );
    }

    const getStatusIcon = () => {
        switch (job.status) {
            case 'completed':
                return <CheckCircle2 className="text-green-600" size={20} />;
            case 'failed':
                return <XCircle className="text-red-600" size={20} />;
            case 'running':
                return <Loader2 className="text-blue-600 animate-spin" size={20} />;
            case 'cancelled':
                return <Pause className="text-gray-600" size={20} />;
            default:
                return <Clock className="text-gray-400" size={20} />;
        }
    };

    const getStatusColor = () => {
        switch (job.status) {
            case 'completed': return 'bg-green-50 border-green-200';
            case 'failed': return 'bg-red-50 border-red-200';
            case 'running': return 'bg-blue-50 border-blue-200';
            case 'cancelled': return 'bg-gray-50 border-gray-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const getMessage = () => {
        try {
            const metadata = job.metadata_json ? JSON.parse(job.metadata_json) : {};
            return metadata.last_message || job.status;
        } catch {
            return job.status;
        }
    };

    if (compact) {
        return (
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusColor()}`}>
                {getStatusIcon()}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium capitalize">{job.type}</span>
                        <span className="text-xs text-gray-500">{job.progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                        />
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 hover:bg-white rounded">
                        <X size={16} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={`rounded-xl border p-6 ${getStatusColor()}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {getStatusIcon()}
                    <div>
                        <h3 className="text-lg font-semibold capitalize">{job.type} Job</h3>
                        <p className="text-sm text-gray-600">ID: {job.id}</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-lg">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-gray-600">{job.progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                        />
                    </div>
                </div>

                <div className="text-sm text-gray-700">
                    <strong>Status:</strong> {getMessage()}
                </div>

                {job.error_msg && (
                    <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-sm text-red-800">
                        <strong>Error:</strong> {job.error_msg}
                    </div>
                )}

                <div className="text-xs text-gray-500">
                    Started: {new Date(job.created_at).toLocaleString()}
                </div>
            </div>
        </div>
    );
};

// Global job status indicator for navbar/header
export const JobStatusBadge: React.FC = () => {
    const [activeJobs, setActiveJobs] = useState<Job[]>([]);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const fetchActiveJobs = async () => {
            try {
                const res = await api.get('/jobs', { params: { status: 'running', limit: 10 } });
                setActiveJobs(res.data);
            } catch (err) {
                console.error('Failed to fetch active jobs:', err);
            }
        };

        fetchActiveJobs();
        const interval = setInterval(fetchActiveJobs, 2000);
        return () => clearInterval(interval);
    }, []);

    if (activeJobs.length === 0) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm font-medium">{activeJobs.length} Active Job{activeJobs.length > 1 ? 's' : ''}</span>
            </button>

            {showDetails && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 max-h-96 overflow-y-auto">
                    <h3 className="text-sm font-semibold mb-3">Active Jobs</h3>
                    <div className="space-y-2">
                        {activeJobs.map(job => (
                            <JobMonitor key={job.id} jobId={job.id} compact />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
