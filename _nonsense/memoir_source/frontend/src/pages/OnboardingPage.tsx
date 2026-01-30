
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, UploadCloud, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '../lib/axios';
import { ImportWidget } from '../components/ImportWidget';

// Assets
import welcomeImage from '../assets/images/welcome.png';

interface OnboardingProps {
    onComplete: () => void;
}

const STEPS = [
    { title: 'Privacy', icon: Shield },
    { title: 'Intelligence', icon: Key },
    { title: 'Import', icon: UploadCloud },
];

const OnboardingPage: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Import state moved to ImportWidget
    // Removed batchId as it was unused

    // Wait, the header text depends on batchId. 
    // We can just simplify the header in Onboarding or pass state up.
    // Simplifying: Let's remove batchId dependency from header text for now or make it generic "Import"
    // Actually, ImportWidget doesn't expose batchId.
    // Let's just remove the dynamic header text for simplicity or keep it static.


    const nextStep = () => setStep(s => s + 1);

    const handleFinish = async () => {
        setIsSaving(true);
        try {
            // Mark as done
            await api.post('/settings', { setup_completed: true });
            if (apiKey) {
                await api.post('/settings', { openai_api_key: apiKey });
            }
            onComplete();
        } catch {
            alert("Failed to save setup. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-50 font-sans">
            {/* Left Panel: Visuals (40%) */}
            <div className="hidden lg:flex w-[40%] bg-indigo-900 text-white relative flex-col justify-between p-12 overflow-hidden shadow-2xl z-10">
                <div className="z-10 relative">
                    <h1 className="text-4xl font-bold tracking-tight mb-4 font-display">Memoir.ai</h1>
                    <p className="text-indigo-200 text-lg max-w-sm leading-relaxed">
                        Your private, AI-powered autobiography engine.
                        Turn your digital footprint into a legacy.
                    </p>
                </div>

                <div className="z-10 relative transform hover:scale-105 transition-transform duration-700">
                    <img src={welcomeImage} alt="Welcome" className="w-full max-w-md mx-auto rounded-xl shadow-2xl border-4 border-indigo-800/50" />
                </div>

                <div className="z-10 relative text-sm text-indigo-300 font-medium tracking-wide">
                    Local First • Private by Design • Open Source
                </div>

                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-700 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-900 rounded-full blur-3xl opacity-50" />
            </div>

            {/* Right Panel: Interactive Wizard (60%) */}
            <div className="w-full lg:w-[60%] flex flex-col items-center justify-center p-6 relative">
                {/* Subtle BG Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-indigo-50/30 -z-10" />

                <div className="w-full max-w-[640px]">
                    {/* Stepper */}
                    <div className="flex items-center justify-between mb-12 px-4 relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 -mt-3" />
                        {STEPS.map((s, i) => {
                            const isCurrent = step === i;
                            const isCompleted = step > i;
                            return (
                                <div key={i} className="flex flex-col items-center gap-2 bg-gray-50 px-2 z-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isCurrent ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-100' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-xs font-semibold tracking-wide ${isCurrent ? 'text-indigo-700' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                                        {s.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100 ring-1 ring-black/5"
                        >
                            {/* Step 0: Privacy */}
                            {step === 0 && (
                                <div className="space-y-8">
                                    <div className="flex flex-col gap-2">
                                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-display">Privacy First</h2>
                                        <p className="text-lg text-gray-500">Your memories stay on your device.</p>
                                    </div>

                                    <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 space-y-4">
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                                                <Shield className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 mb-1">Local Storage</h3>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    Database lives in <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-100 text-indigo-700 font-mono text-xs">~/Library</code>.
                                                    We never upload your raw archives to the cloud.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button onClick={nextStep} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5">
                                        I Agree & Continue <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* Step 1: Intelligence */}
                            {step === 1 && (
                                <div className="space-y-8">
                                    <div className="flex flex-col gap-2">
                                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-display">Enable Intelligence</h2>
                                        <p className="text-lg text-gray-500">Unlock "Magic Draft" and Chat features.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">OpenAI API Key</label>
                                        <div className="relative">
                                            <Key className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={e => setApiKey(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-gray-800 transition-all shadow-sm"
                                                placeholder="sk-proj-..."
                                            />
                                        </div>
                                        <p className="mt-3 text-sm text-gray-500 flex items-center gap-1">
                                            Don't have one? <a href="https://platform.openai.com/api-keys" target="_blank" className="text-indigo-600 font-semibold hover:underline">Get key here</a>.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3 pt-4">
                                        <button
                                            onClick={nextStep}
                                            disabled={!apiKey || isSaving}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-lg font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:shadow-none"
                                        >
                                            Save & Continue <ArrowRight className="w-5 h-5" />
                                        </button>
                                        <button onClick={nextStep} className="text-gray-400 hover:text-gray-600 text-sm font-medium py-2">
                                            Skip for now (Features disabled)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Import */}
                            {step === 2 && (
                                <div className="space-y-8">
                                    <div className="flex flex-col gap-2">
                                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-display">Import Memories</h2>
                                        <p className="text-lg text-gray-500">
                                            Import a backup to build your timeline.
                                        </p>
                                    </div>

                                    <ImportWidget
                                        onComplete={handleFinish}
                                        onSkip={handleFinish}
                                        showSkip={true}
                                    />
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;
