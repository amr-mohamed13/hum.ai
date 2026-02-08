/**
 * RecordingModal Component
 * =========================
 * Full-screen modal with backdrop blur for recording.
 * Features waveform visualizer and listening status.
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { MatchResultCard } from '../MatchResultCard';

interface RecordingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRecordingStateChange?: (recording: boolean) => void;
}

// API Configuration
const API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:8000';

export function RecordingModal({ isOpen, onClose, onRecordingStateChange }: RecordingModalProps) {
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
            onRecordingStateChange?.(true);

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
    }, [onRecordingStateChange]);

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
        onRecordingStateChange?.(false);

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
                setMatches(data.matches.slice(0, 3)); // Top 3
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

        // Create new audio if needed (or reuse ref)
        // Backend path: /songs/Title_audio.mp3
        // If backend serves as /media, we might need to adjust.
        // Assuming path returned by backend is relative to MEDIA_ROOT and served at /media/ or /play_song/

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
        onRecordingStateChange?.(false);
    }, [mediaRecorder, onRecordingStateChange]);

    // Handle close
    const handleClose = useCallback(() => {
        stopRecording();
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            setPlayingPreview(null);
        }
        setStatus('idle');
        setRecordedBlob(null);
        setMatches([]);
        onClose();
    }, [stopRecording, onClose]);

    const statusText = {
        idle: 'Tap to Record or Upload',
        listening: 'Listening...',
        preview: 'Review Audio',
        processing: 'Analyzing melody...',
        results: 'Match found!',
        error: 'Could not identify song',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={handleClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        layout
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1, width: status === 'results' ? '900px' : '480px' }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative z-10 bg-zinc-900/40 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/5"
                        style={{ maxHeight: '85vh' }}
                    >
                        {/* Close Button */}
                        <motion.button
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200"
                        >
                            <X className="w-5 h-5 text-white" strokeWidth={1.5} />
                        </motion.button>

                        {/* LEFT SECTION: Interaction / Icon */}
                        <motion.div
                            layout
                            className={clsx(
                                "flex flex-col items-center justify-center p-8 transition-all duration-500",
                                status === 'results' ? "w-full md:w-1/3 bg-black/20" : "w-full"
                            )}
                        >
                            {/* Waveform Visualizer (Only when listening) */}
                            <div className="flex items-end justify-center gap-1 h-12 mb-8">
                                {status === 'listening' ? (
                                    audioLevels.map((level, i) => (
                                        <motion.div
                                            key={i}
                                            className="w-1.5 rounded-full bg-violet-500"
                                            style={{ height: level }}
                                            animate={{ height: level }}
                                            transition={{ duration: 0.05 }}
                                        />
                                    ))
                                ) : (
                                    <div className="h-12" />
                                )}
                            </div>

                            {/* Mic / Status Icon */}
                            <motion.div
                                layout
                                className={clsx(
                                    'rounded-full flex items-center justify-center relative cursor-pointer transition-all duration-500',
                                    status === 'results' ? "w-24 h-24 mb-4" : "w-40 h-40 md:w-48 md:h-48 mb-8",
                                    status === 'listening' && 'bg-violet-500/20 shadow-[0_0_40px_rgba(139,92,246,0.3)]',
                                    status === 'processing' && 'bg-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.3)]',
                                    status === 'results' && 'bg-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.3)]',
                                    status === 'error' && 'bg-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.3)]',
                                    status === 'idle' && 'bg-zinc-800/50 hover:bg-zinc-700/50'
                                )}
                                animate={status === 'listening' ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                                onClick={() => status === 'idle' && startRecording()}
                            >
                                <Mic
                                    className={clsx(
                                        'transition-colors duration-300',
                                        status === 'results' ? "w-10 h-10" : "w-16 h-16 md:w-20 md:h-20",
                                        status === 'listening' ? 'text-violet-400' :
                                            status === 'processing' ? 'text-amber-400' :
                                                status === 'results' ? 'text-emerald-400' :
                                                    status === 'error' ? 'text-red-400' :
                                                        'text-zinc-500'
                                    )}
                                    strokeWidth={2}
                                />
                            </motion.div>

                            {/* Status Text */}
                            <motion.h2
                                layout
                                className="text-2xl font-bold text-white mb-2 text-center"
                            >
                                {statusText[status]}
                            </motion.h2>

                            {/* Subtext / Controls */}
                            {status === 'idle' && (
                                <div className="flex flex-col gap-4 w-full items-center animate-fade-in">
                                    <p className="text-white/50 text-center text-sm">
                                        Hum a melody or upload an audio file
                                    </p>
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-violet-400 hover:text-violet-300 text-sm font-semibold uppercase tracking-wider transition-colors hover:underline decoration-2 underline-offset-4"
                                    >
                                        Upload Audio File
                                    </button>
                                </div>
                            )}

                            {/* Preview Controls */}
                            {status === 'preview' && recordedBlob && (
                                <div className="flex flex-col gap-4 items-center w-full animate-fade-in">
                                    <p className="text-white/60 text-xs mb-2 text-center max-w-[200px] truncate">
                                        {(recordedBlob as File).name || 'Recorded Audio'}
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setRecordedBlob(null);
                                                setStatus('idle');
                                            }}
                                            className="px-4 py-2 rounded-full bg-zinc-700 text-white text-sm font-medium hover:bg-zinc-600 transition-colors"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            onClick={identifySong}
                                            className="px-6 py-2 rounded-full bg-violet-600 text-white text-sm font-bold hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/30"
                                        >
                                            Identify
                                        </button>
                                    </div>
                                </div>
                            )}

                            {status === 'listening' && (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={stopRecording}
                                    className="mt-4 px-6 py-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white text-sm font-semibold transition-colors"
                                >
                                    Stop
                                </motion.button>
                            )}

                            {/* Error Actions */}
                            {status === 'error' && (
                                <div className="flex gap-3 mt-4 animate-fade-in">
                                    <button
                                        onClick={() => {
                                            setStatus('idle');
                                            setRecordedBlob(null);
                                        }}
                                        className="px-4 py-2 rounded-full bg-zinc-700 text-white text-sm"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => {
                                            setStatus('idle');
                                            startRecording();
                                        }}
                                        className="px-6 py-2 rounded-full bg-violet-600 text-white text-sm font-bold"
                                    >
                                        Retry
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
                                    className="w-full md:w-2/3 p-8 bg-zinc-900 overflow-y-auto"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-white">Top Results</h3>
                                        <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Confidence</span>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {matches.map((match, index) => (
                                            <MatchResultCard
                                                key={match.id}
                                                match={match}
                                                rank={index + 1}
                                                isPlaying={playingPreview === match.path}
                                                onPlay={() => handlePlayPreview(match)}
                                                onClick={() => {
                                                    onClose();
                                                    navigate(`/song/${encodeURIComponent(match.id)}`);
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-white/5 text-center">
                                        <p className="text-white/40 text-sm mb-4">Not the song you were looking for?</p>
                                        <button
                                            onClick={() => {
                                                setStatus('idle');
                                                setRecordedBlob(null);
                                            }}
                                            className="text-violet-400 hover:text-white text-sm font-medium transition-colors"
                                        >
                                            Try humming again
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default RecordingModal;
