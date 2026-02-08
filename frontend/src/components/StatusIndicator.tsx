/**
 * StatusIndicator Component
 * ==========================
 * Displays the current status of the melody identification process.
 * 
 * States:
 * - idle: Waiting for user to record
 * - listening: Recording in progress
 * - processing: Analyzing the melody
 * - success: Match found
 * - error: Something went wrong
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, CheckCircle, XCircle, AudioLines } from 'lucide-react';

export type Status = 'idle' | 'listening' | 'processing' | 'success' | 'error';

interface StatusIndicatorProps {
    status: Status;
    message?: string;
}

/**
 * StatusIndicator - Animated status badge
 */
export function StatusIndicator({ status, message }: StatusIndicatorProps) {
    // Configuration for each status state
    const statusConfig = {
        idle: {
            icon: Mic,
            label: 'Ready to Record',
            className: 'bg-slate-700/50 text-slate-300 border-slate-600',
        },
        listening: {
            icon: AudioLines,
            label: 'Listening...',
            className: 'status-badge listening',
        },
        processing: {
            icon: Loader2,
            label: 'Processing...',
            className: 'status-badge processing',
            spin: true,
        },
        success: {
            icon: CheckCircle,
            label: 'Match Found',
            className: 'status-badge success',
        },
        error: {
            icon: XCircle,
            label: message || 'Error',
            className: 'status-badge error',
        },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={status}
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.2 }}
                className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-full
          text-sm font-medium border
          ${config.className}
        `}
            >
                <Icon
                    className={`w-4 h-4 ${'spin' in config && config.spin ? 'animate-spin' : ''}`}
                />
                <span>{config.label}</span>
            </motion.div>
        </AnimatePresence>
    );
}

export default StatusIndicator;
