"""
Query by Humming - DSP Utilities (Production-Grade)
===================================================
Robust pitch extraction with:
1. Voiced filtering
2. Median smoothing  
3. Outlier removal
4. Interval representation
"""

import librosa
import numpy as np
from scipy.signal import medfilt


def extract_pitch(file_path, sr=22050):
    """
    Extract clean pitch track from audio.
    For best results, use isolated vocals (not full mix).
    """
    try:
        print(f"   [DEBUG] Processing: {file_path}")
        # 1. Load audio
        y, sr = librosa.load(file_path, sr=sr, mono=True)
        
        # Silence check
        rms = librosa.feature.rms(y=y)
        if np.mean(rms) < 0.003:
            print("   [WARN] Audio too quiet")
            return None

        # 2. Extract pitch using pYIN
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y, 
            fmin=librosa.note_to_hz('C2'), 
            fmax=librosa.note_to_hz('C7')
        )
        
        # 3. Keep ONLY voiced frames (remove NaNs)
        valid_mask = ~np.isnan(f0)
        f0_clean = f0[valid_mask]
        
        if len(f0_clean) < 15:
            print(f"   [WARN] Melody too short ({len(f0_clean)} frames)")
            return None
        
        # 4. Median filter (removes jitter + vibrato)
        kernel_size = min(5, len(f0_clean) if len(f0_clean) % 2 == 1 else len(f0_clean) - 1)
        if kernel_size >= 3:
            f0_clean = medfilt(f0_clean, kernel_size=kernel_size)
        
        # 5. Convert to MIDI
        midi = librosa.hz_to_midi(f0_clean)
        
        # 6. Remove outliers (octave errors)
        p5 = np.percentile(midi, 5)
        p95 = np.percentile(midi, 95)
        midi = np.clip(midi, p5, p95)
        
        # 7. Zero-center
        midi = midi - np.mean(midi)
        
        print(f"   [OK] Extracted {len(midi)} MIDI frames")
        return midi
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None


def normalize_to_intervals(pitch_midi):
    """
    Convert MIDI pitch sequence to INTERVAL sequence.
    This is KEY-INVARIANT and handles octave jumps!
    
    Input:  [60, 62, 64, 65, 64]  (MIDI notes)
    Output: [+2, +2, +1, -1]       (intervals)
    """
    if len(pitch_midi) < 2:
        return np.array([])
    
    # Compute intervals (differences)
    intervals = np.diff(pitch_midi)
    
    # Quantize to semitones (round)
    intervals = np.round(intervals)
    
    # Clip extreme jumps (likely errors)
    intervals = np.clip(intervals, -7, 7)
    
    return intervals


def compute_dtw_distance(seq1, seq2):
    """
    DTW with L1 distance, normalized by path length.
    """
    from fastdtw import fastdtw
    
    seq1_2d = seq1.reshape(-1, 1)
    seq2_2d = seq2.reshape(-1, 1)
    
    # L1 distance
    distance, path = fastdtw(seq1_2d, seq2_2d, dist=lambda a, b: abs(a - b))
    
    # Normalize by path length
    normalized = distance / (len(path) + 1)
    
    return normalized, len(path)
