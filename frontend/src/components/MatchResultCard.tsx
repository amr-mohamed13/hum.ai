import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface Match {
    id: string;
    name: string;
    title?: string;
    artist?: string;
    similarity: number;
    cover_image?: string;
    theme_color?: string;
}

interface MatchResultCardProps {
    match: Match;
    isPlaying: boolean;
    onPlay: () => void;
    onClick: () => void;
    rank: number;
}

export function MatchResultCard({ match, isPlaying, onPlay, onClick, rank }: MatchResultCardProps) {
    const similarity = Math.round(match.similarity);

    // Determine confidence color
    const confidenceColor = similarity >= 80 ? 'text-emerald-400' :
        similarity >= 60 ? 'text-yellow-400' : 'text-red-400';

    const confidenceBg = similarity >= 80 ? 'bg-emerald-500/20' :
        similarity >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="group relative flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
            onClick={onClick}
        >
            {/* Rank */}
            <span className="text-white/40 font-mono w-6 text-center">{rank}</span>

            {/* Cover Image */}
            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-zinc-800 flex-shrink-0">
                {match.cover_image ? (
                    <img src={match.cover_image} alt={match.title || match.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/20">
                        No Art
                    </div>
                )}

                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPlay();
                        }}
                        className="p-1.5 rounded-full bg-white text-black hover:scale-110 transition-transform"
                    >
                        {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{match.title || match.name}</h4>
                <p className="text-white/40 text-sm truncate">{match.artist || "Unknown Artist"}</p>
            </div>

            {/* Match % */}
            <div className={clsx("px-2 py-1 rounded text-xs font-bold", confidenceBg, confidenceColor)}>
                {similarity}%
            </div>
        </motion.div>
    );
}
