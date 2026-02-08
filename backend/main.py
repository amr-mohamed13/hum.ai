
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.routes.humming import router as humming_router
from backend.config import MEDIA_ROOT, RAW_DATA_DIR

app = FastAPI(
    title="Humming Search Backend (QTune Port)",
    description="FastAPI port of the Django Humming Search backend.",
    version="1.0.0"
)

# CORS Middleware
origins = [
    "http://localhost:3000",
    "http://localhost:5173",  # Vite default
    "http://127.0.0.1:5173",
    "*"  # Allow all for development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Router
app.include_router(humming_router, tags=["humming"])

# Mount Media Files
# Serves uploaded files (e.g., recorded hums)
app.mount("/media", StaticFiles(directory=str(MEDIA_ROOT)), name="media")

# Mount Raw Data Files
# Serves the actual song files from data/raw_data for playback
# Mounted at /data/raw_data so the path stored in DB matches the URL path
# DB path stored as: data/raw_data/{song}/{file}
# So if we mount /data at parent of raw_data?
# RAW_DATA_DIR is .../data/raw_data
# Parent is .../data
app.mount("/data", StaticFiles(directory=str(RAW_DATA_DIR.parent)), name="data")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "humming-search-backend"}

if __name__ == "__main__":
    import uvicorn
    # Run the application
    # Instructions: uvicorn backend.main:app --reload
    print("Starting server...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
