import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import logo from '../assets/images/logo.png';

interface SplashScreenProps {
    onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('Initializing...');

    useEffect(() => {
        const stages = [
            { progress: 20, message: 'Loading database...', delay: 800 },
            { progress: 40, message: 'Connecting services...', delay: 1200 },
            { progress: 60, message: 'Initializing AI engine...', delay: 1000 },
            { progress: 80, message: 'Loading your vault...', delay: 800 },
            { progress: 100, message: 'Ready!', delay: 500 }
        ];

        let currentStage = 0;
        const interval = setInterval(() => {
            if (currentStage < stages.length) {
                setProgress(stages[currentStage].progress);
                setStage(stages[currentStage].message);
                currentStage++;
            } else {
                clearInterval(interval);
                setTimeout(onComplete, 500);
            }
        }, stages[currentStage]?.delay || 300);

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-white rounded-full opacity-20"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                        }}
                        animate={{
                            y: [null, -100],
                            opacity: [0.2, 0],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </div>

            {/* Main content */}
            <div className="relative z-10 text-center">
                {/* Logo */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                    <img
                        src={logo}
                        alt="Memoir.ai"
                        className="w-32 h-32 mx-auto mb-8 drop-shadow-2xl"
                    />
                </motion.div>

                {/* Brand name */}
                <motion.h1
                    className="text-5xl font-bold text-white mb-2"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    Memoir.ai
                </motion.h1>

                <motion.p
                    className="text-xl text-indigo-200 mb-12"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                >
                    Your Personal Memory Intelligence
                </motion.p>

                {/* Progress bar */}
                <div className="w-80 mx-auto">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-3">
                        <motion.div
                            className="h-full bg-gradient-to-r from-indigo-400 to-pink-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <p className="text-sm text-indigo-300">{stage}</p>
                </div>
            </div>

            {/* Version number */}
            <div className="absolute bottom-8 text-indigo-300 text-sm">
                v2.0.0
            </div>
        </div>
    );
};
