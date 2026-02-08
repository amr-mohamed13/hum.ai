
import json
import os
import sys
from pathlib import Path

# Setup paths to import backend modules
# Assuming run from root
sys.path.append(os.getcwd())

from backend.config import RAW_DATA_DIR, SONG_DATABASE_PATH, BASE_DIR
from backend.services import pitch, melody

def build_database():
    """Build song database from frontend/src/data/songs.json and raw_data."""
    
    # Path to frontend songs.json
    # BASE_DIR is backend/
    frontend_songs_path = BASE_DIR.parent / "frontend" / "src" / "data" / "songs.json"
    
    if not frontend_songs_path.exists():
        print(f"Error: Could not find songs.json at {frontend_songs_path}")
        return

    print(f"Loading song metadata from: {frontend_songs_path}")
    
    try:
        with open(frontend_songs_path, 'r', encoding='utf-8') as f:
            songs_metadata = json.load(f)
    except Exception as e:
        print(f"Error reading songs.json: {e}")
        return

    database = []
    
    print(f"Processing {len(songs_metadata)} songs...")
    print(f"Reading audio from: {RAW_DATA_DIR}")

    for song in songs_metadata:
        song_id = song.get('id')
        title = song.get('title')
        
        # Look for audio file in raw_data/{id}/audio.mp3 (or other formats)
        song_folder = RAW_DATA_DIR / song_id
        
        if not song_folder.exists():
            print(f"  Warning: Folder does not exist for '{title}' (ID: {song_id})")
            continue
            
        audio_file = None
        # Prioritize audio.mp3, then check others
        if (song_folder / "audio.mp3").exists():
            audio_file = song_folder / "audio.mp3"
        else:
             # Scan
             for f in song_folder.iterdir():
                 if f.suffix.lower() in ['.mp3', '.wav', '.ogg', '.m4a', '.flac']:
                     audio_file = f
                     break
        
        if not audio_file:
            print(f"  Warning: No audio file found for '{title}' in {song_folder}")
            continue
            
        print(f"  Processing '{title}' ({audio_file.name})...")
        
        try:
            # Load audio
            audio, sr = pitch.load_audio(str(audio_file))
            
            if audio is None:
                print(f"    Failed to load audio.")
                continue
                
            # Extract features
            features = melody.extract_features(audio)
            
            if features and features.get('relative_pitches'):
                # Build database entry
                # Include ID and metadata from songs.json to link them
                entry = {
                    'id': song_id,
                    'title': title, # Use title from json
                    'artist': song.get('artist'),
                    'name': title, # For compatibility with matcher.py which uses 'name'
                    # Store path relative to RAW_DATA_DIR parent (data/raw_data/...)
                    # or just use the ID to find it? Matcher uses path for logging.
                    # Frontend uses /data/raw_data/...
                    'path': f"data/raw_data/{song_id}/{audio_file.name}", 
                    'tempo': features['tempo'],
                    'relative_pitches': features['relative_pitches'],
                    'pitch_count': features['pitch_count'],
                    'duration': features['duration'],
                    'onset_count': features.get('onset_count', 0),
                    # Copy other metadata just in case backend needs it later
                    'cover_image': song.get('cover_image'),
                    'artist_image': song.get('artist_image'),
                    'theme_color': song.get('theme_color')
                }
                
                database.append(entry)
                print(f"    [+] Success. {features['pitch_count']} pitches.")
            else:
                print(f"    Failed to extract features.")
                
        except Exception as e:
            print(f"    Error processing: {e}")

    # Save database
    print(f"\nSaving database with {len(database)} songs to {SONG_DATABASE_PATH}...")
    with open(SONG_DATABASE_PATH, 'w', encoding='utf-8') as f:
        json.dump(database, f, indent=2)
        
    print("Done!")

if __name__ == "__main__":
    build_database()
