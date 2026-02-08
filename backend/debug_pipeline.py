"""
QBH Debug Pipeline
==================
Run this script to debug why a specific hum isn't matching a song.

Usage:
    python debug_pipeline.py [hum_file] [song_name]

Example:
    python debug_pipeline.py last_upload.wav "Counting stars"

If no arguments provided:
    Defaults to 'last_upload.wav' and 'Counting stars'
"""

import sys
import os
import librosa
import numpy as np
import scipy.signal
# Fix for fastdtw: use scipy's euclidean if not provided
from scipy.spatial.distance import euclidean
try:
    from fastdtw import fastdtw
except ImportError:
    print("Please install fastdtw: pip install fastdtw")
    sys.exit(1)

try:
    import matplotlib.pyplot as plt
except ImportError:
    print("Please install matplotlib: pip install matplotlib")
    sys.exit(1)

# ---------------------------
# CONFIG
# ---------------------------
SR = 22050
FMIN = librosa.note_to_hz("C2")
FMAX = librosa.note_to_hz("C6")

def extract_melody_debug(audio_path, name="Audio"):
    print(f"\n--- Analyzing: {name} ---")
    if not os.path.exists(audio_path):
        print(f" [X] File not found: {audio_path}")
        return None, None

    y, sr = librosa.load(audio_path, sr=SR)

    # pYIN
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=FMIN,
        fmax=FMAX,
        sr=sr
    )

    # TEST 2: Voiced Ratio
    total_frames = len(f0)
    voiced_frames = np.sum(~np.isnan(f0))
    voiced_ratio = voiced_frames / total_frames if total_frames > 0 else 0
    
    print(f"   [TEST 2] Voiced Ratio: {voiced_ratio:.2f}")
    if "HUM" in name:
        if voiced_ratio < 0.7:
             print("      [WARN] Hum should be > 0.7. Try humming clearer/louder.")
        else:
             print("      [OK] Ratio Good")
    else:
        if voiced_ratio < 0.3:
             print("      [WARN] Vocals < 0.3. pYIN might be failing.")
        else:
             print("      [OK] Using clean vocals")

    # Keep voiced frames only
    f0_clean = f0[~np.isnan(f0)]
    if len(f0_clean) < 20:
        print(" [X] Melody too short (less than 20 frames)")
        return None, None

    # Smooth
    f0_clean = scipy.signal.medfilt(f0_clean, kernel_size=5)

    # Convert to MIDI
    midi = librosa.hz_to_midi(f0_clean)

    # Remove octave outliers
    p10 = np.percentile(midi, 10)
    p90 = np.percentile(midi, 90)
    midi_clipped = np.clip(midi, p10, p90)
    
    # Zero center
    midi_centered = midi_clipped - np.mean(midi_clipped)

    # Convert to intervals
    intervals = np.diff(midi_clipped)
    
    # TEST 3: Interval Sanity Check
    abs_intervals = np.abs(intervals)
    p50 = np.percentile(abs_intervals, 50)
    p90 = np.percentile(abs_intervals, 90)
    p99 = np.percentile(abs_intervals, 99)
    
    print(f"   [TEST 3] Intervals | p50: {p50:.1f} | p90: {p90:.1f} | p99: {p99:.1f}")
    if p99 > 12:
        print("      [WARN] Large interval jumps detected (Octave errors?)")
    else:
        print("      [OK] Intervals look melodic")

    # Normalize intervals
    intervals = intervals - np.mean(intervals)

    return midi_centered, intervals


def run_debug(hum_path, song_path):
    print("="*60)
    print(f"DEBUG PIPELINE")
    print(f"Hum:  {hum_path}")
    print(f"Song: {song_path}")
    print("="*60)

    # Extract
    hum_midi, hum_intervals = extract_melody_debug(hum_path, "HUM")
    song_midi, song_intervals = extract_melody_debug(song_path, "SONG VOCALS")

    if hum_midi is None or song_midi is None:
        print("\n [X] Aborting: Pitch extraction failed.")
        return

    # TEST 1: Plot pitch of HUM vs VOCALS
    print(f"\n[TEST 1] Plotting pitch contours...")
    plt.figure(figsize=(12, 6))
    
    plt.subplot(2, 1, 1)
    plt.title("Pitch Contour (Normalized MIDI)")
    plt.plot(hum_midi, label="HUM", alpha=0.8)
    plt.plot(song_midi, label="SONG (Vocals)", alpha=0.5)
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    plt.subplot(2, 1, 2)
    plt.title("Interval Sequence")
    plt.plot(hum_intervals, label="HUM Intervals", color='green', alpha=0.8)
    plt.plot(song_intervals, label="SONG Intervals", color='orange', alpha=0.5)
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    print("   [OK] Graph generated. Close the window to continue...")
    plt.tight_layout()
    plt.show()

    # Run DTW
    print("\n[TEST 4] Running DTW Matching...")
    
    def match_hum_to_song(hum, song, hop=20):
        window = len(hum) * 2  # Search window size
        if window > len(song):
             window = len(song)
        
        best = np.inf
        
        print(f"   Scanning {len(song)} frames with window size {window}...")
        
        for i in range(0, len(song) - window + 1, hop):
            seg = song[i:i+window]
            
            hum_2d = hum.reshape(-1, 1)
            seg_2d = seg.reshape(-1, 1)
        
            dist, path = fastdtw(hum_2d, seg_2d, dist=euclidean)
            score = dist / (len(path) + 1)
            
            best = min(best, score)

        return best

    score = match_hum_to_song(hum_intervals, song_intervals)
    print(f"\n>> DTW SCORE: {score:.4f}")
    
    if score < 1.0:
         print("   [MATCH] Score < 1.0")
    else:
         print("   [NO MATCH] Score > 1.0")


if __name__ == "__main__":
    # Defaults
    default_hum = "last_upload.wav"
    default_song = "Counting stars"
    
    hum_file = sys.argv[1] if len(sys.argv) > 1 else default_hum
    song_query = sys.argv[2] if len(sys.argv) > 2 else default_song
    
    # Find song file in vocals_cache
    vocals_dir = "vocals_cache"
    song_file = None
    
    if os.path.exists(song_query):
        song_file = song_query
    else:
        # Search in cache
        if os.path.exists(vocals_dir):
            for f in os.listdir(vocals_dir):
                if song_query.lower() in f.lower() and f.endswith(".wav"):
                    song_file = os.path.join(vocals_dir, f)
                    break
    
    if not song_file:
        print(f"❌ Could not find vocal track for '{song_query}'")
        print(f"   Checked local path and {vocals_dir}/")
        sys.exit(1)
        
    run_debug(hum_file, song_file)
