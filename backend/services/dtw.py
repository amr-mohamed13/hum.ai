
import numpy as np

def calculate_similarity(song_features: dict, user_features: dict) -> float:
    """Calculate similarity score between song and user input."""
    try:
        song_pitches = song_features.get('relative_pitches', [])
        user_pitches = user_features.get('relative_pitches', [])
        
        if not song_pitches or not user_pitches:
            return 0.0
        
        # Calculate tempo similarity
        song_tempo = song_features.get('tempo', 120)
        user_tempo = user_features.get('tempo', 120)
        
        tempo_diff = abs(song_tempo - user_tempo)
        tempo_similarity = max(0, 1.0 - tempo_diff / max(song_tempo, user_tempo))
        
        # Calculate pitch sequence similarity using correlation (user called this "DTW"?)
        if len(song_pitches) > 0 and len(user_pitches) > 0:
            # Simple correlation-based similarity
            min_len = min(len(song_pitches), len(user_pitches))
            song_segment = np.array(song_pitches[:min_len])
            user_segment = np.array(user_pitches[:min_len])
            
            if np.std(song_segment) > 0 and np.std(user_segment) > 0:
                pitch_corr = np.corrcoef(song_segment, user_segment)[0, 1]
                if np.isnan(pitch_corr):
                    pitch_similarity = 0
                else:
                    pitch_similarity = max(0, pitch_corr)
            else:
                pitch_similarity = 0.5
        else:
            pitch_similarity = 0
        
        # Combine scores (60% pitch similarity, 40% tempo similarity)
        similarity = (0.6 * pitch_similarity + 0.4 * tempo_similarity) * 100
        
        # Log details for debugging (as requested)
        # However, this function returns float, logging is better in matcher?
        # But user said "Add console logging for: song_name, dtw_score, confidence_ratio. Same info QTune prints."
        # QTune didn't print inside calculate_similarity.
        # I'll stick to logic here. Matcher will handle logging song names.
        
        return max(0, min(100, similarity))
    except Exception as e:
        print(f"Error calculating similarity: {e}")
        return 0.0
