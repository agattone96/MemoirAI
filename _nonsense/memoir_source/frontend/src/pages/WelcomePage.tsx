import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Mail } from 'lucide-react';

export const WelcomePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Navigation */}
                <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6">
                    <div className="flex items-center gap-3">
                        <Sparkles className="text-indigo-600" size={32} />
                        <span className="text-2xl font-bold text-gray-900">Memoir.ai</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-lg hover:shadow-xl transition-all"
                        >
                            Get Started
                        </button>
                    </div>
                </nav>

                {/* Hero Content */}
                <div className="relative z-10 max-w-7xl mx-auto px-8 pt-32 pb-20">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Left: Text Content */}
                        <div>
                            <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
                                Transform Your
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600"> Digital Life </span>
                                Into a Personal Memoir
                            </h1>
                            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                                Import decades of messages, photos, and memories. Use AI to search, analyze, and craft your life story—all stored privately on your computer.
                            </p>
                            <div className="flex flex-col gap-4 max-w-sm">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-lg transition-all"
                                    >
                                        Log In
                                    </button>
                                    <button
                                        onClick={() => navigate('/signup')}
                                        className="flex-1 px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50 font-semibold transition-all"
                                    >
                                        Sign Up
                                    </button>
                                </div>
                                <div className="flex gap-4 justify-between text-sm">
                                    <button
                                        onClick={() => navigate('/forgot-password')} // TODO: Implement route
                                        className="text-gray-500 hover:text-indigo-600 font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Lock size={14} /> Forgot Password?
                                    </button>
                                    <a
                                        href="mailto:allisongattone2@gmail.com?subject=Memoir.ai%20Help%20Request"
                                        className="text-gray-500 hover:text-indigo-600 font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Mail size={14} /> Help
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Right: Hero Visual - Gradient Placeholder */}
                        <div className="relative">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 h-[500px] flex items-center justify-center text-white">
                                <div className="text-center p-12">
                                    <div className="text-6xl mb-4">📸</div>
                                    <p className="text-xl font-semibold opacity-90">Your Memories Visualized</p>
                                    <p className="text-sm opacity-75 mt-2">Timeline • Photos • Conversations</p>
                                </div>
                            </div>
                            {/* Floating elements */}
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500 rounded-full opacity-20 blur-2xl animate-pulse" />
                            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-pink-500 rounded-full opacity-20 blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="max-w-7xl mx-auto px-8 py-20">
                <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
                    Everything You Need to Preserve Your Story
                </h2>
                <p className="text-xl text-center text-gray-600 mb-16 max-w-2xl mx-auto">
                    A complete suite of AI-powered tools designed for personal historians
                </p>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: '🔒',
                            title: 'Privacy First',
                            description: 'Your data never leaves your computer. Complete control, zero cloud dependency.',
                        },
                        {
                            icon: '🧠',
                            title: 'AI-Powered Search',
                            description: 'Find any memory instantly with semantic search. "Show me conversations about my trip to Paris in 2019"',
                        },
                        {
                            icon: '✍️',
                            title: 'Memoir Drafting',
                            description: 'Collaborate with AI to write your life story, backed by evidence from your actual messages.',
                        },
                        {
                            icon: '🔬',
                            title: 'Conversation Forensics',
                            description: 'Deep analytical insights into your relationships and communication patterns over time.',
                        },
                        {
                            icon: '📊',
                            title: 'Visual Timeline',
                            description: 'See your entire life laid out chronologically with interactive event bubbles and milestones.',
                        },
                        {
                            icon: '⚡',
                            title: 'Lightning Fast',
                            description: 'Handle millions of messages with ease. Optimized for datasets up to 100GB.',
                        },
                    ].map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100"
                        >
                            <div className="text-5xl mb-4">{feature.icon}</div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                            <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-20">
                <div className="max-w-4xl mx-auto text-center px-8">
                    <h2 className="text-4xl font-bold text-white mb-6">
                        Ready to Preserve Your Digital Legacy?
                    </h2>
                    <p className="text-xl text-indigo-100 mb-8">
                        Join thousands rediscovering their life stories through AI-powered memory intelligence.
                    </p>
                    <button
                        onClick={() => navigate('/signup')}
                        className="px-10 py-4 bg-white text-indigo-600 rounded-xl hover:bg-gray-50 font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
                    >
                        Create Your Free Account
                    </button>
                    <p className="text-sm text-indigo-200 mt-4">No credit card required • 100% local • No data uploaded</p>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12">
                <div className="max-w-7xl mx-auto px-8 text-center">
                    <p>© 2026 Memoir.ai. All rights reserved. Your memories, your data, your story.</p>
                </div>
            </footer>
        </div>
    );
};

export default WelcomePage;
