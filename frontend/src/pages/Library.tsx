/**
 * Library Page - Spotify-Style Song Collection
 * Premium, clean design matching Spotify's aesthetic
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import clsx from 'clsx';
import type { SongMetadata } from '../types';
import songsData from '../data/songs.json';

// Custom Library Icon - Same as TopNav
const LibraryIcon = ({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Pause symbol - two vertical parallel lines with gap */}
        <line x1="5" y1="6" x2="5" y2="22" />
        <line x1="9" y1="6" x2="9" y2="22" />
        {/* Open trapezoidal shape - vertical left, horizontal bottom, diagonal top, open right */}
        <line x1="13" y1="6" x2="13" y2="22" />
        <line x1="13" y1="22" x2="20" y2="22" />
        <line x1="13" y1="6" x2="20" y2="12" />
        <line x1="20" y1="12" x2="20" y2="22" />
    </svg>
);

export function Library() {
    const navigate = useNavigate();
    const [songs, setSongs] = useState<SongMetadata[]>([]);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        setSongs(songsData as SongMetadata[]);
    }, []);

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="min-h-full">
            {/* Header with gradient background */}
            <div
                className="relative px-8 pt-12 pb-8 h-[250px]"
                style={{
                    background: 'linear-gradient(180deg, #5038a0 0%, #5038a0 30%, #121212 100%)'
                }}
            >
                {/* Playlist Cover */}
                <div
                    className="absolute left-8 bottom-8 w-48 h-48 rounded shadow-2xl shadow-black/50
                               flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 50%, #06B6D4 100%)'
                    }}
                >
                    <LibraryIcon className="w-24 h-24 text-white drop-shadow-lg" strokeWidth={2} />
                </div>

                {/* Playlist Info */}
                <div className="absolute left-[240px] bottom-8 flex flex-col gap-2">
                    <h1 className="text-9xl font-extrabold text-white tracking-tight">
                        Library
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                        <span className="font-semibold">Your songs</span>
                        <span>•</span>
                        <span>{songs.length} songs</span>
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div className="h-6 bg-gradient-to-b from-[#2a1f4e]/30 to-transparent"></div>

            {/* Song List */}
            <div className="px-8 pb-32">
                {/* Header Row */}
                <div
                    className="grid items-center px-4 py-2 text-sm text-white/60 border-b border-white/10 mb-4"
                    style={{ gridTemplateColumns: '40px 4fr 3fr 2fr 80px' }}
                >
                    <span className="text-center">#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <span>Date Released</span>
                    <span className="text-center">
                        <Clock3 className="w-4 h-4 inline-block" />
                    </span>
                </div>

                {/* Song Rows */}
                <div className="space-y-8">
                    {songs.map((song, index) => (
                        <div
                            key={song.id}
                            className={clsx(
                                'grid items-center px-4 py-4 rounded-md transition-colors cursor-pointer',
                                hoveredIndex === index ? 'bg-white/10' : 'bg-transparent'
                            )}
                            style={{ gridTemplateColumns: '40px 4fr 3fr 2fr 80px' }}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={() => navigate(`/song/${encodeURIComponent(song.id)}`)}
                        >
                            {/* # Column */}
                            <span className="text-sm text-white/60 text-center">{index + 1}</span>

                            {/* Title Column */}
                            <div className="flex items-center gap-4 min-w-0">
                                <img
                                    src={song.cover_image}
                                    alt={song.title}
                                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                                    onError={(e) => {
                                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23282828" width="40" height="40"/></svg>';
                                    }}
                                />
                                <div className="min-w-0">
                                    <p className="text-base text-white truncate">{song.title}</p>
                                    <p className="text-sm text-white/60 truncate">{song.artist}</p>
                                </div>
                            </div>

                            {/* Album Column */}
                            <p className="text-sm text-white/60 truncate">{song.album}</p>

                            {/* Date Column */}
                            <p className="text-sm text-white/60">{formatDate(song.release_date)}</p>

                            {/* Duration Column */}
                            <span className="text-sm text-white/60 text-center">{song.length}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Library;
