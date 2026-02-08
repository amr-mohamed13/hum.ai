"""
Query by Humming - DSP Engine
=============================
This module implements the core Digital Signal Processing pipeline for melody matching.

Key Concepts:
-------------
1. **Pitch Contour (F0)**: The fundamental frequency of a sound over time. When you hum,
   your vocal cords vibrate at a specific frequency - this is F0. We use librosa's pyin
   algorithm which is robust for monophonic (single voice) pitch tracking.

2. **Key Invariance**: Different people hum in different keys. To match melodies regardless
   of the absolute pitch, we convert frequencies to MIDI note numbers and subtract the mean.
   This centers the melody around zero, preserving the *shape* of the melody (intervals)
   rather than absolute pitch.

3. **Dynamic Time Warping (DTW)**: A technique to measure similarity between two sequences
   that may vary in speed. If you hum a melody slower or faster than the original, DTW
   can still find the optimal alignment. It computes the minimum "cost" to warp one
   sequence to match another.

4. **Subsequence Matching**: The user might hum a section from the middle of a song.
   We use a sliding window approach to check all possible segments of the reference
   songs, finding the best local match.

Author: Query by Humming System
License: MIT
"""

import os
import logging
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any
from dataclasses import dataclass

import numpy as np
import librosa
from fastdtw import fastdtw
from scipy.spatial.distance import euclidean

# Configure logging for debugging DSP operations
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURATION CONSTANTS
# =============================================================================

# Audio Processing Parameters
SAMPLE_RATE = 22050          # Standard sample rate for audio analysis (Hz)
HOP_LENGTH = 512             # Samples between successive frames (~23ms at 22050 Hz)
FRAME_LENGTH = 2048          # FFT window size for spectral analysis

# Pitch Detection Parameters (for librosa.pyin)
FMIN = 65.0                  # Minimum frequency to detect (C2 - low human voice)
FMAX = 2093.0                # Maximum frequency to detect (C7 - high human voice)

# Sliding Window Parameters for Subsequence Matching
WINDOW_DURATION_SEC = 15.0   # Duration of each analysis window (seconds)
WINDOW_OVERLAP_SEC = 5.0     # Overlap between consecutive windows (seconds)

# Minimum valid pitch frames required for a meaningful comparison
MIN_VALID_FRAMES = 10


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class MatchResult:
    """
    Represents the result of a melody matching operation.
    
    Attributes:
        song_title: Name of the matched song (derived from filename)
        confidence_score: Inverse of DTW distance, normalized to 0-100 scale
        match_start_time: Timestamp (seconds) where the match begins in the song
        dtw_distance: Raw DTW distance (lower = better match)
        hum_pitch: Normalized pitch contour of the user's hum (for visualization)
        song_pitch: Normalized pitch contour of the matched segment (for visualization)
    """
    song_title: str
    confidence_score: float
    match_start_time: float
    dtw_distance: float
    hum_pitch: List[float]
    song_pitch: List[float]


# =============================================================================
# CORE DSP FUNCTIONS
# =============================================================================

def load_audio(file_path: str) -> Tuple[np.ndarray, int]:
    """
    Load an audio file and convert to mono at the target sample rate.
    
    This function handles various audio formats (MP3, WAV, WEBM, etc.) through
    librosa's audio loading capabilities. The audio is automatically:
    - Converted to mono (single channel)
    - Resampled to SAMPLE_RATE (22050 Hz)
    - Normalized to float32 in range [-1, 1]
    
    Args:
        file_path: Path to the audio file
        
    Returns:
        Tuple of (audio_samples, sample_rate)
        
    Raises:
        FileNotFoundError: If the audio file doesn't exist
        Exception: If librosa cannot decode the audio format
    """
    logger.info(f"Loading audio file: {file_path}")
    
    # librosa.load() automatically handles format conversion and resampling
    # sr=SAMPLE_RATE forces resampling, mono=True mixes stereo to mono
    audio, sr = librosa.load(file_path, sr=SAMPLE_RATE, mono=True)
    
    logger.info(f"Loaded {len(audio)/sr:.2f} seconds of audio at {sr} Hz")
    return audio, sr


def extract_pitch_contour(audio: np.ndarray, sr: int) -> np.ndarray:
    """
    Extract the fundamental frequency (F0) contour from audio using pyin algorithm.
    
    **Technical Details:**
    The pyin (Probabilistic YIN) algorithm is an enhancement of the YIN pitch
    detection algorithm. It uses:
    1. Autocorrelation to find the period of the waveform
    2. Probabilistic modeling to handle uncertain pitch estimates
    3. Hidden Markov Model for temporal smoothing
    
    The result is a sequence of F0 values in Hz, with NaN for unvoiced frames
    (silence, noise, or consonants).
    
    Args:
        audio: Audio samples as numpy array
        sr: Sample rate in Hz
        
    Returns:
        Array of F0 values in Hz, with NaN for unvoiced frames
    """
    logger.info("Extracting pitch contour using pyin algorithm...")
    
    # pyin returns: (f0, voiced_flag, voiced_probabilities)
    # We only need f0 - the fundamental frequency estimates
    f0, voiced_flag, voiced_probs = librosa.pyin(
        audio,
        fmin=FMIN,                    # Minimum expected frequency
        fmax=FMAX,                    # Maximum expected frequency
        sr=sr,                        # Sample rate
        frame_length=FRAME_LENGTH,    # FFT window size
        hop_length=HOP_LENGTH         # Hop between frames
    )
    
    # Count valid (voiced) frames for logging
    valid_frames = np.sum(~np.isnan(f0))
    logger.info(f"Extracted {len(f0)} frames, {valid_frames} voiced frames")
    
    return f0


def normalize_pitch_contour(f0: np.ndarray) -> np.ndarray:
    """
    Normalize the pitch contour for key-invariant matching.
    
    **Why This Matters:**
    When you hum "Happy Birthday", you might hum it in the key of C,
    while someone else hums it in G. The absolute frequencies are different,
    but the *melodic shape* (the pattern of ups and downs) is the same.
    
    **Normalization Steps:**
    1. Convert Hz to MIDI note numbers (logarithmic scale, 12 notes per octave)
       Formula: MIDI = 12 * log2(f0 / 440) + 69
       
    2. Remove unvoiced frames (NaN values) - these are silence/noise
    
    3. Subtract the mean MIDI value - this "centers" the melody around zero,
       preserving intervals (the distance between notes) but removing key info
    
    Args:
        f0: Raw pitch contour in Hz with NaN for unvoiced frames
        
    Returns:
        Normalized pitch contour (mean-centered MIDI note differences)
        
    Raises:
        ValueError: If there are too few valid frames for meaningful analysis
    """
    logger.info("Normalizing pitch contour for key invariance...")
    
    # Step 1: Convert frequency (Hz) to MIDI note numbers
    # librosa.hz_to_midi handles the logarithmic conversion
    # NaN values in f0 will remain NaN after conversion
    midi_notes = librosa.hz_to_midi(f0)
    
    # Step 2: Remove unvoiced frames (NaN values)
    # These represent silence, noise, or unvoiced consonants
    valid_notes = midi_notes[~np.isnan(midi_notes)]
    
    if len(valid_notes) < MIN_VALID_FRAMES:
        raise ValueError(
            f"Insufficient voiced frames ({len(valid_notes)}). "
            f"Minimum required: {MIN_VALID_FRAMES}. "
            "Please hum louder or longer."
        )
    
    # Step 3: Subtract the mean to achieve key invariance
    # After this, the melody is "centered" around zero
    # Example: [60, 62, 64, 62, 60] (C-D-E-D-C in MIDI)
    #          becomes [-2, 0, 2, 0, -2] after mean subtraction
    mean_pitch = np.mean(valid_notes)
    normalized = valid_notes - mean_pitch
    
    logger.info(
        f"Normalized {len(valid_notes)} frames. "
        f"Mean pitch: {mean_pitch:.2f} MIDI notes"
    )
    
    return normalized


def compute_dtw_distance(seq1: np.ndarray, seq2: np.ndarray) -> float:
    """
    Compute Dynamic Time Warping distance between two pitch sequences.
    
    **What is DTW?**
    DTW finds the optimal alignment between two time series that may vary
    in length or speed. It's like stretching or compressing one sequence
    to best match the other.
    
    **How it works:**
    1. Create a cost matrix where cell (i,j) is the distance between
       seq1[i] and seq2[j]
    2. Find the path through this matrix that minimizes total cost
    3. The path is constrained to move forward in both sequences
    
    **FastDTW:**
    We use FastDTW, an O(N) approximation of the O(N²) classic DTW algorithm.
    It uses a multi-resolution approach for speed while maintaining accuracy.
    
    Args:
        seq1: First normalized pitch sequence
        seq2: Second normalized pitch sequence
        
    Returns:
        DTW distance (lower = more similar)
    """
    # fastdtw returns (distance, path)
    # We only need the distance for ranking matches
    distance, _ = fastdtw(
        seq1.reshape(-1, 1),  # Reshape to column vector for fastdtw
        seq2.reshape(-1, 1),
        dist=euclidean        # Use Euclidean distance for each point pair
    )
    
    return distance


def create_sliding_windows(
    pitch_contour: np.ndarray,
    sr: int,
    window_sec: float = WINDOW_DURATION_SEC,
    overlap_sec: float = WINDOW_OVERLAP_SEC
) -> List[Tuple[np.ndarray, float]]:
    """
    Break a pitch contour into overlapping windows for subsequence matching.
    
    **Why Sliding Windows?**
    The user might hum a melody from the middle of a song. Instead of
    comparing against the entire song, we check overlapping segments.
    
    **Example:**
    For a 60-second song with 15s windows and 5s overlap:
    - Window 1: 0-15s
    - Window 2: 10-25s (starts at 10s = 15s - 5s overlap)
    - Window 3: 20-35s
    - ... and so on
    
    Args:
        pitch_contour: Normalized pitch sequence for the entire song
        sr: Sample rate (used to calculate frame timing)
        window_sec: Duration of each window in seconds
        overlap_sec: Overlap between consecutive windows in seconds
        
    Returns:
        List of (window_pitch_contour, start_time_seconds) tuples
    """
    # Convert time to frame indices
    # Each frame represents HOP_LENGTH/sr seconds
    frames_per_second = sr / HOP_LENGTH
    window_frames = int(window_sec * frames_per_second)
    step_frames = int((window_sec - overlap_sec) * frames_per_second)
    
    windows = []
    start_frame = 0
    
    while start_frame + window_frames <= len(pitch_contour):
        # Extract window
        window = pitch_contour[start_frame:start_frame + window_frames]
        
        # Calculate start time in seconds
        start_time = start_frame / frames_per_second
        
        windows.append((window, start_time))
        start_frame += step_frames
    
    # Add final partial window if there's remaining content
    if start_frame < len(pitch_contour):
        window = pitch_contour[start_frame:]
        if len(window) >= MIN_VALID_FRAMES:  # Only if meaningful length
            start_time = start_frame / frames_per_second
            windows.append((window, start_time))
    
    logger.info(f"Created {len(windows)} sliding windows for matching")
    return windows


# =============================================================================
# DATABASE MANAGEMENT
# =============================================================================

class SongDatabase:
    """
    Manages the database of reference songs for melody matching.
    
    This class handles:
    - Loading and caching pitch contours from the songs directory
    - Preprocessing songs for efficient matching
    - Organizing songs into sliding windows for subsequence matching
    
    The database is loaded lazily - songs are processed when first needed
    and cached for subsequent queries.
    """
    
    def __init__(self, songs_directory: str):
        """
        Initialize the song database.
        
        Args:
            songs_directory: Path to directory containing reference audio files
        """
        self.songs_directory = Path(songs_directory)
        self.songs_cache: Dict[str, Dict[str, Any]] = {}
        self._loaded = False
        
    def _get_song_title(self, filename: str) -> str:
        """
        Convert a filename to a human-readable song title.
        
        Example: "twinkle_twinkle_little_star.mp3" -> "Twinkle Twinkle Little Star"
        """
        # Remove file extension
        name = Path(filename).stem
        # Replace underscores and hyphens with spaces
        name = name.replace('_', ' ').replace('-', ' ')
        # Title case
        return name.title()
    
    def load_database(self) -> int:
        """
        Load and preprocess all songs in the database directory.
        
        This method:
        1. Scans the songs directory for audio files
        2. Extracts and normalizes pitch contours
        3. Creates sliding windows for subsequence matching
        4. Caches everything for fast querying
        
        Returns:
            Number of songs successfully loaded
        """
        if self._loaded:
            logger.info("Database already loaded, using cache")
            return len(self.songs_cache)
        
        logger.info(f"Loading song database from: {self.songs_directory}")
        
        # Supported audio formats
        audio_extensions = {'.mp3', '.wav', '.flac', '.ogg', '.m4a', '.webm'}
        
        loaded_count = 0
        for file_path in self.songs_directory.iterdir():
            if file_path.suffix.lower() not in audio_extensions:
                continue
                
            try:
                logger.info(f"Processing: {file_path.name}")
                
                # Load audio
                audio, sr = load_audio(str(file_path))
                
                # Extract pitch contour
                f0 = extract_pitch_contour(audio, sr)
                
                # Normalize for key invariance
                try:
                    normalized = normalize_pitch_contour(f0)
                except ValueError as e:
                    logger.warning(f"Skipping {file_path.name}: {e}")
                    continue
                
                # Create sliding windows
                windows = create_sliding_windows(normalized, sr)
                
                # Store in cache
                song_title = self._get_song_title(file_path.name)
                self.songs_cache[song_title] = {
                    'file_path': str(file_path),
                    'full_contour': normalized,
                    'windows': windows,
                    'sample_rate': sr
                }
                
                loaded_count += 1
                logger.info(f"Successfully loaded: {song_title}")
                
            except Exception as e:
                logger.error(f"Failed to process {file_path.name}: {e}")
                continue
        
        self._loaded = True
        logger.info(f"Database loaded: {loaded_count} songs")
        return loaded_count
    
    def get_all_songs(self) -> Dict[str, Dict[str, Any]]:
        """Return all cached songs."""
        if not self._loaded:
            self.load_database()
        return self.songs_cache


# =============================================================================
# MAIN MATCHING FUNCTION
# =============================================================================

def identify_melody(
    hum_audio_path: str,
    songs_directory: str,
    database: Optional[SongDatabase] = None
) -> Optional[MatchResult]:
    """
    Identify a hummed melody by matching against the song database.
    
    **The Matching Pipeline:**
    
    1. **Load & Extract**: Load the user's hum and extract its pitch contour
    
    2. **Normalize**: Convert to key-invariant representation (centered MIDI notes)
    
    3. **Compare**: Use DTW to compare against all sliding windows of all songs
    
    4. **Rank**: Find the window with the lowest DTW distance
    
    5. **Score**: Convert distance to confidence score (0-100)
    
    Args:
        hum_audio_path: Path to the user's hummed audio file
        songs_directory: Path to the reference songs directory
        database: Optional pre-loaded SongDatabase (for efficiency)
        
    Returns:
        MatchResult with match details, or None if no match found
    """
    logger.info("=" * 60)
    logger.info("MELODY IDENTIFICATION STARTED")
    logger.info("=" * 60)
    
    # Initialize or use provided database
    if database is None:
        database = SongDatabase(songs_directory)
    
    # Ensure database is loaded
    num_songs = database.load_database()
    if num_songs == 0:
        logger.warning("No songs in database!")
        return None
    
    # Step 1: Process the user's hum
    logger.info("Processing user's hum...")
    try:
        hum_audio, sr = load_audio(hum_audio_path)
        hum_f0 = extract_pitch_contour(hum_audio, sr)
        hum_normalized = normalize_pitch_contour(hum_f0)
    except Exception as e:
        logger.error(f"Failed to process hum: {e}")
        raise
    
    logger.info(f"Hum processed: {len(hum_normalized)} valid pitch frames")
    
    # Step 2: Compare against all songs and windows
    logger.info("Comparing against song database...")
    
    best_match: Optional[MatchResult] = None
    best_distance = float('inf')
    
    for song_title, song_data in database.get_all_songs().items():
        logger.info(f"Matching against: {song_title}")
        
        for window_contour, window_start_time in song_data['windows']:
            # Compute DTW distance
            distance = compute_dtw_distance(hum_normalized, window_contour)
            
            if distance < best_distance:
                best_distance = distance
                
                # Create match result
                # Normalize distance to confidence score (0-100)
                # Using a heuristic: confidence = max(0, 100 - distance/10)
                # This gives high confidence for low distances
                confidence = max(0.0, min(100.0, 100 - (distance / 50)))
                
                best_match = MatchResult(
                    song_title=song_title,
                    confidence_score=round(confidence, 2),
                    match_start_time=round(window_start_time, 2),
                    dtw_distance=round(distance, 2),
                    hum_pitch=hum_normalized.tolist(),
                    song_pitch=window_contour.tolist()
                )
                
                logger.info(
                    f"  New best match! Distance: {distance:.2f}, "
                    f"Start: {window_start_time:.2f}s"
                )
    
    if best_match:
        logger.info("=" * 60)
        logger.info(f"MATCH FOUND: {best_match.song_title}")
        logger.info(f"Confidence: {best_match.confidence_score}%")
        logger.info(f"Match starts at: {best_match.match_start_time}s")
        logger.info("=" * 60)
    else:
        logger.info("No match found")
    
    return best_match


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_available_songs(songs_directory: str) -> List[str]:
    """
    Get a list of available song titles in the database.
    
    Args:
        songs_directory: Path to the songs directory
        
    Returns:
        List of song titles
    """
    db = SongDatabase(songs_directory)
    db.load_database()
    return list(db.get_all_songs().keys())
