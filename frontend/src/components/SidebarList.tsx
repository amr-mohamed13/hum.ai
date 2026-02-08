/**
 * SidebarList Component
 * ======================
 * Displays a scrollable list of songs in the sidebar.
 * Each item shows thumbnail, title, and artist with hover/active states.
 */

import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import type { SongMetadata } from '../types';

interface SidebarListProps {
    songs: SongMetadata[];
    selectedSong: SongMetadata | null;
    onSelectSong: (song: SongMetadata) => void;
}

/**
 * SidebarList - Scrollable song list with selection support
 */
export function SidebarList({ songs, selectedSong, onSelectSong }: SidebarListProps) {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="sidebar-header">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                        <Music className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Library</h2>
                        <p className="text-xs text-text-secondary">{songs.length} songs</p>
                    </div>
                </div>
            </div>

            {/* Song List */}
            <div className="sidebar-content">
                {songs.map((song, index) => (
                    <motion.button
                        key={song.id}
                        onClick={() => onSelectSong(song)}
                        className={`song-item w-full text-left ${selectedSong?.id === song.id ? 'active' : ''
                            }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.3 }}
                        whileHover={{ x: 4 }}
                    >
                        <img
                            src={song.cover_image}
                            alt={song.title}
                            className="song-item-thumbnail"
                            loading="lazy"
                        />
                        <div className="song-item-info">
                            <div className="song-item-title">{song.title}</div>
                            <div className="song-item-artist">{song.artist}</div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

export default SidebarList;
