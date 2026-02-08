/**
 * ArtistModal - Polished Spotify Banner Style
 * =============================================
 * Features:
 * - Full-width hero banner with artist image
 * - Rank badge ABOVE artist name
 * - Massive artist name typography
 * - Horizontal stats row
 * - Bio with leading-loose for readability
 */

import { motion } from 'framer-motion';
import { X, Facebook, Instagram, Twitter, ExternalLink } from 'lucide-react';
import type { SongMetadata } from '../../types';

interface ArtistModalProps {
    song: SongMetadata;
    onClose: () => void;
}

// Wikipedia icon
const WikipediaIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801-.378-.801l-.308-.047c-.151 0-.227-.045-.227-.15v-.451l.113-.037h4.079c.035.012.054.036.054.071v.524c0 .084-.062.135-.188.144-.734.06-1.255.315-1.563.765-.308.45-.823 1.463-1.548 3.044l-2.339 4.678.056.096 3.163 6.234c.363.72.572 1.141.631 1.261.234.451.484.583.915.583l.164-.031c.151 0 .226.045.226.15v.435l-.113.037h-5.177l-.052-.045v-.406c0-.119.076-.181.227-.181l.421-.028c.571-.037.701-.181.484-.651-1.072-2.324-2.124-4.586-2.124-4.586l-.056-.085z" />
    </svg>
);

export function ArtistModal({ song, onClose }: ArtistModalProps) {
    const stats = song.spotify_stats;
    const social = song.social_links;

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

            {/* Modal Content - Wide */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                >
                    <X className="w-5 h-5 text-white" />
                </button>

                {/* Scrollable Content */}
                <div className="max-h-[90vh] overflow-y-auto">

                    {/* ========================================
                        HERO BANNER - Full Width Artist Image
                    ======================================== */}
                    <div className="relative h-80 w-full">
                        {/* Background Image */}
                        <img
                            src={song.artist_image}
                            alt={song.artist}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 320"><rect fill="%23282828" width="800" height="320"/></svg>';
                            }}
                        />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

                        {/* Artist Info - Bottom Left */}
                        <div className="absolute bottom-6 left-8 right-8">
                            {/* Rank Badge - ABOVE Artist Name */}
                            {stats?.rank && (
                                <span className="inline-flex px-4 py-1.5 bg-blue-500 rounded-full text-sm font-bold text-white mb-3">
                                    {stats.rank} in the world
                                </span>
                            )}

                            {/* Artist Name - MASSIVE */}
                            <h2 className="text-6xl font-black text-white tracking-tight">
                                {song.artist}
                            </h2>
                        </div>
                    </div>

                    {/* ========================================
                        CONTENT BODY
                    ======================================== */}
                    <div className="p-8 space-y-8">

                        {/* Stats Row - HORIZONTAL */}
                        {stats && (
                            <div className="flex flex-wrap items-center gap-8">
                                {/* Monthly Listeners */}
                                {stats.listeners && (
                                    <div>
                                        <p className="text-3xl font-bold text-white">{stats.listeners}</p>
                                        <p className="text-sm text-zinc-400">monthly listeners</p>
                                    </div>
                                )}

                                {/* Followers (if available) */}
                                {stats.followers && (
                                    <div>
                                        <p className="text-3xl font-bold text-white">{stats.followers}</p>
                                        <p className="text-sm text-zinc-400">followers</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Top Cities */}
                        {stats?.top_cities && stats.top_cities.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Top Cities This Month</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {stats.top_cities.slice(0, 6).map((city, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg px-4 py-3">
                                            <span className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                                                {i + 1}
                                            </span>
                                            <span className="text-white font-medium">{city.city}</span>
                                            <span className="text-zinc-500 text-sm ml-auto">{city.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Social Links */}
                        {social && Object.keys(social).length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Connect</p>
                                <div className="flex items-center gap-3">
                                    {social.facebook && (
                                        <a
                                            href={social.facebook}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                                        >
                                            <Facebook className="w-5 h-5 text-white" />
                                        </a>
                                    )}
                                    {social.instagram && (
                                        <a
                                            href={social.instagram}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                                        >
                                            <Instagram className="w-5 h-5 text-white" />
                                        </a>
                                    )}
                                    {social.twitter && (
                                        <a
                                            href={social.twitter}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                                        >
                                            <Twitter className="w-5 h-5 text-white" />
                                        </a>
                                    )}
                                    {social.wikipedia && (
                                        <a
                                            href={social.wikipedia}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                                        >
                                            <WikipediaIcon className="w-5 h-5 text-white" />
                                        </a>
                                    )}
                                    {social.website && (
                                        <a
                                            href={social.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                                        >
                                            <ExternalLink className="w-5 h-5 text-white" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Bio - RELAXED Typography */}
                        {song.bio && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">About</p>
                                <p className="text-lg leading-loose text-zinc-300 whitespace-pre-wrap max-w-3xl">
                                    {song.bio}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default ArtistModal;
