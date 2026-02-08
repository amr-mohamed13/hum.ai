/**
 * CreditsModal - Wide Grid Design (Polished)
 * ============================================
 * Features:
 * - Wide modal (max-w-4xl)
 * - 2-column grid layout
 * - Clear Role/Name hierarchy
 * - Proper spacing between groups
 */

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { SongMetadata } from '../../types';

interface CreditsModalProps {
    song: SongMetadata;
    onClose: () => void;
}

// Parse credits text into structured groups
function parseCredits(creditsText: string | undefined) {
    if (!creditsText) return [];

    const lines = creditsText.split('\n').filter(line => line.trim());
    const credits: { role: string; names: string[] }[] = [];

    let currentRole = '';
    let currentNames: string[] = [];

    for (const line of lines) {
        // Check if line looks like a role (e.g., "Producer:", "Written by", etc.)
        if (line.includes(':') || line.match(/^[A-Z][a-z]+ by/)) {
            // Save previous group
            if (currentRole && currentNames.length > 0) {
                credits.push({ role: currentRole, names: currentNames });
            }

            // Parse new role and names
            const colonIndex = line.indexOf(':');
            if (colonIndex > -1) {
                currentRole = line.substring(0, colonIndex).trim();
                const namesStr = line.substring(colonIndex + 1).trim();
                currentNames = namesStr ? namesStr.split(/[,&]/).map(n => n.trim()).filter(Boolean) : [];
            } else {
                const byMatch = line.match(/^(.+?) by (.+)$/);
                if (byMatch) {
                    currentRole = byMatch[1].trim();
                    currentNames = byMatch[2].split(/[,&]/).map(n => n.trim()).filter(Boolean);
                } else {
                    currentRole = line;
                    currentNames = [];
                }
            }
        } else if (currentRole) {
            // Continuation of names
            currentNames.push(...line.split(/[,&]/).map(n => n.trim()).filter(Boolean));
        } else {
            // Standalone line without role
            credits.push({ role: 'Credit', names: [line.trim()] });
        }
    }

    // Don't forget the last group
    if (currentRole && currentNames.length > 0) {
        credits.push({ role: currentRole, names: currentNames });
    }

    return credits;
}

export function CreditsModal({ song, onClose }: CreditsModalProps) {
    const parsedCredits = parseCredits(song.credits_text);
    const hasStructuredCredits = parsedCredits.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal Content - WIDE (max-w-4xl) */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative z-10 w-full max-w-4xl max-h-[85vh] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-8 py-6 flex items-center justify-between z-20">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Credits</h2>
                        <p className="text-sm text-zinc-400 mt-1">{song.title} · {song.artist}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Credits Content */}
                <div className="p-8 max-h-[calc(85vh-100px)] overflow-y-auto">
                    {hasStructuredCredits ? (
                        /* 2-Column Grid Layout with proper spacing */
                        <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                            {parsedCredits.map((credit, index) => (
                                <div key={index}>
                                    {/* Role - Uppercase, small, tracked */}
                                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">
                                        {credit.role}
                                    </p>
                                    {/* Names - Stacked with gap-2 */}
                                    <div className="flex flex-col gap-2">
                                        {credit.names.map((name, nameIndex) => (
                                            <p key={nameIndex} className="text-2xl font-bold text-white">
                                                {name}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : song.credits_text ? (
                        /* Fallback: Plain text with better styling */
                        <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                            {song.credits_text.split('\n').filter(Boolean).map((line, i) => {
                                // Try to detect role: name pattern
                                const colonIndex = line.indexOf(':');
                                if (colonIndex > -1 && colonIndex < 30) {
                                    const role = line.substring(0, colonIndex).trim();
                                    const names = line.substring(colonIndex + 1).trim();
                                    return (
                                        <div key={i}>
                                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">
                                                {role}
                                            </p>
                                            <p className="text-2xl font-bold text-white">{names}</p>
                                        </div>
                                    );
                                }
                                return (
                                    <p key={i} className="text-zinc-300 text-base leading-relaxed col-span-2">
                                        {line}
                                    </p>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-zinc-500 text-center py-8">
                            No credits information available.
                        </p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

export default CreditsModal;
