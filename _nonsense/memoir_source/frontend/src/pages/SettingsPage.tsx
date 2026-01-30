import React, { useEffect, useState } from 'react';
import { api } from '../lib/axios';
import { Save, Key, AlertTriangle, UploadCloud } from 'lucide-react';
import { ImportWidget } from '../components/ImportWidget';

interface SettingsData {
    openai_api_key?: string;
    [key: string]: unknown;
}

interface IngestionError {
    timestamp: string;
    error: string;
    raw_data?: unknown;
}

const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<SettingsData>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        api.get('/settings')
            .then(res => setSettings(res.data))
            .catch(err => console.error("Failed to load settings", err))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.post('/settings', settings);
            setMessage({ type: 'success', text: 'Settings saved successfully.' });
        } catch {
            // Toast handled by interceptor, but we still catch to update local state logic if needed
            // setMessage({ type: 'error', text: 'Failed to save settings.' }); 
            // Actually, let's keep the local message if we want inline feedback too, or remove it.
            // For now, let's leave generic error message here as fallback/duplication.
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-gray-400">Loading settings...</div>;

    return (
        <div className="max-w-3xl mx-auto py-10">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Settings</h1>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                    <Key className="text-indigo-500 w-5 h-5" />
                    <div>
                        <h2 className="font-semibold text-gray-800">API Configuration</h2>
                        <p className="text-xs text-gray-500">Manage external service credentials</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">OpenAI API Key</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={settings.openai_api_key || ''}
                                onChange={e => setSettings({ ...settings, openai_api_key: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
                                placeholder="sk-..."
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            Stored locally in your secure application data folder.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-sm">
                        {message && (
                            <span className={message.type === 'success' ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                {message.text}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>


                {/* Import Data Section */}
                <div className="p-6 border-t border-gray-100 bg-white">
                    <div className="flex items-center gap-3 mb-6">
                        <UploadCloud className="text-indigo-500 w-5 h-5" />
                        <div>
                            <h2 className="font-semibold text-gray-800">Import Data</h2>
                            <p className="text-xs text-gray-500">Add more archives to your timeline</p>
                        </div>
                    </div>
                    <ImportWidget showSkip={false} />
                </div>

                {/* System Maintenance Section */}
                <SystemMaintenanceSection />

                {/* DLQ / Data Issues */}
                <DataIssuesSection />

                {/* Danger Zone */}
                <DangerZoneSection />
            </div>


        </div >
    );
};

function SystemMaintenanceSection() {
    const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    const [msg, setMsg] = useState('');

    const handleReindex = async () => {
        if (!confirm("This will rebuild the search index. It might take a few moments. Continue?")) return;
        setStatus('running');
        try {
            const res = await api.post('/system/reindex');
            setStatus('done');
            setMsg(`Indexed ${res.data.count} items.`);
        } catch {
            setStatus('error');
            setMsg('Failed to reindex.');
        }
    };

    return (
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
                <h2 className="font-semibold text-gray-800 text-sm">System Maintenance</h2>
                <p className="text-xs text-gray-500">Manage search indexes and database optimization</p>
                {msg && <p className={`text-xs mt-1 ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
            </div>
            <button
                onClick={handleReindex}
                disabled={status === 'running'}
                className="px-4 py-2 bg-white border border-gray-300 shadow-sm rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
                {status === 'running' ? 'Rebuilding...' : 'Rebuild Search Index'}
            </button>
        </div>
    );
}

function DangerZoneSection() {
    const [resetting, setResetting] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleReset = async () => {
        const confirmed = confirm("WARNING: This will delete ALL data (Memories, Drafts, Settings). This action cannot be undone.\n\nAre you sure?");
        if (!confirmed) return;

        const doubleConfirmed = confirm("Final Confirmation: Delete everything?");
        if (!doubleConfirmed) return;

        setResetting(true);
        try {
            await api.post('/settings/reset');
            alert("System reset complete. Reloading...");
            window.location.reload();
        } catch {
            alert("Failed to reset system.");
        } finally {
            setResetting(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            // Trigger download via window.location for GET endpoint with file attachment
            // Or fetch blob. Simpler to just open new tab or location href.
            window.location.href = `${api.defaults.baseURL || ''}/settings/export`;
        } catch {
            alert("Failed to initiate export.");
        } finally {
            setTimeout(() => setExporting(false), 2000);
        }
    };

    return (
        <div className="p-6 border-t border-gray-100 bg-red-50/30 flex flex-col gap-4">
            <div>
                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Danger Zone
                </h2>
                <p className="text-xs text-gray-500">Irreversible actions for data management</p>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="px-4 py-2 bg-white border border-gray-300 shadow-sm rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                >
                    {exporting ? 'Zipping...' : 'Export All Data'}
                </button>

                <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 shadow-sm rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                >
                    {resetting ? 'Resetting...' : 'Factory Reset'}
                </button>
            </div>
        </div>
    );
}

// ... (existing DataIssuesSection)

function DataIssuesSection() {
    const [errors, setErrors] = useState<IngestionError[]>([]);

    useEffect(() => {
        api.get('/dlq').then(res => setErrors(res.data)).catch(() => { });
    }, []);

    if (errors.length === 0) return null;

    return (
        <div className="p-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Ingestion Issues ({errors.length})
            </h3>
            <div className="bg-orange-50 rounded-lg p-4 max-h-60 overflow-y-auto border border-orange-100">
                <div className="space-y-3">
                    {errors.map((err, i) => (
                        <div key={i} className="text-xs text-gray-700 pb-2 border-b border-orange-200 last:border-0 last:pb-0">
                            <div className="font-mono text-orange-800 mb-1">{new Date(err.timestamp).toLocaleString()}</div>
                            <div className="font-semibold">{err.error}</div>
                            {!!err.raw_data && (
                                <div className="mt-1 opacity-75 truncate font-mono bg-white/50 p-1 rounded">
                                    {typeof err.raw_data === 'string' ? err.raw_data.substring(0, 100) : JSON.stringify(err.raw_data).substring(0, 100)}...
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;
