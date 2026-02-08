
import numpy as np
import math
from math import log2
from backend.services import pitch
from backend.config import SAMPLE_RATE

def _get_note_number(pitch_val: float) -> int:
    """Return the number of the note based on its frequency value."""
    if pitch_val <= 0:
        return 0
    n = 12 * log2(pitch_val/440) + 49
    if 1 <= n <= 88:
        return round(n)
    return 0

def _pitches_per_interval(audio_length, pitch_values: list, onsets: list) -> list:
    """Calculate the number of pitches contained between two consecutive onsets."""
    num_of_pitches = []
    total_frames = len(pitch_values)
    duration = audio_length / SAMPLE_RATE
    
    for onset_time in onsets:
        frame_idx = int((onset_time / duration) * total_frames)
        num_of_pitches.append(frame_idx)
    
    num_of_pitches.append(total_frames)
    return num_of_pitches

def _average_per_interval(pitch_values: list, pitches_per_interval: list, onsets: list) -> list:
    """Calculate the average of pitches contained between two consecutive onsets."""
    avg_per_interval = []
    # Note: Using len(onsets) - 1 logic from original code?
    # Original: for i in range(len(onsets) - 1):
    # But num_of_pitches has len(onsets) + 1 elements?
    # pitches_per_interval[i] and [i+1].
    # Let's verify original logic.
    # original: for i in range(len(onsets) - 1):
    # pitches_per_interval length is len(onsets) + 1. So range goes to len - 2.
    # Wait. len(onsets) is N. pitches_per_interval is N+1.
    # range(len(onsets)-1) -> 0 to N-2.
    # accessing i+1 -> N-1.
    # This leaves the LAST interval unused?
    # Let's check original code carefully.
    # Line 147: range(len(onsets) - 1).
    # Line 168 (log_ioi): range(len(onsets) - 1).
    # This seems intentional in original code to ignore the last segment or something?
    # "Preserve ALL signal processing logic exactly."
    
    for i in range(len(onsets) - 1):
        start_idx = pitches_per_interval[i]
        end_idx = pitches_per_interval[i + 1]
        
        if end_idx > start_idx:
            segment = pitch_values[start_idx:end_idx]
            # pitch_values is np.array, segment is np.array
            valid_pitches = segment[segment > 0]
            
            if len(valid_pitches) > 0:
                avg_pitch = np.mean(valid_pitches)
                note_num = _get_note_number(avg_pitch)
            else:
                note_num = 0
        else:
            note_num = 0
        
        avg_per_interval.append(note_num)
    
    return avg_per_interval

def _find_relative_pitch(avg_pitch_values: list) -> list:
    """Create and return an array of relative pitch changes."""
    pitch_change = 0
    result = []
    
    for i in range(len(avg_pitch_values) - 1):
        pitch_change = -1 * (avg_pitch_values[i] - avg_pitch_values[i + 1])
        if pitch_change == 0 or abs(pitch_change) >= 22:
            continue
        result.append(pitch_change)
    
    return result

def extract_features(audio):
    """Extract all features from audio."""
    try:
        # Detect tempo
        tempo = pitch.detect_bpm(audio)
        
        # Extract pitches
        pitch_times, pitch_values, pitch_confidence = pitch.extract_pitches(audio)
        
        # Detect onsets
        onsets = pitch.detect_onsets(audio)
        
        # Calculate features
        num_of_pitches = _pitches_per_interval(len(audio), pitch_values, onsets)
        avg_pitches = _average_per_interval(pitch_values, num_of_pitches, onsets)
        
        # Only proceed if we have enough data
        if len(avg_pitches) > 1:
            relative_pitches = _find_relative_pitch(avg_pitches)
        else:
            relative_pitches = []
        
        return {
            'tempo': float(tempo),
            'relative_pitches': relative_pitches,
            'pitch_count': len(relative_pitches),
            'duration': len(audio) / SAMPLE_RATE,
            'onset_count': len(onsets)
        }
    except Exception as e:
        print(f"Error extracting features: {e}")
        return None
