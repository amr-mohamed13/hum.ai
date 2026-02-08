"""
Query by Humming - Index Builder (Production-Grade)
===================================================
Extracts vocals using Demucs, then builds pitch index.

Usage:
    python build_index.py

Requires:
    - demucs (pip install demucs)
    - Audio files in ../data/raw_data/{song_id}/audio.mp3
"""

import os
import subprocess
import numpy as np
import librosa
from scipy.signal import medfilt
import shutil

RAW_DATA_DIR = "../data/raw_data"
INDEX_DIR = "index"
VOCALS_DIR = "vocals_cache"

# Create directories
os.makedirs(INDEX_DIR, exist_ok=True)
os.makedirs(VOCALS_DIR, exist_ok=True)


def separate_vocals(audio_path, song_id):
    """
    Use Demucs to extract vocals from a song.
    Returns path to vocals.wav
    """
    vocals_output = os.path.join(VOCALS_DIR, f"{song_id}_vocals.wav")
    
    # Skip if already separated
    if os.path.exists(vocals_output):
        print(f"   [CACHE] Using cached vocals")
        return vocals_output
    
    print(f"   [DEMUCS] Separating vocals...")
    
    try:
        # Run demucs (htdemucs is the default model)
        result = subprocess.run([
            "python", "-m", "demucs", 
            "--two-stems", "vocals",  # Only separate vocals vs other
            "-o", VOCALS_DIR,
            audio_path
        ], capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            print(f"   [ERROR] Demucs failed: {result.stderr}")
            return None
        
        # Find the output (demucs creates subfolders)
        # Output is in: vocals_cache/htdemucs/{audio_name}/vocals.wav
        audio_name = os.path.splitext(os.path.basename(audio_path))[0]
        demucs_output = os.path.join(VOCALS_DIR, "htdemucs", audio_name, "vocals.wav")
        
        if os.path.exists(demucs_output):
            # Copy to our cache location
            shutil.copy(demucs_output, vocals_output)
            print(f"   [OK] Vocals extracted")
            return vocals_output
        else:
            print(f"   [ERROR] Vocals file not found at {demucs_output}")
            return None
            
    except subprocess.TimeoutExpired:
        print(f"   [ERROR] Demucs timed out")
        return None
    except Exception as e:
        print(f"   [ERROR] Demucs exception: {e}")
        return None


def extract_pitch_from_vocals(vocals_path, sr=22050):
    """
    Extract clean pitch from vocals with full preprocessing.
    """
    try:
        # Load vocals
        y, sr = librosa.load(vocals_path, sr=sr, mono=True)
        
        # Extract pitch using pYIN
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y,
            fmin=librosa.note_to_hz('C2'),
            fmax=librosa.note_to_hz('C7')
        )
        
        # Keep only voiced frames
        valid_mask = ~np.isnan(f0)
        f0_clean = f0[valid_mask]
        
        if len(f0_clean) < 50:
            print(f"   [SKIP] Too short ({len(f0_clean)} frames)")
            return None
        
        # Median filter
        f0_clean = medfilt(f0_clean, kernel_size=5)
        
        # Convert to MIDI
        midi = librosa.hz_to_midi(f0_clean)
        
        # Remove outliers
        p5 = np.percentile(midi, 5)
        p95 = np.percentile(midi, 95)
        midi = np.clip(midi, p5, p95)
        
        # Zero-center
        midi = midi - np.mean(midi)
        
        return midi
        
    except Exception as e:
        print(f"   [ERROR] Pitch extraction failed: {e}")
        return None


def build_index():
    print("=" * 60)
    print("BUILDING SEARCH INDEX (Production-Grade)")
    print("=" * 60)
    print("\nStep 1: Vocal Separation (Demucs)")
    print("Step 2: Pitch Extraction (pYIN)")
    print("Step 3: Preprocessing (filter, normalize)")
    print("=" * 60)
    
    successful = 0
    failed = []
    
    songs = sorted(os.listdir(RAW_DATA_DIR))
    
    for i, song_id in enumerate(songs):
        song_folder = os.path.join(RAW_DATA_DIR, song_id)
        
        if not os.path.isdir(song_folder):
            continue
        
        audio_path = os.path.join(song_folder, "audio.mp3")
        
        if not os.path.exists(audio_path):
            print(f"\n[{i+1}/{len(songs)}] {song_id}")
            print(f"   [ERROR] No audio.mp3 found")
            failed.append(song_id)
            continue
        
        print(f"\n[{i+1}/{len(songs)}] {song_id}")
        
        # Step 1: Separate vocals
        vocals_path = separate_vocals(audio_path, song_id)
        
        if vocals_path is None:
            # Fallback: use original audio (not ideal but better than nothing)
            print(f"   [FALLBACK] Using original audio (not vocals)")
            vocals_path = audio_path
        
        # Step 2-3: Extract and preprocess pitch
        midi = extract_pitch_from_vocals(vocals_path)
        
        if midi is None:
            failed.append(song_id)
            continue
        
        # Step 4: Save index
        save_path = os.path.join(INDEX_DIR, f"{song_id}.npy")
        np.save(save_path, midi)
        print(f"   [SAVED] {len(midi)} MIDI frames")
        successful += 1
    
    print("\n" + "=" * 60)
    print("BUILD COMPLETE")
    print("=" * 60)
    print(f"\n[OK] Indexed: {successful} songs")
    if failed:
        print(f"[FAILED] {len(failed)}: {', '.join(failed)}")


if __name__ == "__main__":
    build_index()
