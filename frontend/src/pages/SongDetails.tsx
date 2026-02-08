/**
 * SongDetails Page - Spotify Web-Style Layout
 * =============================================
 * Features:
 * - Horizontal hero layout (cover + vinyl + metadata)
 * - Smart vinyl animation (pauses in place, doesn't reset)
 * - Hidden lyrics with purple mic toggle
 * - Theme color gradient background
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
    Heart, Volume2, Maximize2, ListMusic, Mic2
} from 'lucide-react';
import clsx from 'clsx';
import type { SongMetadata } from '../types';
import songsData from '../data/songs.json';
import { ArtistModal } from '../components/modals/ArtistModal';
import { CreditsModal } from '../components/modals/CreditsModal';
import vinylImage from '../assets/Vinly Record.png';

// Player bar height
const PLAYER_BAR_HEIGHT = 75;

export function SongDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);

    // State
    const [song, setSong] = useState<SongMetadata | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showArtistModal, setShowArtistModal] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    // Load song data
    useEffect(() => {
        const songs = songsData as SongMetadata[];
        const found = songs.find(s => s.id === decodeURIComponent(id || ''));
        if (found) {
            setSong(found);
        } else {
            navigate('/library');
        }
    }, [id, navigate]);

    // Audio event handlers
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [song]);

    // Play/Pause toggle
    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    // Seek to position
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = percent * duration;
    };

    // Format time (seconds → mm:ss)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!song) {
        return (
            <div className="min-h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const progress = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className="min-h-full" style={{ paddingBottom: PLAYER_BAR_HEIGHT + 32 }}>
            {/* Hidden Audio Element */}
            <audio ref={audioRef} src={song.audio_path} preload="metadata" />

            {/* ========================================
                HERO SECTION - Gradient Background
            ======================================== */}
            <section
                className="relative"
                style={{
                    background: `linear-gradient(180deg, ${song.theme_color} 0%, ${song.theme_color}99 40%, #09090b 100%)`
                }}
            >
                {/* Hero Content - Padding Lives Here */}
                <div className="px-8 pt-16 pb-6">
                    {/* Hero Row: Artwork + Metadata - gap-35 for proper separation */}
                    <div className="flex flex-row items-end gap-35">
                        {/* Left: Artwork Container (Cover + Vinyl) */}
                        <div className="relative w-56 h-56 flex-shrink-0">
                            {/* Vinyl Record - Behind cover, peeking right */}
                            <img
                                src={vinylImage}
                                alt="Vinyl"
                                className="absolute top-0 w-56 h-56 rounded-full animate-spin-slow"
                                style={{
                                    left: '105px',
                                    top: '40px',
                                    zIndex: 10,
                                    animationPlayState: isPlaying ? 'running' : 'paused'
                                }}
                            />

                            {/* Album Cover - On top */}
                            <img
                                src={song.cover_image}
                                alt={song.title}
                                className="absolute top-0 left-0 w-56 h-56 rounded shadow-2xl shadow-black/60 object-cover"
                                style={{ zIndex: 20, left: '40px', top: '40px' }}
                                onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224 224"><rect fill="%23282828" width="224" height="224"/></svg>';
                                }}
                            />
                        </div>

                        {/* Right: Metadata - z-30 to ensure it's above vinyl */}
                        <div className="flex flex-col gap-2 min-w-0 pb-2 relative" style={{ zIndex: 30 }}>
                            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Song</span>

                            {/* Title - Responsive sizing */}
                            <h1 className={clsx(
                                'font-black text-white tracking-tight leading-none',
                                song.title.length > 25 ? 'text-4xl' : song.title.length > 15 ? 'text-5xl' : 'text-7xl'
                            )}>
                                {song.title}
                            </h1>

                            {/* Info Row: Avatar + Artist + Album + Year */}
                            <div className="flex items-center gap-2 mt-4 flex-wrap">
                                <img
                                    src={song.artist_image}
                                    alt={song.artist}
                                    className="w-7 h-7 rounded-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect fill="%23404040" width="28" height="28"/></svg>';
                                    }}
                                />
                                <span
                                    className="text-sm font-bold text-white hover:underline cursor-pointer"
                                    onClick={() => setShowArtistModal(true)}
                                >
                                    {song.artist}
                                </span>
                                <span className="text-white/60 text-sm">•</span>
                                <span className="text-sm text-white/80">{song.album}</span>
                                <span className="text-white/60 text-sm">•</span>
                                <span className="text-sm text-white/60">{song.release_date}</span>
                                <span className="text-white/60 text-sm">•</span>
                                <span className="text-sm text-white/60">{song.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================
                CONTENT SECTION - Dark Background
            ======================================== */}
            <section className="bg-zinc-950">
                {/* Content Inner - Padding Lives Here */}
                <div className="px-8 py-10">
                    {/* Lyrics Section - Hidden by default */}
                    <AnimatePresence>
                        {showLyrics && (
                            <motion.section
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mb-10 overflow-hidden"
                            >
                                <div
                                    className="p-6 rounded-lg"
                                    style={{
                                        background: `linear-gradient(180deg, ${song.theme_color}40 0%, transparent 100%)`
                                    }}
                                >
                                    <h2 className="text-2xl font-bold text-white mb-4">Lyrics</h2>
                                    <div className="text-xl font-bold text-white/70 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-4">
                                        {song.lyrics || 'No lyrics available for this song.'}
                                    </div>
                                </div>
                            </motion.section>
                        )}
                    </AnimatePresence>

                    {/* ========================================
                        RIGHT SIDEBAR LAYOUT (Spotify Style)
                    ======================================== */}
                    <div className="mt-12 px-8">
                        <div className="max-w-[1400px] mx-auto">
                            <div
                                className="grid gap-8"
                                style={{
                                    gridTemplateColumns: '1fr minmax(350px, 380px)', // Reduced column width
                                }}
                            >
                                {/* LEFT EMPTY / ARTIST AREA */}
                                <div className="min-h-[300px] pr-8"> {/* Added right padding */}
                                    {/* About the artist */}
                                    <motion.div
                                        onClick={() => setShowArtistModal(true)}
                                        className="relative overflow-hidden rounded-xl cursor-pointer group"
                                        whileHover={{ scale: 1.02 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div
                                            className="absolute inset-0 bg-cover bg-center"
                                            style={{ backgroundImage: `url(${song.artist_image})` }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                                        <div className="relative p-6 min-h-[280px] flex flex-col justify-end">
                                            <p className="text-sm text-white/70 mb-1 px-4 py-2">About the artist</p>
                                            <h3 className="text-2xl font-bold text-white mb-2">{song.artist}</h3>

                                            {song.spotify_stats && (
                                                <div className="flex items-center gap-3">
                                                    {song.spotify_stats.rank && (
                                                        <span className="px-3 py-1 bg-blue-500 rounded-full text-sm font-semibold text-white">
                                                            {song.spotify_stats.rank}
                                                        </span>
                                                    )}
                                                    <span className="text-white/80 text-sm">
                                                        {song.spotify_stats.listeners} monthly listeners
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>

                                {/* RIGHT SIDEBAR - Improved spacing */}
                                <div className="flex flex-col gap-6 pl-4"> {/* Added left padding */}
                                    {/* Credits Card */}
                                    <div className="bg-zinc-800/60 backdrop-blur rounded-xl p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-white">Credits</h3>
                                            <button
                                                onClick={() => setShowCreditsModal(true)}
                                                className="text-sm text-white/60 hover:text-white transition-colors"
                                            >
                                                Show all
                                            </button>
                                        </div>

                                        <div className="space-y-3 text-sm text-white/70">
                                            {song.credits_text?.split('\n').slice(0, 5).map((line, i) => (
                                                <p key={i} className="leading-relaxed">{line}</p>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Song Info Card */}
                                    <div className="bg-zinc-800/60 backdrop-blur rounded-xl p-6">
                                        <h3 className="text-lg font-bold text-white mb-4">Song info</h3>

                                        <div className="space-y-3 text-sm text-white/70">
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/50">Album:</span>
                                                <span>{song.album}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/50">Released:</span>
                                                <span>{song.release_date}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/50">Duration:</span>
                                                <span>{song.length}</span>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-white/10">
                                                <a
                                                    href={song.spotify_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-[#1DB954] font-semibold hover:underline transition-all hover:gap-3"
                                                >
                                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.601-1.559.301z" />
                                                    </svg>
                                                    Open in Spotify
                                                </a>
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================
                SPOTIFY-STYLE BOTTOM PLAYER BAR
            ======================================== */}
            <div
                className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-white/10"
                style={{ height: PLAYER_BAR_HEIGHT }}
            >
                <div className="h-full px-8 flex items-center justify-between max-w-[1800px] mx-auto">
                    {/* Left: Song Info */}
                    <div className="flex items-center gap-4 w-[30%] min-w-[180px]">
                        <img
                            src={song.cover_image}
                            alt={song.title}
                            className="w-14 h-14 rounded object-cover"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{song.title}</p>
                            <p className="text-xs text-white/60 truncate">{song.artist}</p>
                        </div>
                        <motion.button
                            onClick={() => setIsLiked(!isLiked)}
                            whileHover={{ scale: 1.1 }}
                            className="ml-2"
                        >
                            <Heart
                                className={clsx(
                                    'w-4 h-4',
                                    isLiked ? 'text-[#1DB954] fill-[#1DB954]' : 'text-white/60'
                                )}
                            />
                        </motion.button>
                    </div>

                    {/* Center: Controls + Progress */}
                    <div className="flex flex-col items-center gap-2 w-[40%] max-w-[720px]">
                        {/* Control Buttons */}
                        <div className="flex items-center gap-6">
                            <button className="text-white/60 hover:text-white transition-colors">
                                <Shuffle className="w-4 h-4" />
                            </button>
                            <button className="text-white/60 hover:text-white transition-colors">
                                <SkipBack className="w-5 h-5 fill-current" />
                            </button>
                            <button
                                onClick={togglePlay}
                                className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
                            >
                                {isPlaying ? (
                                    <Pause className="w-4 h-4 text-black fill-black" />
                                ) : (
                                    <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                                )}
                            </button>
                            <button className="text-white/60 hover:text-white transition-colors">
                                <SkipForward className="w-5 h-5 fill-current" />
                            </button>
                            <button className="text-white/60 hover:text-white transition-colors">
                                <Repeat className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-2 w-full">
                            <span className="text-xs text-white/60 w-10 text-right">
                                {formatTime(currentTime)}
                            </span>
                            <div
                                className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer group"
                                onClick={handleSeek}
                            >
                                <div
                                    className="h-full bg-white group-hover:bg-[#1DB954] rounded-full relative transition-colors"
                                    style={{ width: `${progress}%` }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            <span className="text-xs text-white/60 w-10">
                                {formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    {/* Right: Extra Controls */}
                    <div className="flex items-center gap-4 w-[30%] justify-end">
                        <button
                            onClick={() => setShowLyrics(!showLyrics)}
                            className={clsx(
                                'transition-colors',
                                showLyrics ? 'text-violet-400' : 'text-white/60 hover:text-white'
                            )}
                            title="Toggle Lyrics"
                        >
                            <Mic2 className="w-4 h-4" />
                        </button>
                        <button className="text-white/60 hover:text-white transition-colors">
                            <ListMusic className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-white/60" />
                            <div className="w-24 h-1 bg-white/20 rounded-full">
                                <div className="w-3/4 h-full bg-white rounded-full" />
                            </div>
                        </div>
                        <button className="text-white/60 hover:text-white transition-colors">
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ========================================
                MODALS
            ======================================== */}
            <AnimatePresence>
                {showArtistModal && song && (
                    <ArtistModal song={song} onClose={() => setShowArtistModal(false)} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCreditsModal && song && (
                    <CreditsModal song={song} onClose={() => setShowCreditsModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}

export default SongDetails;
