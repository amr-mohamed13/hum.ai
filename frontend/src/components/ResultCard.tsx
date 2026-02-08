/**
 * ResultCard Component
 * =====================
 * Displays the matched song result with confidence score and pitch visualization.
 * 
 * Features:
 * - Elegant card design with glassmorphism
 * - Confidence score bar with animation
 * - Match timestamp display
 * - Integrated pitch comparison chart
 */

import { motion } from 'framer-motion';
import { Music, Clock, TrendingUp } from 'lucide-react';
import { PitchChart } from './PitchChart';

// Type definition for the match result
export interface MatchResult {
    best_match_song_title: string;
    confidence_score: number;
    match_start_time: number;
    hum_pitch: number[];
    song_pitch: number[];
}

interface ResultCardProps {
    result: MatchResult;
}

/**
 * ResultCard - Displays the melody match result
 */
export function ResultCard({ result }: ResultCardProps) {
    /**
     * Format the match start time as minutes:seconds
     */
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    /**
     * Get confidence level label and color
     */
    const getConfidenceDetails = (score: number) => {
        if (score >= 80) return { label: 'Excellent Match', color: '#22c55e' };
        if (score >= 60) return { label: 'Good Match', color: '#3b82f6' };
        if (score >= 40) return { label: 'Possible Match', color: '#f59e0b' };
        return { label: 'Weak Match', color: '#ef4444' };
    };

    const confidence = getConfidenceDetails(result.confidence_score);

    return (
        <motion.div
            className="result-card w-full max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                    {/* Music Icon */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <Music className="w-7 h-7 text-white" />
                    </div>

                    {/* Song Info */}
                    <div>
                        <p className="text-slate-400 text-sm mb-1">Matched Song</p>
                        <h3 className="text-xl font-semibold text-white">
                            {result.best_match_song_title}
                        </h3>
                    </div>
                </div>

                {/* Confidence Badge */}
                <div
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{
                        backgroundColor: `${confidence.color}20`,
                        color: confidence.color,
                        border: `1px solid ${confidence.color}40`
                    }}
                >
                    {confidence.label}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Confidence Score */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>Confidence Score</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-white">
                            {result.confidence_score.toFixed(1)}
                        </span>
                        <span className="text-slate-400 mb-1">/ 100</span>
                    </div>
                    {/* Confidence Bar */}
                    <div className="confidence-bar mt-3">
                        <motion.div
                            className="confidence-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${result.confidence_score}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                            style={{ backgroundColor: confidence.color }}
                        />
                    </div>
                </div>

                {/* Match Position */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                        <Clock className="w-4 h-4" />
                        <span>Match Position</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-white">
                            {formatTime(result.match_start_time)}
                        </span>
                        <span className="text-slate-400 mb-1">into song</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-2">
                        Your hum matches around this timestamp
                    </p>
                </div>
            </div>

            {/* Pitch Comparison Chart */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                <PitchChart
                    humPitch={result.hum_pitch}
                    songPitch={result.song_pitch}
                />
            </motion.div>
        </motion.div>
    );
}

export default ResultCard;
