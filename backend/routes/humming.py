
from fastapi import APIRouter, File, UploadFile, HTTPException, Request, Depends, Body
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional, List
import os
import shutil
import tempfile
import asyncio
from pathlib import Path

from backend.config import MEDIA_ROOT
from backend.services import pitch, melody, matcher, dtw
from backend.schemas import SearchResponse, ExtractedFeatures, Match, SongInfo

router = APIRouter()

@router.post("/upload", response_model=SearchResponse)
async def upload_audio(audio: UploadFile = File(...)):
    """Handle audio file upload and perform search."""
    try:
        # Save uploaded file
        uploads_dir = MEDIA_ROOT / 'uploads'
        uploads_dir.mkdir(exist_ok=True)
        
        file_path = uploads_dir / audio.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
            
        # Process the audio
        # load_audio logic from pitch service
        # But load_audio expects path
        audio_data, sr = pitch.load_audio(str(file_path))
        
        if audio_data is None:
             return SearchResponse(success=False, error="Could not load or analyze audio file.")

        features = melody.extract_features(audio_data)
        
        if features:
            # Find matches
            database = matcher.load_song_database()
            
            if not database:
                 return SearchResponse(success=False, error="No songs in database. Please add songs first.")
            
            matches = matcher.find_best_matches(features, database)
            
            # Map matches to schema
            match_objects = [
                Match(
                    id=m.get('id', ''),
                    name=m['name'], 
                    title=m.get('title'),
                    artist=m.get('artist'),
                    cover_image=m.get('cover_image'),
                    theme_color=m.get('theme_color'),
                    path=m['path'], 
                    similarity=m['similarity'],
                    tempo=m['tempo'],
                    pitch_count=m['pitch_count']
                ) for m in matches
            ]
            
            return SearchResponse(
                success=True,
                features=features,
                matches=match_objects
            )
        else:
             return SearchResponse(success=False, error="Could not extract features from audio.")
             
    except Exception as e:
        print(f"Error in upload_audio: {e}")
        return SearchResponse(success=False, error=str(e))

@router.post("/record", response_model=SearchResponse)
async def record_audio(
    file: Optional[UploadFile] = File(None),
    # Supporting raw body requires reading request stream directly or custom dependency?
    # FastAPI suggests UploadFile for multipart.
    # Original Django code checks request.FILES and request.body.
    # To support raw body effectively in FastAPI, we can use Request object.
    request: Request = None
):
    """Handle recorded audio from browser."""
    try:
        audio_data = None
        
        # Check UploadFile first
        if file:
            audio_data = await file.read()
            
        # If no file, check request body
        if not audio_data:
            audio_data = await request.body()
            
        if not audio_data:
             return SearchResponse(success=False, error="No audio data received")
        
        # Check for WebM/Opus signature (from original code)
        if isinstance(audio_data, bytes):
             # Original check: if audio_data[:4] == b'\x1aE\xdf\xa3' or b'webm' in audio_data[:100].lower():
             if audio_data[:4] == b'\x1aE\xdf\xa3' or b'webm' in audio_data[:100].lower():
                 print("Converting WebM to WAV...")
                 wav_data = pitch.convert_webm_to_wav(audio_data)
                 if wav_data:
                     audio_data = wav_data
                 else:
                     return SearchResponse(success=False, error="Failed to convert audio format. Install ffmpeg.")
        
        # Process audio from bytes
        # pitch.load_audio_from_bytes
        audio_array, sr = pitch.load_audio_from_bytes(audio_data)
        
        if audio_array is None:
             return SearchResponse(success=False, error="Could not load audio data.")
             
        features = melody.extract_features(audio_array)
        
        if features:
             database = matcher.load_song_database()
             if not database:
                  return SearchResponse(success=False, error="No songs in database.")
             
             matches = matcher.find_best_matches(features, database)
             
             match_objects = [
                Match(
                    id=m.get('id', ''),
                    name=m['name'], 
                    title=m.get('title'),
                    artist=m.get('artist'),
                    cover_image=m.get('cover_image'),
                    theme_color=m.get('theme_color'),
                    path=m['path'], 
                    similarity=m['similarity'],
                    tempo=m['tempo'],
                    pitch_count=m['pitch_count']
                ) for m in matches
            ]
            
             return SearchResponse(success=True, features=features, matches=match_objects)
        else:
             return SearchResponse(success=False, error="Could not extract features.")
             
    except Exception as e:
        print(f"Error in record_audio: {e}")
        import traceback
        traceback.print_exc()
        return SearchResponse(success=False, error=f"Processing error: {str(e)}")

@router.post("/match", response_model=SearchResponse)
async def match_song(features: ExtractedFeatures):
    """Match pre-extracted features against database."""
    try:
        database = matcher.load_song_database()
        
        # Convert Pydantic to dict for matcher
        user_features_dict = features.dict()
        
        matches = matcher.find_best_matches(user_features_dict, database)
        
        match_objects = [
            Match(
                id=m.get('id', ''),
                name=m['name'], 
                title=m.get('title'),
                artist=m.get('artist'),
                cover_image=m.get('cover_image'),
                theme_color=m.get('theme_color'),
                path=m['path'], 
                similarity=m['similarity'],
                tempo=m['tempo'],
                pitch_count=m['pitch_count']
            ) for m in matches
        ]
        
        return SearchResponse(success=True, matches=match_objects)
        
    except Exception as e:
        return SearchResponse(success=False, error=str(e))

@router.get("/get_songs")
async def get_songs():
    """Get list of available songs."""
    database = matcher.load_song_database()
    songs = []
    for song in database:
        songs.append({
            'id': song.get('id', ''),
            'name': song.get('name'),
            'path': song.get('path'),
            'tempo': song.get('tempo'),
            'pitch_count': song.get('pitch_count', 0)
        })
    return {'songs': songs}

@router.get("/play_song/{song_path:path}")
async def play_song(song_path: str):
    """Serve song file for playback."""
    full_path = MEDIA_ROOT / song_path
    if full_path.exists():
        media_type = "audio/mpeg"
        if full_path.suffix == ".wav": media_type = "audio/wav"
        elif full_path.suffix == ".ogg": media_type = "audio/ogg"
        
        return FileResponse(full_path, media_type=media_type)
    else:
        return JSONResponse({"error": "Song not found"}, status_code=404)
