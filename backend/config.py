"""
Configuration Settings
======================
Mirrors Django settings.py for paths and constants.
"""

import os
from pathlib import Path

# Base Directory (Backend)
BASE_DIR = Path(__file__).resolve().parent

# Raw Data Directory (Original Song Files)
# Structure: backend/../data/raw_data/{song_name}/audio.mp3
RAW_DATA_DIR = BASE_DIR.parent / "data" / "raw_data"

# Media Root (for storing uploads/songs)
# In Django, this was BASE_DIR / 'media'
# We will create a local 'media' folder in backend
MEDIA_ROOT = BASE_DIR / "media"
MEDIA_ROOT.mkdir(exist_ok=True)

# Song Database JSON Path
SONG_DATABASE_PATH = BASE_DIR / "songs_database.json"

# Audio Settings (from qtune_processor.py)
SAMPLE_RATE = 22050
HOP_LENGTH = 512
n_fft = 2048

# Ensure directories exist
(MEDIA_ROOT / "songs").mkdir(exist_ok=True)
(MEDIA_ROOT / "uploads").mkdir(exist_ok=True)
