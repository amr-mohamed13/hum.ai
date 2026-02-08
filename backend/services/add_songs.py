
import json
import os
import sys
from pathlib import Path

# Setup paths to import backend modules
sys.path.append(os.getcwd())

from backend.config import RAW_DATA_DIR, SONG_DATABASE_PATH, BASE_DIR
from backend.services import pitch, melody

def add_new_songs():
    """
    Incrementally add new songs from data/raw_data to the databases.
    Does NOT rebuild the entire database; only adds missing songs.
    """
    
    # Paths
    frontend_songs_path = BASE_DIR.parent / "frontend" / "src" / "data" / "songs.json"
    
    # 1. Load existing databases
    print("Loading existing databases...")
    
    # Frontend DB
    if frontend_songs_path.exists():
        with open(frontend_songs_path, 'r', encoding='utf-8') as f:
            frontend_db = json.load(f)
    else:
        frontend_db = []
        
    # Backend DB
    if SONG_DATABASE_PATH.exists():
        with open(SONG_DATABASE_PATH, 'r', encoding='utf-8') as f:
            backend_db = json.load(f)
    else:
        backend_db = []
        
    # Create sets of existing IDs for quick lookup
    # Using folder name as ID if explicit ID not found, but ideally from info.json or folder name
    existing_frontend_ids = {s.get('id') for s in frontend_db if s.get('id')}
    existing_backend_ids = {s.get('id') for s in backend_db if s.get('id')}
    
    print(f"Frontend: {len(frontend_db)} songs. Backend: {len(backend_db)} songs.")
    
    # 2. Scan raw_data for new folders
    if not RAW_DATA_DIR.exists():
        print(f"Error: {RAW_DATA_DIR} does not exist.")
        return

    new_songs_added = 0
    
    # Sort folders for consistent processing order
    song_folders = sorted([f for f in RAW_DATA_DIR.iterdir() if f.is_dir()])
    
    for folder in song_folders:
        song_id = folder.name # Use folder name as default ID
        
        # Check if song already exists in BOTH databases
        # We want strict sync, so if it's missing in either, we'll try to process/add it
        # But mostly we care about adding NEW stuff.
        if song_id in existing_frontend_ids and song_id in existing_backend_ids:
            continue
            
        print(f"\nProcessing new song: {song_id}")
        
        # 3. Read Metadata
        info_path = folder / "info.json"
        if not info_path.exists():
            print(f"  Skipping: No info.json found in {folder.name}")
            continue
            
        try:
            with open(info_path, 'r', encoding='utf-8') as f:
                info = json.load(f)
        except Exception as e:
            print(f"  Error reading info.json: {e}")
            continue
            
        # Read optional text files
        lyrics = ""
        lyrics_path = folder / "lyrics.txt"
        if lyrics_path.exists():
            with open(lyrics_path, 'r', encoding='utf-8') as f:
                lyrics = f.read()
                
        credits_text = ""
        credits_path = folder / "credits.txt"
        if credits_path.exists():
            with open(credits_path, 'r', encoding='utf-8') as f:
                credits_text = f.read()
                
        bio = ""
        bio_path = folder / "about.txt"
        if bio_path.exists():
            with open(bio_path, 'r', encoding='utf-8') as f:
                bio = f.read()

        # Locate Audio
        audio_file = None
        for f in folder.iterdir():
             if f.suffix.lower() in ['.mp3', '.wav', '.ogg', '.m4a', '.flac']:
                 audio_file = f
                 break
        
        if not audio_file:
            print(f"  Skipping: No audio file found in {folder.name}")
            continue

        # 4. Extract Features (Backend)
        print(f"  Extracting features from {audio_file.name}...")
        try:
            audio, sr = pitch.load_audio(str(audio_file))
            if audio is None:
                print("    Failed to load audio.")
                continue
                
            features = melody.extract_features(audio)
            
            if not features or not features.get('relative_pitches'):
                print("    Failed to extract features.")
                continue
                
        except Exception as e:
            print(f"    Error processing audio: {e}")
            continue

        # 5. Construct Objects
        # Construct Paths (Frontend expects /data/raw_data/... or /songs/... ?? )
        # Looking at songs.json, standard seems to be:
        # "audio_path": "/songs/Brooklyn baby_audio.mp3",  <-- Wait, this looks like old path?
        # Let's check a raw_data entry.
        # Use relative path from 'public' or absolute URL?
        # If we serve RAW_DATA_DIR as static, we should map it correctly.
        # In main.py: app.mount("/data", StaticFiles(directory=str(RAW_DATA_DIR.parent)), name="data")
        # So URL is /data/raw_data/{song_id}/{filename}
        
        # IMPORTANT: Updated frontend to use /data/raw_data paths? 
        # Or did we keep the old /songs/ paths in JSON?
        # Let's check what 'build_database.py' did.
        # It used: 'path': f"data/raw_data/{song_id}/{audio_file.name}"
        
        # We should use that for backend.
        # For frontend, it accesses these via HTTP? Or local import?
        # Library.tsx uses `songsData from '../data/songs.json'`.
        # SongDetails.tsx uses `<audio src={song.audio_path} />`.
        # If it's a static path, it needs to be served by Vite or pointing to Backend URL.
        # Vite proxy /data -> Backend /data.
        # So path should be /data/raw_data/... 
        
        relative_audio_path = f"/data/raw_data/{song_id}/{audio_file.name}"
        
        # Images
        cover_image = info.get('cover_image')
        # specific check for files
        if (folder / "cover.jpg").exists():
            cover_image = f"/data/raw_data/{song_id}/cover.jpg"
        
        artist_image = info.get('artist_image')
        if (folder / "artist.jpg").exists():
            artist_image = f"/data/raw_data/{song_id}/artist.jpg"

        # Frontend Object
        new_song_frontend = {
            "title": info.get('title', song_id),
            "artist": info.get('artist', 'Unknown'),
            "album": info.get('album', ''),
            "length": info.get('length', features['duration']), # Format duration?
            "release_date": info.get('release_date', ''),
            "theme_color": info.get('theme_color', '#000000'),
            "spotify_url": info.get('spotify_url', ''),
            "id": song_id,
            "lyrics": lyrics,
            "credits_text": credits_text,
            "bio": bio,
            "spotify_stats": info.get('spotify_stats', {}),
            "social_links": info.get('social_links', {}),
            "audio_path": relative_audio_path,
            "cover_image": cover_image,
            "artist_image": artist_image
        }

        # Backend Object (Subset + Features)
        new_song_backend = {
            'id': song_id,
            'title': new_song_frontend['title'],
            'artist': new_song_frontend['artist'],
            'name': new_song_frontend['title'], # Matcher uses 'name'
            'path': relative_audio_path,
            'tempo': features['tempo'],
            'relative_pitches': features['relative_pitches'],
            'pitch_count': features['pitch_count'],
            'duration': features['duration'],
            'onset_count': features.get('onset_count', 0),
            'cover_image': cover_image,
            'artist_image': artist_image,
            'theme_color': new_song_frontend['theme_color']
        }
        
        # Add to lists
        if song_id not in existing_frontend_ids:
            frontend_db.append(new_song_frontend)
            existing_frontend_ids.add(song_id)
            
        if song_id not in existing_backend_ids:
            backend_db.append(new_song_backend)
            existing_backend_ids.add(song_id)
            
        new_songs_added += 1
        print(f"  [+] Added '{new_song_frontend['title']}")

    if new_songs_added > 0:
        print(f"\nSaving {new_songs_added} new songs...")
        
        with open(frontend_songs_path, 'w', encoding='utf-8') as f:
            json.dump(frontend_db, f, indent=2)
        print(f"Updated {frontend_songs_path}")
            
        with open(SONG_DATABASE_PATH, 'w', encoding='utf-8') as f:
            json.dump(backend_db, f, indent=2)
        print(f"Updated {SONG_DATABASE_PATH}")
        
    else:
        print("\nNo new songs found. Databases are up to date.")

if __name__ == "__main__":
    add_new_songs()
