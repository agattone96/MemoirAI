import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Shield } from 'lucide-react';
import { api } from '../../lib/axios';

interface ForensicsWizardProps {
    onClose: () => void;
    onComplete?: (runId: string) => void;
}

type WizardStep = 'select_person' | 'upload_transcript' | 'resolve_participants' | 'configure' | 'execute';

interface Entity {
    id: string;
    name: string;
}

export const ForensicsWizard: React.FC<ForensicsWizardProps> = ({ onClose, onComplete }) => {
    const [currentStep, setCurrentStep] = useState<WizardStep>('select_person');

    const [selectedPerson, setSelectedPerson] = useState<Entity | null>(null);
    const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
    const [transcriptPath, setTranscriptPath] = useState('');
    const [participants, setParticipants] = useState<string[]>([]);
    const [participantMap, setParticipantMap] = useState<Record<string, string>>({});
    const [entities, setEntities] = useState<Entity[]>([]);

    const [variables, setVariables] = useState({
        goal: 'Clarity + documentation',
        style: 'Premium',
        evidence_mode: 'Balanced citations',
        module_selection: ''
    });

    const [loading, setLoading] = useState(false);
    const [executionStatus, setExecutionStatus] = useState('');

    useEffect(() => {
        // Load entities/people
        api.get('/entities').then(res => setEntities(res.data)).catch(console.error);
    }, []);

    const handlePersonSelect = (person: Entity) => {
        setSelectedPerson(person);
    };

    const handleTranscriptUpload = async () => {
        if (!transcriptFile) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', transcriptFile);
            await api.post('/import/upload', formData);
            // For now, use the uploaded path
            setTranscriptPath(`/tmp/${transcriptFile.name}`);

            // Scan participants
            const scanRes = await api.get('/forensics/participants', {
                params: { path: `/tmp/${transcriptFile.name}` }
            });
            setParticipants(scanRes.data.labels || []);
            setCurrentStep('resolve_participants');
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleParticipantResolve = () => {
        setCurrentStep('configure');
    };

    const handleExecute = async () => {
        if (!selectedPerson) return;
        setLoading(true);
        try {
            // Create run
            const runRes = await api.post('/forensics/start', {
                person_id: selectedPerson.id,
                transcript_id: null,
                variables: {
                    transcript: transcriptPath,
                    ...variables,
                    participant_map: participantMap
                }
            });

            const newRunId = runRes.data.run_id;
            // setRunId(newRunId); // Removed state

            // Resolve participants
            await api.post('/forensics/resolve', {
                run_id: newRunId,
                mapping: participantMap
            });

            // Start execution
            await api.post('/forensics/run', { run_id: newRunId });
            setCurrentStep('execute');

            // Poll status
            const interval = setInterval(async () => {
                const statusRes = await api.get(`/forensics/status/${newRunId}`);
                setExecutionStatus(statusRes.data.status);

                if (statusRes.data.status === 'completed') {
                    clearInterval(interval);
                    onComplete?.(newRunId);
                } else if (statusRes.data.status === 'failed') {
                    clearInterval(interval);
                }
            }, 3000);

        } catch (err) {
            console.error('Execution failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Shield size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Conversation Forensics</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {currentStep === 'select_person' && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Select Person</h3>
                            <div className="space-y-2">
                                {entities.map(entity => (
                                    <button
                                        key={entity.id}
                                        onClick={() => { handlePersonSelect(entity); setCurrentStep('upload_transcript'); }}
                                        className="w-full p-4 border rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                                    >
                                        <div className="font-medium">{entity.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentStep === 'upload_transcript' && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Upload Transcript</h3>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <input type="file" onChange={e => setTranscriptFile(e.target.files?.[0] || null)} className="mb-4" />
                                <button
                                    onClick={handleTranscriptUpload}
                                    disabled={!transcriptFile || loading}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                                >
                                    {loading ? 'Scanning...' : 'Upload & Scan'}
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 'resolve_participants' && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Match Participants</h3>
                            {participants.map(label => (
                                <div key={label} className="flex items-center gap-4 mb-3">
                                    <div className="flex-1 font-medium">{label}</div>
                                    <select
                                        onChange={e => setParticipantMap({ ...participantMap, [label]: e.target.value })}
                                        className="border rounded-lg px-3 py-2"
                                    >
                                        <option value="">Select Person</option>
                                        {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                            ))}
                            <button onClick={handleParticipantResolve} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg">
                                Continue
                            </button>
                        </div>
                    )}

                    {currentStep === 'configure' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold">Configure Analysis</h3>

                            <div>
                                <label className="block text-sm font-medium mb-2">Goal</label>
                                <input
                                    type="text"
                                    value={variables.goal}
                                    onChange={e => setVariables({ ...variables, goal: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Modules (comma-separated: 1,2,3...)</label>
                                <input
                                    type="text"
                                    value={variables.module_selection}
                                    onChange={e => setVariables({ ...variables, module_selection: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="e.g., 2,4,7,10"
                                />
                            </div>

                            <button onClick={handleExecute} disabled={loading} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold">
                                {loading ? 'Starting...' : 'Execute Analysis'}
                            </button>
                        </div>
                    )}

                    {currentStep === 'execute' && (
                        <div className="text-center py-12">
                            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Analyzing Conversation...</h3>
                            <p className="text-gray-500">Status: {executionStatus}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
