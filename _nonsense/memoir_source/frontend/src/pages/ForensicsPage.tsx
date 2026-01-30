import React, { useState } from 'react';
import { Shield, Brain, CheckCircle2, ArrowLeft } from 'lucide-react';
import { ForensicsWizard } from '../features/forensics/ForensicsWizard';
import { ForensicsResults } from '../features/forensics/ForensicsResults';

const ForensicsPage: React.FC = () => {
    const [showWizard, setShowWizard] = useState(false);
    const [completedRunId, setCompletedRunId] = useState<string | null>(null);
    const [viewingRunId, setViewingRunId] = useState<string | null>(null);

    const handleWizardComplete = (runId: string) => {
        setCompletedRunId(runId);
        setShowWizard(false);
        setViewingRunId(runId);
    };

    // If viewing a specific run, show results
    if (viewingRunId) {
        return (
            <div>
                <button
                    onClick={() => setViewingRunId(null)}
                    className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
                >
                    <ArrowLeft size={20} />
                    Back to Forensics
                </button>
                <ForensicsResults runId={viewingRunId} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Shield size={24} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Conversation Forensics</h1>
                </div>
                <p className="text-gray-500 text-lg">Deep analytical dive into your interpersonal dynamics. Verbatim LLM execution following canonical templates.</p>
            </header>

            {completedRunId && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <CheckCircle2 className="text-green-600" size={20} />
                    <span className="text-green-800">Analysis complete! Run ID: {completedRunId}</span>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center py-20">
                <Brain className="w-16 h-16 text-indigo-200 mx-auto mb-6" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Initialize Forensics Wizard</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Select a person from your Vault to start a forensic analysis of your conversations with them.
                </p>
                <button
                    onClick={() => setShowWizard(true)}
                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
                >
                    Start New Analysis
                </button>
            </div>

            {showWizard && (
                <ForensicsWizard
                    onClose={() => setShowWizard(false)}
                    onComplete={handleWizardComplete}
                />
            )}
        </div>
    );
};

export default ForensicsPage;
