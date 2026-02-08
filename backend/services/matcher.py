
import json
import os
from pathlib import Path
from backend.config import RAW_DATA_DIR, SONG_DATABASE_PATH, MEDIA_ROOT
from backend.services import melody, dtw

def load_song_database() -> list:
    """Load song database from JSON file."""
    if not os.path.exists(SONG_DATABASE_PATH):
        # Create initial database
        return create_song_database()
    
    else:
        # Load existing database
        try:
            with open(SONG_DATABASE_PATH, 'r') as f:
                database = json.load(f)
                # Ensure database is a list
                if not isinstance(database, list):
                    return create_song_database()
                return database
        except:
            return create_song_database()

def create_song_database() -> list:
    """Create song database by scanning songs directory."""
    database = []
    
    # Scan RAW_DATA_DIR (data/raw_data/{song_name}/audio.mp3)
    songs_dir = RAW_DATA_DIR
    
    # Also check media/songs just in case?
    # User specifically said: "songs are in Query by Humming/data/raw_data and then each song has its own folder"
    
    print(f"Scanning for songs in: {songs_dir}")
    
    if songs_dir.exists():
        # Iterate over subdirectories (each represents a song)
        for song_folder in songs_dir.iterdir():
            if song_folder.is_dir():
                # Look for audio file in folder
                # Common formats: .mp3, .wav, .m4a
                audio_file = None
                for file in song_folder.iterdir():
                    if file.suffix.lower() in ['.mp3', '.wav', '.ogg', '.m4a', '.flac']:
                        audio_file = file
                        break
                
                if audio_file:
                    print(f"Processing {song_folder.name}...")
                    
                    try:
                        from backend.services import pitch
                        audio, sr = pitch.load_audio(str(audio_file))
                        
                        if audio is None:
                             print(f"  ✗ Could not load audio from {audio_file.name}")
                             continue

                        features = melody.extract_features(audio)
                        
                        if features and features.get('relative_pitches'):
                            # Use folder name as song name, replacing underscores
                            song_name = song_folder.name.replace('_', ' ').title()
                            
                            # Path stored as relative to RAW_DATA_DIR or absolute?
                            # Frontend needs to play it.
                            # If we store absolute path, frontend can't access it unless we mount raw_data.
                            # We should probably mount RAW_DATA_DIR in main.py as well.
                            # Or correct the path to be relative to what is mounted.
                            # For now, store relative to RAW_DATA_DIR.
                            
                            database.append({
                                'name': song_name,
                                'path': str(audio_file.relative_to(songs_dir.parent)), # data/raw_data/...
                                'tempo': features['tempo'],
                                'relative_pitches': features['relative_pitches'],
                                'pitch_count': features['pitch_count'],
                                'duration': features['duration'],
                                'onset_count': features.get('onset_count', 0)
                            })
                            print(f"  ✓ Added {song_name} to database")
                        else:
                            print(f"  ✗ Could not extract features from {song_name}")
                    
                    except Exception as e:
                        print(f"  ✗ Error processing {song_name}: {e}")
    
    # Save database
    with open(SONG_DATABASE_PATH, 'w') as f:
        json.dump(database, f, indent=2)
    
    print(f"Database created with {len(database)} songs")
    return database

def find_best_matches(user_features: dict, database: list, top_n: int = 5) -> list:
    """Find best matching songs from database."""
    matches = []
    
    # Calculate similarity for all songs
    for song in database:
        similarity = dtw.calculate_similarity(song, user_features)
        
        matches.append({
            'id': song.get('id', ''),  # specific ID for frontend
            'name': song.get('name', 'Unknown'),
            'title': song.get('title', song.get('name', 'Unknown')),
            'artist': song.get('artist', 'Unknown Artist'),
            'cover_image': song.get('cover_image'),
            'theme_color': song.get('theme_color'),
            'path': song.get('path', ''),
            'similarity': round(similarity, 1),
            'tempo': song.get('tempo', 0),
            'pitch_count': song.get('pitch_count', 0)
        })
    
    # Sort by similarity (descending because higher is better in qtune_processor.py)
    matches.sort(key=lambda x: x['similarity'], reverse=True)
    
    if matches:
        print("\n=== MATCH RESULTS ===")
        best_score = matches[0]['similarity']
        second_score = matches[1]['similarity'] if len(matches) > 1 else 0.0
        
        if second_score > 0:
            ratio = best_score / second_score
        else:
            ratio = 999.0
            
        print(f"TOP1: {matches[0]['name']} (Score: {best_score})")
        if len(matches) > 1:
            print(f"TOP2: {matches[1]['name']} (Score: {second_score})")
            print(f"RATIO: {ratio:.2f}")
        else:
            print(f"RATIO: N/A (Only 1 match)")
            
    return matches[:top_n]
