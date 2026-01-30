import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, FileText, Brain, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../../lib/axios';

interface ForensicsResultsProps {
    runId: string;
}

interface ForensicsRun {
    id: string;
    variables_json?: string;
    completed_at?: string;
    report_path?: string;
    appendix_path?: string;
}

export const ForensicsResults: React.FC<ForensicsResultsProps> = ({ runId }) => {
    const [run, setRun] = useState<ForensicsRun | null>(null);
    const [readerReport, setReaderReport] = useState('');
    const [appendix, setAppendix] = useState('');
    const [showAppendix, setShowAppendix] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadResults = async () => {
            setLoading(true);
            try {
                // Get run metadata
                const runRes = await api.get(`/forensics/status/${runId}`);
                setRun(runRes.data);

                // Load report files via API
                if (runRes.data.report_path) {
                    const reportRes = await api.get(`/forensics/file/${encodeURIComponent(runRes.data.report_path)}`);
                    setReaderReport(reportRes.data);
                }

                if (runRes.data.appendix_path) {
                    const appendixRes = await api.get(`/forensics/file/${encodeURIComponent(runRes.data.appendix_path)}`);
                    setAppendix(appendixRes.data);
                }
            } catch (err) {
                console.error('Failed to load results:', err);
            } finally {
                setLoading(false);
            }
        };

        loadResults();
    }, [runId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-gray-500">Loading results...</div>
            </div>
        );
    }

    if (!run) {
        return (
            <div className="text-center py-20 text-gray-500">
                Results not found
            </div>
        );
    }

    const variables = JSON.parse(run.variables_json || '{}');

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Brain size={24} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Forensics Analysis</h1>
                </div>

                {/* Metadata Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                <Calendar size={16} />
                                <span>Completed</span>
                            </div>
                            <div className="font-medium">
                                {run.completed_at ? new Date(run.completed_at).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                <User size={16} />
                                <span>Goal</span>
                            </div>
                            <div className="font-medium">{variables.goal || 'Clarity'}</div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                <FileText size={16} />
                                <span>Style</span>
                            </div>
                            <div className="font-medium">{variables.style || 'Premium'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reader Report */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
                    Reader Report
                </h2>
                <div className="prose prose-slate max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {readerReport || 'No reader report generated'}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Forensics Appendix (Collapsible) */}
            {appendix && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setShowAppendix(!showAppendix)}
                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                    >
                        <h2 className="text-2xl font-bold text-gray-900">Forensics Appendix</h2>
                        {showAppendix ? (
                            <ChevronUp className="text-gray-400" size={24} />
                        ) : (
                            <ChevronDown className="text-gray-400" size={24} />
                        )}
                    </button>

                    {showAppendix && (
                        <div className="p-8 pt-0 border-t border-gray-100">
                            <div className="prose prose-slate max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {appendix}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
