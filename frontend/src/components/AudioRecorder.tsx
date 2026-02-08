/**
 * AudioRecorder Component
 * ========================
 * A professional audio recording widget with visual feedback.
 * 
 * Features:
 * - Circular record button with pulse animation when recording
 * - Real-time audio level visualization
 * - Automatic blob handling for upload
 * 
 * Uses react-media-recorder for cross-browser audio capture.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2 } from 'lucide-react';

// Props interface for the AudioRecorder component
interface AudioRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
    isProcessing: boolean;
    disabled?: boolean;
}

/**
 * AudioRecorder - A sleek recording widget with real-time visualization
 * 
 * @param onRecordingComplete - Callback fired when recording stops, receives audio Blob
 * @param isProcessing - When true, shows processing state
 * @param disabled - Disables the recorder
 */
export function AudioRecorder({
    onRecordingComplete,
    isProcessing,
    disabled = false
}: AudioRecorderProps) {
    // State for audio level visualization
    const [audioLevel, setAudioLevel] = useState<number[]>(new Array(20).fill(5));
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    // Configure react-media-recorder
    const {
        status,
        startRecording,
        stopRecording,
    } = useReactMediaRecorder({
        audio: true,
        video: false,
        // Use WebM for better browser compatibility
        mediaRecorderOptions: {
            mimeType: 'audio/webm;codecs=opus'
        },
        onStart: () => {
            console.log('Recording started');
            startVisualization();
        },
        onStop: async (blobUrl: string) => {
            console.log('Recording stopped, blob URL:', blobUrl);
            stopVisualization();

            // Fetch the blob from the URL and pass it to the callback
            if (blobUrl) {
                try {
                    const response = await fetch(blobUrl);
                    const blob = await response.blob();
                    onRecordingComplete(blob);
                } catch (error) {
                    console.error('Failed to fetch recording blob:', error);
                }
            }
        }
    });

    // Determine if currently recording
    const isRecording = status === 'recording';

    /**
     * Start real-time audio visualization
     * Uses Web Audio API to analyze audio levels
     */
    const startVisualization = useCallback(async () => {
        try {
            // Get audio stream for visualization (separate from recorder's stream)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            // Create audio context and analyser
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);

            // Configure analyser for smooth visualization
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Start animation loop
            const updateLevels = () => {
                if (!analyserRef.current) return;

                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                // Convert to normalized levels (5-50 range for visual height)
                const levels = Array.from(dataArray.slice(0, 20)).map(
                    value => Math.max(5, Math.min(50, (value / 255) * 50))
                );
                setAudioLevel(levels);

                animationFrameRef.current = requestAnimationFrame(updateLevels);
            };

            updateLevels();
        } catch (error) {
            console.error('Failed to start visualization:', error);
        }
    }, []);

    /**
     * Stop audio visualization and clean up resources
     */
    const stopVisualization = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        analyserRef.current = null;
        setAudioLevel(new Array(20).fill(5));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopVisualization();
        };
    }, [stopVisualization]);

    /**
     * Handle record button click
     */
    const handleRecordClick = () => {
        if (disabled || isProcessing) return;

        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div className="flex flex-col items-center gap-8">
            {/* Audio Visualizer */}
            <div className="visualizer-container w-64 h-16 flex items-end justify-center gap-1">
                {audioLevel.map((level, index) => (
                    <motion.div
                        key={index}
                        className="visualizer-bar"
                        initial={{ height: 5 }}
                        animate={{
                            height: isRecording ? level : 5,
                            backgroundColor: isRecording ? '#3b82f6' : '#475569'
                        }}
                        transition={{ duration: 0.1 }}
                        style={{
                            width: 4,
                            borderRadius: 2,
                        }}
                    />
                ))}
            </div>

            {/* Record Button Container */}
            <div className="relative">
                {/* Pulse rings when recording */}
                <AnimatePresence>
                    {isRecording && (
                        <>
                            <motion.div
                                className="absolute inset-[-20px] rounded-full border-2"
                                style={{ borderColor: '#ef4444' }}
                                initial={{ scale: 1, opacity: 0.8 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: 'easeOut'
                                }}
                            />
                            <motion.div
                                className="absolute inset-[-20px] rounded-full border-2"
                                style={{ borderColor: '#ef4444' }}
                                initial={{ scale: 1, opacity: 0.8 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: 'easeOut',
                                    delay: 0.5
                                }}
                            />
                        </>
                    )}
                </AnimatePresence>

                {/* Main Record Button */}
                <motion.button
                    onClick={handleRecordClick}
                    disabled={disabled || isProcessing}
                    className={`
            record-button
            w-32 h-32 rounded-full
            flex items-center justify-center
            cursor-pointer
            transition-all duration-300
            ${isRecording
                            ? 'bg-gradient-to-br from-red-500 to-red-600'
                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                        }
            ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            shadow-xl
            border-4 border-white/20
          `}
                    whileHover={{ scale: disabled || isProcessing ? 1 : 1.05 }}
                    whileTap={{ scale: disabled || isProcessing ? 1 : 0.95 }}
                >
                    {isProcessing ? (
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                    ) : isRecording ? (
                        <Square className="w-10 h-10 text-white fill-white" />
                    ) : (
                        <Mic className="w-10 h-10 text-white" />
                    )}
                </motion.button>
            </div>

            {/* Instructions */}
            <motion.p
                className="text-slate-400 text-sm text-center max-w-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                {isProcessing
                    ? 'Analyzing your melody...'
                    : isRecording
                        ? 'Recording... Click to stop'
                        : 'Click to start recording your hum'
                }
            </motion.p>
        </div>
    );
}

export default AudioRecorder;
