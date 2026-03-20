"""
REST API for text stress analysis (same logic as Text_Based_Model notebook).
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import pipeline

MODEL_ID = os.environ.get(
    "STRESS_MODEL_ID",
    "distilbert/distilbert-base-uncased-finetuned-sst-2-english",
)

_classifier = None


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
    return {"status": "ok", "model": MODEL_ID}


@app.post("/analyze")
def analyze(body: AnalyzeRequest):
    text = body.sentence.strip()
    if not text:
        raise HTTPException(status_code=400, detail="sentence must not be empty")
    try:
        return text_stress_analysis(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
