import React from 'react';
import { motion } from 'framer-motion';

// Mock Media Data for MVP Visuals
const MOCK_MEDIA = [
    { id: 1, type: 'image', url: 'https://images.unsplash.com/photo-1542206391-7f949052999e?q=80&w=300&auto=format&fit=crop', date: '2023-05-12' },
    { id: 2, type: 'image', url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=300&auto=format&fit=crop', date: '2023-06-01' },
    { id: 3, type: 'image', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=300&auto=format&fit=crop', date: '2023-08-15' },
    { id: 4, type: 'image', url: 'https://images.unsplash.com/photo-1511632765486-da2fa71dc90b?q=80&w=300&auto=format&fit=crop', date: '2023-09-20' },
    { id: 5, type: 'video', url: '', date: '2023-11-02' }, // Placeholder for video
    { id: 6, type: 'image', url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=300&auto=format&fit=crop', date: '2024-01-10' },
];

import axios from 'axios';

import { toast } from 'sonner';
import { Eye } from 'lucide-react';

const MediaGallery: React.FC = () => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [searchResults, setSearchResults] = React.useState<{ text: string, metadata?: { sender?: string }, distance?: number }[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [analyzingId, setAnalyzingId] = React.useState<number | null>(null);

    const handleAnalyze = async (id: number, url: string) => {
        setAnalyzingId(id);
        toast.info("Analyzing image...");
        try {
            const res = await axios.post('/api/ai/vision', { filename: url });
            toast.success("Analysis Complete", {
                description: res.data.caption,
                duration: 5000,
            });
        } catch (e) {
            toast.error("Analysis Failed");
            console.error(e);
        } finally {
            setAnalyzingId(null);
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await axios.get(`/api/search/semantic?q=${encodeURIComponent(searchTerm)}`);
            setSearchResults(res.data);
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-50">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Media & Search</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search memories (semantic)..."
                        className="px-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {isSearching ? '...' : 'Search'}
                    </button>
                </div>
            </div>

            {searchResults.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-indigo-900">Search Results</h3>
                    <div className="space-y-3">
                        {searchResults.map((res, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-4 bg-white rounded-lg shadow-sm border-l-4 border-indigo-500"
                            >
                                <p className="text-gray-800">{res.text}</p>
                                <div className="mt-2 text-xs text-gray-500 flex gap-3">
                                    <span>From: {res.metadata?.sender || 'Unknown'}</span>
                                    <span>Score: {res.distance?.toFixed(2)}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            <h3 className="text-lg font-semibold mb-4 text-gray-700">Recent Media</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {MOCK_MEDIA.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer shadow-md group"
                    >
                        {item.type === 'image' ? (
                            <img src={item.url} alt="Gallery item" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                                <span className="text-xs font-semibold uppercase tracking-wider">Video</span>
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 justify-between">
                            <span className="text-white text-sm font-medium">{item.date}</span>

                            {item.type === 'image' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAnalyze(item.id, item.url);
                                    }}
                                    disabled={analyzingId === item.id}
                                    className="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm text-white transition-colors"
                                    title="Analyze with AI"
                                >
                                    {analyzingId === item.id ? (
                                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="mt-12 p-8 border-2 border-dashed border-gray-300 rounded-xl text-center">
                <p className="text-gray-500">
                    Integration with ingest pipeline pending. <br />
                    Photos from Facebook/Instagram exports will appear here.
                </p>
            </div>
        </div>
    );
};

export default MediaGallery;
