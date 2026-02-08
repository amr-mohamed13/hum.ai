/**
 * Search / How it Works Page
 * ==========================
 * Main interface for Query by Humming.
 * Features:
 * - Audio Recorder with Visualizer
 * - File Upload
 * - Top 5 Match Results
 * - Audio Previews
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Upload, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { MatchResultCard } from '../components/MatchResultCard';

// API Configuration
const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000';

export function HowItWorks() {
    const [status, setStatus] = useState<'idle' | 'listening' | 'preview' | 'processing' | 'results' | 'error'>('idle');
    const [audioLevels, setAudioLevels] = useState<number[]>(Array(20).fill(8));
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [matches, setMatches] = useState<any[]>([]); // Store matches
    const [playingPreview, setPlayingPreview] = useState<string | null>(null); // path of playing song

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);

    const navigate = useNavigate();

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecording();
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
            }
        };
    }, []);

    // Start recording
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Set up audio analysis for visualizer
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            analyserRef.current.fftSize = 64;

            // Set up media recorder
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setRecordedBlob(blob);
                setStatus('preview');
                stream.getTracks().forEach(track => track.stop());
            };

            setMediaRecorder(recorder);
            recorder.start();
            setStatus('listening');
            setRecordedBlob(null); // Clear previous recording
            setMatches([]);

            // Start visualizer animation
            updateVisualizer();

            // Auto-stop after 10 seconds
            setTimeout(() => {
                if (recorder.state === 'recording') {
                    recorder.stop();
                }
            }, 10000);
        } catch (err) {
            console.error('Failed to start recording:', err);
            setStatus('error');
        }
    }, []);

    // Update visualizer
    const updateVisualizer = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const levels = Array.from({ length: 20 }, (_, i) => {
            const index = Math.floor((i / 20) * dataArray.length);
            return Math.max(8, (dataArray[index] / 255) * 80);
        });

        setAudioLevels(levels);
        animationRef.current = requestAnimationFrame(updateVisualizer);
    }, []);

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setRecordedBlob(file);
            setStatus('preview');
            setMatches([]);
        }
    };

    // Process recording (Identify)
    const identifySong = async () => {
        if (!recordedBlob) return;

        setStatus('processing');

        try {
            const formData = new FormData();
            formData.append('file', recordedBlob, (recordedBlob as File).name || 'recording.webm');

            const response = await fetch(`${API_BASE_URL}/record`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || errorData.error || 'Failed to identify song');
            }

            const data = await response.json();

            // Check if backend returned an error (e.g., no match found)
            if (data.error || !data.success) {
                console.log('Backend returned error:', data.error);
                setStatus('error');
                return;
            }

            // Success! We have a match
            if (data.matches && data.matches.length > 0) {
                setMatches(data.matches.slice(0, 5)); // Top 5 Matches requested by user
                setStatus('results');
            } else {
                setStatus('error');
            }

        } catch (err) {
            console.error('Processing failed:', err);
            setStatus('error');
        }
    };

    // Handle Preview Play
    const handlePlayPreview = (match: any) => {
        const audioPath = match.path;

        // If already playing this song, pause it
        if (playingPreview === audioPath) {
            previewAudioRef.current?.pause();
            setPlayingPreview(null);
            return;
        }

        // Play new song
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
        }

        // Use the play_song endpoint for robust serving
        const playUrl = `${API_BASE_URL}/play_song/${encodeURIComponent(audioPath)}`;
        const audio = new Audio(playUrl);

        audio.onended = () => setPlayingPreview(null);
        audio.play().catch(e => console.error("Playback failed", e));

        previewAudioRef.current = audio;
        setPlayingPreview(audioPath);
    };

    // Stop recording
    const stopRecording = useCallback(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    }, [mediaRecorder]);

    const statusText = {
        idle: 'Tap to Record',
        listening: 'Listening...',
        preview: 'Review Audio',
        processing: 'Analyzing melody...',
        results: 'Match found!',
        error: 'Could not identify song',
    };

    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full bg-zinc-900/40 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/5"
                style={{ minHeight: 'calc(100vh - 140px)' }}
            >
                {/* LEFT SECTION: Interaction / Icon */}
                <motion.div
                    layout
                    className={clsx(
                        "flex flex-col items-center justify-center p-12 transition-all duration-500 relative",
                        status === 'results' ? "w-full md:w-1/3 bg-black/20 border-r border-white/5" : "w-full"
                    )}
                >
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent opacity-50" />

                    {/* Waveform Visualizer */}
                    <div className="flex items-end justify-center gap-1.5 h-16 mb-12 relative z-10">
                        {status === 'listening' ? (
                            audioLevels.map((level, i) => (
                                <motion.div
                                    key={i}
                                    className="w-2 rounded-full bg-violet-500"
                                    style={{ height: level }}
                                    animate={{ height: level }}
                                    transition={{ duration: 0.05 }}
                                />
                            ))
                        ) : (
                            <div className="h-16" />
                        )}
                    </div>

                    {/* Mic / Status Icon */}
                    {/* Mic / Status Icon - Restored Static */}
                    <motion.div
                        layout
                        className={clsx(
                            'rounded-full flex items-center justify-center relative cursor-pointer transition-all duration-500',
                            status === 'results' ? "w-32 h-32 mb-6" : "w-56 h-56 mb-12",
                            status === 'listening' && 'bg-violet-500/20 shadow-[0_0_60px_rgba(139,92,246,0.3)]',
                            status === 'processing' && 'bg-amber-500/20 shadow-[0_0_60px_rgba(245,158,11,0.3)]',
                            status === 'results' && 'bg-emerald-500/20 shadow-[0_0_60px_rgba(16,185,129,0.3)]',
                            status === 'error' && 'bg-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.3)]',
                            status === 'idle' && 'bg-zinc-800/50 hover:bg-zinc-700/50'
                        )}
                        onClick={() => status === 'idle' && startRecording()}
                    >
                        <Mic
                            className={clsx(
                                'transition-colors duration-300',
                                status === 'results' ? "w-12 h-12" : "w-24 h-24",
                                status === 'listening' ? 'text-violet-400' :
                                    status === 'processing' ? 'text-amber-400' :
                                        status === 'results' ? 'text-emerald-400' :
                                            status === 'error' ? 'text-red-400' :
                                                'text-white/80'
                            )}
                            strokeWidth={1.5}
                        />
                    </motion.div>

                    {/* Status Text */}
                    <motion.h2
                        layout
                        className="text-3xl font-bold text-white mb-3 text-center tracking-tight"
                    >
                        {statusText[status]}
                    </motion.h2>

                    {/* Subtext / Controls */}
                    {status === 'idle' && (
                        <div className="flex flex-col gap-6 w-full items-center animate-fade-in relative z-10">
                            <p className="text-white/50 text-center text-lg">
                                Hum a melody to search
                            </p>

                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    accept="audio/*"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all text-sm font-medium tracking-wide border border-white/5 hover:border-white/10"
                                >
                                    <Upload size={16} />
                                    Upload File
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Preview Controls */}
                    {status === 'preview' && recordedBlob && (
                        <div className="flex flex-col gap-4 items-center w-full animate-fade-in relative z-10">
                            <p className="text-white/60 text-sm mb-2 text-center max-w-[200px] truncate">
                                {(recordedBlob as File).name || 'Recorded Audio'}
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        setRecordedBlob(null);
                                        setStatus('idle');
                                    }}
                                    className="px-6 py-2.5 rounded-full bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={identifySong}
                                    className="px-8 py-2.5 rounded-full bg-violet-600 text-white text-sm font-bold hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/30"
                                >
                                    Identify Result
                                </button>
                            </div>
                        </div>
                    )}

                    {status === 'listening' && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={stopRecording}
                            className="mt-6 px-8 py-3 bg-red-500 hover:bg-red-600 rounded-full text-white text-sm font-bold transition-colors shadow-lg shadow-red-500/20"
                        >
                            Stop Recording
                        </motion.button>
                    )}

                    {/* Error Actions */}
                    {status === 'error' && (
                        <div className="flex gap-4 mt-6 animate-fade-in relative z-10">
                            <button
                                onClick={() => {
                                    setStatus('idle');
                                    setRecordedBlob(null);
                                }}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                            >
                                <RotateCcw size={16} />
                                Try Again
                            </button>
                        </div>
                    )}

                </motion.div>

                {/* RIGHT SECTION: Results List */}
                <AnimatePresence>
                    {status === 'results' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ delay: 0.2 }}
                            className="w-full md:w-2/3 p-10 bg-zinc-950/50 backdrop-blur-sm overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-bold text-white">Top 5 Matches</h3>
                                <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Confidence</span>
                            </div>

                            <div className="flex flex-col gap-4">
                                {matches.map((match, index) => (
                                    <MatchResultCard
                                        key={match.id}
                                        match={match}
                                        rank={index + 1}
                                        isPlaying={playingPreview === match.path}
                                        onPlay={() => handlePlayPreview(match)}
                                        onClick={() => navigate(`/song/${encodeURIComponent(match.id)}`)}
                                    />
                                ))}
                            </div>

                            <div className="mt-10 pt-8 border-t border-white/5 text-center">
                                <p className="text-white/40 text-sm mb-4">Not what you were looking for?</p>
                                <button
                                    onClick={() => {
                                        setStatus('idle');
                                        setRecordedBlob(null);
                                    }}
                                    className="flex items-center gap-2 mx-auto text-violet-400 hover:text-white text-sm font-medium transition-colors"
                                >
                                    <RotateCcw size={14} />
                                    Try humming again
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

export default HowItWorks;
