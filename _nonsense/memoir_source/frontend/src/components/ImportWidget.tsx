import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, CheckCircle, FileArchive, AlertCircle, X, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../lib/axios';

interface ImportWidgetProps {
    onComplete?: () => void;
    onSkip?: () => void;
    showSkip?: boolean;
}

export const ImportWidget: React.FC<ImportWidgetProps> = ({ onComplete, onSkip, showSkip = true }) => {
    const [isSaving, setIsSaving] = useState(false);

    // Import State
    const [batchId, setBatchId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('pending');
    const [importStats, setImportStats] = useState({ files: 0, messages: 0 });
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Mode State
    const [importMode, setImportMode] = useState<'upload' | 'path'>('upload');
    const [localPath, setLocalPath] = useState('');

    // File handling
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (files: FileList | null) => {
        setUploadError(null);
        if (!files || files.length === 0) return;
        if (files.length > 1) {
            setUploadError("Please upload only one file at a time.");
            return;
        }

        const file = files[0];
        // Validation
        const validTypes = ['application/zip', 'application/x-zip-compressed', 'application/json'];
        const validExts = ['.zip', '.json'];
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
            setUploadError("Unsupported file type. Please upload a .zip or .json file.");
            return;
        }

        // Limit check only for upload
        if (file.size > 32 * 1024 * 1024 * 1024) { // 32GB
            setUploadError("File is too large (Max 32GB).");
            return;
        }

        setSelectedFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handlePathSubmit = async () => {
        if (!localPath) return;
        setIsSaving(true);
        setUploadError(null);
        try {
            const res = await api.post('/import/path', { path: localPath });
            setBatchId(res.data.batch_id);
            setStatus('processing');
        } catch (err: unknown) {
            console.error(err);
            const error = err as { response?: { data?: { error?: string } } };
            setUploadError(error.response?.data?.error || "Path import failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const [uploadProgress, setUploadProgress] = useState(0);
    const [jobProgress, setJobProgress] = useState(0);

    const handleUploadConfirm = async () => {
        if (!selectedFile) return;

        setIsSaving(true);
        setUploadError(null);
        setUploadProgress(0);

        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
        const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
        const uploadId = uuidv4();

        try {
            if (selectedFile.size > CHUNK_SIZE) {
                // Chunked Upload
                for (let i = 0; i < totalChunks; i++) {
                    const start = i * CHUNK_SIZE;
                    const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
                    const chunk = selectedFile.slice(start, end);

                    const formData = new FormData();
                    formData.append('upload_id', uploadId);
                    formData.append('chunk_index', i.toString());
                    formData.append('total_chunks', totalChunks.toString());
                    formData.append('file', chunk);

                    await api.post('/import/upload/chunk', formData);
                    setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
                }

                const completeRes = await api.post('/import/upload/complete', {
                    upload_id: uploadId,
                    filename: selectedFile.name
                });
                setBatchId(completeRes.data.batch_id);
            } else {
                // Standard Upload
                const formData = new FormData();
                formData.append('file', selectedFile);
                const res = await api.post('/import/upload', formData, {
                    onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1)))
                });
                setBatchId(res.data.batch_id);
            }
            setStatus('processing');
        } catch (err: unknown) {
            console.error(err);
            const error = err as { response?: { data?: { error?: string } } };
            setUploadError(error.response?.data?.error || "Upload failed. Please check your connection.");
        } finally {
            setIsSaving(false);
        }
    };

    // Poll Effect
    React.useEffect(() => {
        if (!batchId || status === 'completed' || status === 'failed') return;

        const interval = setInterval(async () => {
            try {
                // Use the new jobs endpoint for more detail
                const res = await api.get(`/ingest/jobs/${batchId}`);
                const data = res.data;
                setStatus(data.status);
                setJobProgress(data.progress || 0);

                // Still fetch batch for stats (or we could combine them)
                const batchRes = await api.get(`/import/batch/${batchId}`);
                if (batchRes.data.report) {
                    setImportStats({
                        files: batchRes.data.report.files_found || 0,
                        messages: batchRes.data.report.messages_created || 0
                    });
                }
            } catch (e) {
                console.error("Poll Error", e);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [batchId, status]);

    const handleReset = () => {
        setBatchId(null);
        setStatus('pending');
        setImportStats({ files: 0, messages: 0 });
        setUploadError(null);
        setLocalPath('');
        setSelectedFile(null);
    };

    return (
        <div className="w-full">
            {!batchId ? (
                <>
                    {/* Import Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-xl mb-6 w-fit mx-auto">
                        <button
                            onClick={() => { setImportMode('upload'); setUploadError(null); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${importMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Upload File
                        </button>
                        <button
                            onClick={() => { setImportMode('path'); setUploadError(null); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${importMode === 'path' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Local Folder
                        </button>
                    </div>

                    {importMode === 'upload' ? (
                        !selectedFile ? (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('file-upload-widget')?.click()}
                                className={`
                                    border-2 border-dashed rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[300px]
                                    ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'}
                                `}
                            >
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform ${isDragging ? 'bg-indigo-200 scale-110' : 'bg-indigo-100 group-hover:scale-110'}`}>
                                    <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-indigo-700' : 'text-indigo-600'}`} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Drop your export here</h3>
                                <p className="text-gray-500 mb-6">
                                    .zip or .json • Max 32GB
                                </p>
                                <button className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-700 shadow-sm hover:bg-gray-50 pointer-events-none">
                                    Click to Browse
                                </button>
                                <input id="file-upload-widget" type="file" className="hidden" accept=".zip,.json" onChange={(e) => handleFileSelect(e.target.files)} />
                            </div>
                        ) : (
                            // File Selected State
                            <div className="border-2 border-indigo-200 bg-indigo-50/50 rounded-2xl p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                                        <FileArchive className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">{selectedFile.name}</h3>
                                        <p className="text-sm text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                    </div>
                                    <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <button
                                    onClick={handleUploadConfirm}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Import"}
                                </button>
                            </div>
                        )
                    ) : (
                        // Local Path Input
                        <div className="border border-gray-200 bg-white rounded-2xl p-8 shadow-sm">
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Absolute Folder Path</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={localPath}
                                        onChange={(e) => setLocalPath(e.target.value)}
                                        placeholder="/Users/username/Downloads/facebook-export"
                                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Paste the full path to your unzipped export folder. Zero upload time.
                                </p>
                            </div>
                            <button
                                onClick={handlePathSubmit}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 mb-4"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Import from Disk"}
                            </button>
                        </div>
                    )}

                    {/* Error Message */}
                    {uploadError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 mt-4">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-red-900 text-sm">Import Failed</h4>
                                <p className="text-sm text-red-700">{uploadError}</p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                // Importing State
                <div className="bg-white border text-center boundary-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            {status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                            {status === 'processing' ? 'Processing Backup...' : status === 'completed' ? 'Import Complete' : 'Import Failed'}
                        </h3>
                        {status === 'completed' && <CheckCircle className="w-6 h-6 text-green-500" />}
                    </div>

                    <div className="space-y-4 mb-6 text-left">
                        {status === 'processing' && (
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Upload Status</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-green-500 h-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Parsing & Indexing</span>
                                        <span>{Math.round(jobProgress)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-indigo-600 h-full transition-all duration-300"
                                            style={{ width: `${jobProgress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between text-sm py-2 border-b border-gray-50">
                            <span className="text-gray-500">Files Found</span>
                            <span className="font-mono font-medium text-gray-900">{importStats.files}</span>
                        </div>
                        <div className="flex justify-between text-sm py-2 border-b border-gray-50">
                            <span className="text-gray-500">Messages Parsed</span>
                            <span className="font-mono font-medium text-gray-900">{importStats.messages}</span>
                        </div>
                    </div>

                    {status === 'completed' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-3">
                            <button onClick={handleReset} className="w-full py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl">
                                Import Another
                            </button>
                            {onComplete && (
                                <button onClick={onComplete} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all">
                                    Continue
                                </button>
                            )}
                        </motion.div>
                    )}

                    {status === 'failed' && (
                        <div className="mt-4 space-y-3 text-left">
                            <p className="text-sm text-red-600">Something went wrong during extraction.</p>
                            <button onClick={handleReset} className="w-full py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors">
                                Try Again
                            </button>
                            {showSkip && onSkip && (
                                <button onClick={onSkip} className="w-full py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors text-sm">
                                    Skip Import
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {!batchId && !isSaving && showSkip && onSkip && (
                <button
                    onClick={onSkip}
                    className="w-full py-3 mt-4 text-gray-500 font-medium hover:text-gray-700 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition-all text-sm"
                >
                    Skip Import for Now
                </button>
            )}
        </div>
    );
};
