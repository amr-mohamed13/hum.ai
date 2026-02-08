/**
 * SongDetailsCard Component
 * ==========================
 * Hero component for displaying song details.
 * Used for both sidebar selection and humming match results.
 */

import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import type { SongMetadata } from '../types';

interface SongDetailsCardProps {
    song: SongMetadata;
    /** Optional confidence score when displaying as a match result */
    confidenceScore?: number;
    /** Callback to clear selection and return to recorder */
    onBack: () => void;
    /** Whether this is showing a match result (vs sidebar selection) */
    isMatchResult?: boolean;
}

/**
 * Get confidence level label and color
 */
function getConfidenceDetails(score: number) {
    if (score >= 80) return { label: 'Excellent Match', color: '#22c55e' };
    if (score >= 60) return { label: 'Good Match', color: '#6366f1' };
    if (score >= 40) return { label: 'Possible Match', color: '#f59e0b' };
    return { label: 'Weak Match', color: '#ef4444' };
}

/**
 * SongDetailsCard - Hero display for selected or matched song
 */
export function SongDetailsCard({
    song,
    confidenceScore,
    onBack,
    isMatchResult = false,
}: SongDetailsCardProps) {
    const confidence = confidenceScore !== undefined ? getConfidenceDetails(confidenceScore) : null;

    return (
        <motion.div
            className="song-details-card relative z-10"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            {/* Album Art */}
            <motion.img
                src={song.cover_image}
                alt={song.title}
                className="song-details-cover"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
            />

            {/* Song Title */}
            <motion.h1
                className="song-details-title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            >
                {song.title}
            </motion.h1>

            {/* Artist Name */}
            <motion.h2
                className="song-details-artist"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                {song.artist}
            </motion.h2>

            {/* Confidence Badge (only for match results) */}
            {isMatchResult && confidence && (
                <motion.div
                    className="match-badge"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    style={{
                        backgroundColor: `${confidence.color}20`,
                        color: confidence.color,
                        borderColor: `${confidence.color}40`,
                    }}
                >
                    <TrendingUp className="w-4 h-4" />
                    {confidence.label} - {confidenceScore?.toFixed(1)}%
                </motion.div>
            )}

            {/* Back Button */}
            <motion.button
                className="back-button"
                onClick={onBack}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <ArrowLeft className="w-4 h-4" />
                {isMatchResult ? 'Try Another Melody' : 'Back to Recorder'}
            </motion.button>
        </motion.div>
    );
}

export default SongDetailsCard;
