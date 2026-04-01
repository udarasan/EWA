"""
REST API for text stress analysis (same logic as Text_Based_Model notebook).
Optional faster-whisper for speech-to-text (requires ffmpeg for webm/mp3).
"""

import asyncio
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from transformers import pipeline

try:
    from faster_whisper import WhisperModel
except ImportError:  # pragma: no cover
    WhisperModel = None

MODEL_ID = os.environ.get(
    "STRESS_MODEL_ID",
    "distilbert/distilbert-base-uncased-finetuned-sst-2-english",
)

WHISPER_MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "base")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

# UI languages from the app → Whisper language codes (None = auto-detect)
LANG_TO_WHISPER = {
    "English": "en",
    "Sinhala": "si",
    "Tamil": "ta",
    "en": "en",
    "si": "si",
    "ta": "ta",
}

_classifier = None
_whisper_model = None
_executor = ThreadPoolExecutor(max_workers=1)


def get_whisper_model():
    global _whisper_model
    if WhisperModel is None:
        raise RuntimeError("faster-whisper is not installed.")
    if _whisper_model is None:
        _whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
    return _whisper_model


def _transcribe_path_sync(path: str, language: Optional[str]) -> str:
    model = get_whisper_model()
    segments, _info = model.transcribe(
        path,
        language=language,
        beam_size=5,
    )
    parts = [s.text.strip() for s in segments if s.text and s.text.strip()]
    return " ".join(parts).strip()


async def transcribe_upload_to_text(
    upload: UploadFile,
    language_label: Optional[str] = None,
) -> str:
    """Write upload to a temp file and run Whisper in a thread."""
    suffix = Path(upload.filename or "clip").suffix
    if not suffix or len(suffix) > 8:
        suffix = ".webm"
    data = await upload.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty audio file")

    whisper_lang = None
    if language_label:
        whisper_lang = LANG_TO_WHISPER.get(language_label.strip())
        if whisper_lang is None and len(language_label) <= 3:
            whisper_lang = language_label.strip().lower()

    tmp_path = None
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        with open(tmp_path, "wb") as f:
            f.write(data)
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(
            _executor,
            lambda: _transcribe_path_sync(tmp_path, whisper_lang),
        )
        return text
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def text_stress_analysis(text: str) -> dict:
    assert _classifier is not None
    result = _classifier(text)[0]
    label = result["label"]
    score = result["score"]

    if label == "POSITIVE":
        stress_level = "Low Stress"
        stress_score = 30 * (1 - score)
    elif label == "NEUTRAL":
        stress_level = "Medium Stress"
        stress_score = 50 + 20 * (1 - score)
    else:
        stress_level = "High Stress"
        stress_score = 70 + 30 * score

    stress_score = min(100.0, float(stress_score))
    return {
        "stress_score": round(stress_score, 4),
        "stress_level": stress_level,
        "label": label,
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _classifier
    _classifier = pipeline("sentiment-analysis", model=MODEL_ID)
    yield
    _classifier = None


app = FastAPI(
    title="Stress analysis API",
    description="Sentiment-based stress score from a single sentence.",
    lifespan=lifespan,
)


class AnalyzeRequest(BaseModel):
    sentence: str = Field(..., min_length=1, description="Text to analyze")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_ID,
        "whisper": WhisperModel is not None,
        "whisper_model_size": WHISPER_MODEL_SIZE,
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """Speech-to-text using faster-whisper (install ffmpeg for webm/mp3)."""
    try:
        text = await transcribe_upload_to_text(file, language)
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    if not text:
        raise HTTPException(
            status_code=400, detail="Could not transcribe audio (empty result)."
        )
    return {"text": text}


@app.post("/voice-and-stress")
async def voice_and_stress(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """Transcribe audio, then run the same stress analysis as /analyze."""
    try:
        text = await transcribe_upload_to_text(file, language)
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    if not text:
        raise HTTPException(
            status_code=400, detail="Could not transcribe audio (empty result)."
        )
    stress = text_stress_analysis(text)
    return {"text": text, **stress}


@app.post("/analyze")
def analyze(body: AnalyzeRequest):
    text = body.sentence.strip()
    if not text:
        raise HTTPException(status_code=400, detail="sentence must not be empty")
    try:
        return text_stress_analysis(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
