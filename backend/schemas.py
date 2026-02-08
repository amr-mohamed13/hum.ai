from pydantic import BaseModel
from typing import List, Optional

class ExtractedFeatures(BaseModel):
    tempo: float
    relative_pitches: List[int]
    pitch_count: int
    duration: float
    onset_count: int

class Match(BaseModel):
    id: str
    name: str # kept for compatibility, same as title usually
    title: Optional[str] = None
    artist: Optional[str] = "Unknown Artist"
    cover_image: Optional[str] = None
    theme_color: Optional[str] = "#000000"
    path: str
    similarity: float
    tempo: float
    pitch_count: int

class SearchResponse(BaseModel):
    success: bool
    features: Optional[dict] = None  # Using dict to match JsonResponse flexibility
    matches: List[Match] = []
    error: Optional[str] = None

class SongInfo(BaseModel):
    name: str = "Unknown"
    path: str
    tempo: float
    pitch_count: int = 0
