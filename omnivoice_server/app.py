from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


@dataclass
class ModelState:
    model: object | None = None
    load_error: str | None = None


STATE = ModelState()

app = FastAPI(title="OmniVoice Server", version="0.1.0")


class TTSRequest(BaseModel):
    text: str = Field(min_length=1)
    ref_audio_path: str = Field(min_length=1)
    ref_text: str = ""
    output_path: str = Field(min_length=1)
    output_sr: int = 24000


class TTSResponse(BaseModel):
    outputPath: str
    sampleRate: int
    durationSec: float


def _postprocess_audio(audio: np.ndarray) -> np.ndarray:
    """
    Lightweight cleanup to avoid audible distortion:
    - ensure finite values
    - remove DC offset
    - peak-normalize to leave headroom
    """
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    if audio.size == 0:
        return audio

    # Replace NaN/Inf with 0 to avoid corrupting the WAV.
    audio = np.nan_to_num(audio, nan=0.0, posinf=0.0, neginf=0.0)

    # Remove DC offset (often perceived as "muffled" or "dirty" output after encoding).
    audio = audio - float(np.mean(audio))

    # Peak normalize with small headroom to reduce clipping distortion.
    peak = float(np.max(np.abs(audio)))
    if peak > 0.0:
        target_peak = 0.97
        if peak > target_peak:
            audio = audio * (target_peak / peak)

    return audio


def _resolve_path(p: str) -> Path:
    path = Path(p).expanduser()
    if not path.is_absolute():
        path = (Path.cwd() / path).resolve()
    return path


def _env_flag(name: str, default: str = "0") -> bool:
    v = str(os.getenv(name, default)).strip().lower()
    return v not in ("0", "false", "no", "off", "")


def _infer_model_device(model: object) -> str:
    """
    Best-effort device inference for /health.
    OmniVoice is an external package; avoid depending on its internals.
    """
    try:
        import torch

        # Common patterns: a torch.nn.Module, or an object with `.model` holding one.
        candidates = [model]
        for attr in ("model", "tts", "net", "module"):
            try:
                inner = getattr(model, attr, None)
            except Exception:  # noqa: BLE001
                inner = None
            if inner is not None:
                candidates.append(inner)

        for cand in candidates:
            try:
                params = getattr(cand, "parameters", None)
                if callable(params):
                    first = next(params(), None)
                    if first is not None and hasattr(first, "device"):
                        return str(first.device)
            except Exception:  # noqa: BLE001
                continue

        if torch.cuda.is_available():
            return "cuda"
        return "cpu"
    except Exception:  # noqa: BLE001
        return "unknown"


def _load_model() -> None:
    if STATE.model is not None or STATE.load_error is not None:
        return
    try:
        import torch
        from omnivoice import OmniVoice

        require_cuda = _env_flag("OMNIVOICE_REQUIRE_CUDA", "1")
        if require_cuda and not torch.cuda.is_available():
            raise RuntimeError("CUDA is required (set OMNIVOICE_REQUIRE_CUDA=0 to allow CPU), but torch.cuda.is_available() is False")

        STATE.model = OmniVoice.from_pretrained(
            "k2-fsa/OmniVoice",
            device_map="cuda:0",
            dtype=torch.float16,
        )
    except Exception as e:  # noqa: BLE001
        STATE.load_error = f"{type(e).__name__}: {e}"


@app.on_event("startup")
def _startup() -> None:
    _load_model()


@app.get("/health")
def health() -> dict:
    _load_model()
    device = _infer_model_device(STATE.model) if STATE.model is not None else None
    torch_info: dict = {}
    try:
        import torch

        torch_info = {
            "torchVersion": getattr(torch, "__version__", None),
            "cudaAvailable": bool(torch.cuda.is_available()),
            "cudaVersion": getattr(getattr(torch, "version", None), "cuda", None),
            "cudaDeviceCount": int(torch.cuda.device_count() if torch.cuda.is_available() else 0),
            "cudaDeviceName0": (torch.cuda.get_device_name(0) if torch.cuda.is_available() and torch.cuda.device_count() > 0 else None),
        }
    except Exception as e:  # noqa: BLE001
        torch_info = {"error": f"{type(e).__name__}: {e}"}

    return {
        "ok": True,
        "modelLoaded": STATE.model is not None,
        "modelDevice": device,
        "error": STATE.load_error,
        **torch_info,
    }


@app.post("/tts", response_model=TTSResponse)
def tts(req: TTSRequest) -> TTSResponse:
    _load_model()
    if STATE.model is None:
        raise HTTPException(status_code=503, detail=f"Model not loaded: {STATE.load_error or 'unknown error'}")

    ref_audio_path = _resolve_path(req.ref_audio_path)
    if not ref_audio_path.exists():
        raise HTTPException(status_code=400, detail=f"ref_audio_path not found: {str(ref_audio_path)}")

    output_path = _resolve_path(req.output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        ref_text: Optional[str] = req.ref_text.strip() or None

        # OmniVoice returns a list of np.ndarray at 24 kHz by default.
        audio_list = STATE.model.generate(
            text=req.text,
            ref_audio=str(ref_audio_path),
            ref_text=ref_text,
        )
        if not audio_list or audio_list[0] is None:
            raise RuntimeError("Empty audio returned from model")

        audio = _postprocess_audio(audio_list[0])
        sr = int(req.output_sr or 24000)

        # If caller requests a different SR, resampling is currently not done here.
        # Keep server simple; normalize on Node side if needed.
        if sr != 24000:
            sr = 24000

        # Use PCM_16 for broad compatibility and predictable loudness/behavior downstream.
        sf.write(str(output_path), audio, sr, subtype="PCM_16")
        duration = float(audio.shape[0]) / float(sr)

        return TTSResponse(outputPath=str(output_path), sampleRate=sr, durationSec=duration)
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}") from e
