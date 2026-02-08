
import numpy as np
import librosa
import soundfile as sf
import tempfile
import os
import subprocess
import io
from backend.config import SAMPLE_RATE, HOP_LENGTH, n_fft

def load_audio(audio_path):
    """Load audio file using librosa."""
    try:
        audio, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
        return audio, sr
    except Exception as e:
        print(f"Error loading audio: {e}")
        return None, None

def load_audio_from_bytes(audio_bytes):
    """Load audio from bytes."""
    try:
        # Save to temp file and load
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        audio, sr = librosa.load(tmp_path, sr=SAMPLE_RATE, mono=True)
        os.unlink(tmp_path)
        return audio, sr
    except Exception as e:
        print(f"Error loading audio from bytes: {e}")
        return None, None

def detect_bpm(audio):
    """Detect tempo using librosa."""
    try:
        # Use onset detection for tempo
        onset_env = librosa.onset.onset_strength(y=audio, sr=SAMPLE_RATE)
        tempo, _ = librosa.beat.beat_track(onset_envelope=onset_env, sr=SAMPLE_RATE)
        # Handle numpy scalar or array return
        if np.ndim(tempo) > 0 and len(tempo) > 0:
             return float(tempo[0])
        elif np.ndim(tempo) == 0:
             return float(tempo)
        return 120.0
    except:
        return 120.0

def extract_pitches(audio):
    """Extract pitch using librosa's piptrack."""
    try:
        # Extract pitch using CQT (Constant-Q Transform)
        # Note: cqt unused in original code but computed
        cqt = np.abs(librosa.cqt(audio, sr=SAMPLE_RATE, hop_length=HOP_LENGTH))
        
        # Get pitch frequencies
        pitches, magnitudes = librosa.piptrack(
            y=audio, 
            sr=SAMPLE_RATE,
            hop_length=HOP_LENGTH,
            fmin=80.0,
            fmax=1000.0
        )
        
        # Get predominant pitch per frame
        pitch_values = []
        for t in range(pitches.shape[1]):
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            if pitch > 0:
                pitch_values.append(pitch)
            else:
                pitch_values.append(0)
        
        # Calculate times
        pitch_times = librosa.frames_to_time(
            np.arange(len(pitch_values)),
            sr=SAMPLE_RATE,
            hop_length=HOP_LENGTH
        )
        
        # Simple confidence based on magnitude
        pitch_confidence = [1.0 if p > 0 else 0.0 for p in pitch_values]
        
        return pitch_times, np.array(pitch_values), np.array(pitch_confidence)
    except Exception as e:
        print(f"Error extracting pitches: {e}")
        # Return dummy data
        dummy_times = np.linspace(0, len(audio)/SAMPLE_RATE, 100)
        dummy_pitches = np.zeros(100)
        dummy_confidence = np.zeros(100)
        return dummy_times, dummy_pitches, dummy_confidence

def detect_onsets(audio):
    """Detect onsets using librosa."""
    try:
        onset_frames = librosa.onset.onset_detect(
            y=audio, 
            sr=SAMPLE_RATE,
            hop_length=HOP_LENGTH,
            backtrack=True
        )
        onset_times = librosa.frames_to_time(
            onset_frames, 
            sr=SAMPLE_RATE,
            hop_length=HOP_LENGTH
        )
        return onset_times
    except Exception as e:
        print(f"Error detecting onsets: {e}")
        # Return evenly spaced onsets as fallback
        duration = len(audio) / SAMPLE_RATE
        return np.linspace(0, duration, min(10, int(duration)))

def convert_webm_to_wav(webm_data):
    """Convert WebM/Opus audio to WAV format using ffmpeg."""
    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as webm_file:
            webm_file.write(webm_data)
            webm_path = webm_file.name
        
        wav_path = webm_path.replace('.webm', '.wav')
        
        # Use ffmpeg to convert WebM to WAV
        # Try using ffmpeg (preferred)
        cmd = [
            'ffmpeg', '-y', '-i', webm_path,
            '-acodec', 'pcm_s16le',
            '-ac', '1',
            '-ar', '22050',
            wav_path
        ]
        
        # Run conversion
        # Use shell=True only on windows if needed? No, avoid shell=True if possible.
        # But 'ffmpeg' needs to be in PATH.
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                 # Try avconv fallback
                 cmd = [
                    'avconv', '-y', '-i', webm_path,
                    '-acodec', 'pcm_s16le',
                    '-ac', '1',
                    '-ar', '22050',
                    wav_path
                 ]
                 result = subprocess.run(cmd, capture_output=True, text=True)
        except  FileNotFoundError:
             print("ffmpeg not found.")
             result = None # Handled below
             
        if os.path.exists(wav_path):
            with open(wav_path, 'rb') as f:
                wav_data = f.read()
            
            # Clean up temp files
            os.unlink(webm_path)
            os.unlink(wav_path)
            
            return wav_data
        else:
            if result:
                 print(f"Conversion failed: {result.stderr}")
            
            # Fallback to pydub
            try:
                from pydub import AudioSegment
                audio = AudioSegment.from_file(webm_path, format="webm")
                audio = audio.set_frame_rate(22050).set_channels(1)
                
                # Export to WAV
                wav_buffer = io.BytesIO()
                audio.export(wav_buffer, format="wav")
                wav_data = wav_buffer.getvalue()
                
                os.unlink(webm_path)
                return wav_data
            except Exception as e:
                print(f"Pydub conversion error: {e}")
                if os.path.exists(webm_path):
                    os.unlink(webm_path)
                return None
                
    except Exception as e:
        print(f"WebM to WAV conversion error: {e}")
        return None
