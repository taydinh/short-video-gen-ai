from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Optional
from uuid import uuid4

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
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


class WebUIGenerateRequest(BaseModel):
    text: str = Field(min_length=1)
    preset: str = "neutral"
    # Optional overrides for advanced usage
    ref_audio_path: str = ""
    ref_text: str = ""


class WebUIGenerateResponse(BaseModel):
    ok: bool = True
    audioUrl: str
    outputPath: str
    sampleRate: int
    durationSec: float
    preset: str


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


def _repo_root() -> Path:
    # repo_root/omnivoice_server/app.py -> repo_root
    return Path(__file__).resolve().parents[1]


def _default_ref_for_preset(preset: str) -> Path:
    """
    Resolve a reference clip for a given emotion preset.
    OmniVoice does not take an explicit "emotion" parameter; we approximate it by swapping ref audio clips.

    Defaults (relative to repo root):
      assets/voice/refs/{preset}.wav
      fallback: assets/voice/ref.wav
    """
    p = (preset or "").strip().lower() or "neutral"
    root = _repo_root()
    candidate = (root / "assets" / "voice" / "refs" / f"{p}.wav").resolve()
    if candidate.exists():
        return candidate
    return (root / "assets" / "voice" / "ref.wav").resolve()


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


@app.get("/", response_class=HTMLResponse)
def webui() -> HTMLResponse:
    html = """
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OmniVoice WebUI</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#0b1020; color:#e7e9ee; }
      .wrap { max-width: 920px; margin: 0 auto; padding: 28px 18px 48px; }
      .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 18px; }
      h1 { font-size: 20px; margin: 0 0 14px; letter-spacing: 0.02em; }
      label { display:block; font-size: 12px; opacity: 0.85; margin: 12px 0 6px; }
      textarea, input, select { width: 100%; box-sizing: border-box; border-radius: 12px; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.35); color: #fff; padding: 12px 12px; }
      textarea { min-height: 140px; resize: vertical; line-height: 1.35; }
      .row { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .btnrow { display:flex; gap: 10px; align-items:center; margin-top: 14px; }
      button { border: 0; border-radius: 12px; padding: 12px 14px; font-weight: 700; background: #7c3aed; color:#fff; cursor:pointer; }
      button:disabled { opacity: 0.6; cursor: not-allowed; }
      .ghost { background: rgba(255,255,255,0.10); }
      .small { font-size: 12px; opacity: 0.82; }
      .out { margin-top: 14px; display:grid; gap: 10px; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
      .err { color: #fecaca; }
      .ok { color: #bbf7d0; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>OmniVoice WebUI (local)</h1>
        <div class="small">Gợi ý: preset cảm xúc được “diễn” bằng cách đổi reference clip (assets/voice/refs/&lt;preset&gt;.wav). Fallback: assets/voice/ref.wav</div>

        <label for="text">Text</label>
        <textarea id="text" placeholder="Nhập nội dung bạn muốn đọc..."></textarea>

        <div class="row">
          <div>
            <label for="preset">Preset</label>
            <select id="preset">
              <option value="neutral" selected>neutral</option>
              <option value="hype">hype</option>
              <option value="serious">serious</option>
              <option value="sad">sad</option>
            </select>
          </div>
          <div>
            <label for="ref_text">Ref text (optional)</label>
            <input id="ref_text" placeholder="Để trống để OmniVoice tự xử lý" />
          </div>
        </div>

        <label for="ref_audio_path">Ref audio path (optional override)</label>
        <input id="ref_audio_path" placeholder="Ví dụ: assets/voice/refs/hype.wav" />

        <div class="btnrow">
          <button id="btn" onclick="generate()">Generate</button>
          <button class="ghost" onclick="document.getElementById('text').value='';" type="button">Clear</button>
          <span id="status" class="small"></span>
        </div>

        <div class="out">
          <audio id="audio" controls style="width:100%; display:none;"></audio>
          <div id="meta" class="small"></div>
          <div id="err" class="small err"></div>
        </div>
      </div>
    </div>

    <script>
      async function generate() {
        const btn = document.getElementById('btn');
        const status = document.getElementById('status');
        const err = document.getElementById('err');
        const meta = document.getElementById('meta');
        const audio = document.getElementById('audio');

        err.textContent = '';
        meta.textContent = '';
        audio.style.display = 'none';

        const text = document.getElementById('text').value.trim();
        const preset = document.getElementById('preset').value;
        const ref_text = document.getElementById('ref_text').value.trim();
        const ref_audio_path = document.getElementById('ref_audio_path').value.trim();
        if (!text) {
          err.textContent = 'Text trống.';
          return;
        }

        btn.disabled = true;
        status.textContent = 'Generating...';
        try {
          const res = await fetch('/webui/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, preset, ref_text, ref_audio_path })
          });
          const json = await res.json().catch(() => null);
          if (!res.ok) {
            err.textContent = (json && (json.detail || json.error)) ? (json.detail || json.error) : ('HTTP ' + res.status);
            return;
          }

          audio.src = json.audioUrl + '?t=' + Date.now();
          audio.style.display = 'block';
          meta.innerHTML =
            '<span class=\"ok\">OK</span> ' +
            'preset=<code>' + (json.preset || preset) + '</code> ' +
            'duration=' + (json.durationSec || 0).toFixed(2) + 's ' +
            'sr=' + (json.sampleRate || 24000) + '<br/>' +
            '<code>' + (json.outputPath || '') + '</code>';
        } catch (e) {
          err.textContent = String(e && e.message ? e.message : e);
        } finally {
          btn.disabled = false;
          status.textContent = '';
        }
      }
    </script>
  </body>
</html>
""".strip()
    return HTMLResponse(content=html)


@app.post("/webui/generate", response_model=WebUIGenerateResponse)
def webui_generate(req: WebUIGenerateRequest) -> WebUIGenerateResponse:
    _load_model()
    if STATE.model is None:
        raise HTTPException(status_code=503, detail=f"Model not loaded: {STATE.load_error or 'unknown error'}")

    # Decide reference audio
    override = (req.ref_audio_path or "").strip()
    if override:
        ref_audio_path = _resolve_path(override)
    else:
        ref_audio_path = _default_ref_for_preset(req.preset)

    if not ref_audio_path.exists():
        raise HTTPException(status_code=400, detail=f"ref_audio_path not found: {str(ref_audio_path)}")

    # Output file under repo-local temp directory so it can be served via /webui/files/*
    out_dir = (_repo_root() / "output" / "omnivoice_webui").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = (out_dir / f"{uuid4().hex}.wav").resolve()

    try:
        ref_text: Optional[str] = (req.ref_text or "").strip() or None
        audio_list = STATE.model.generate(
            text=req.text,
            ref_audio=str(ref_audio_path),
            ref_text=ref_text,
        )
        if not audio_list or audio_list[0] is None:
            raise RuntimeError("Empty audio returned from model")

        audio = _postprocess_audio(audio_list[0])
        sr = 24000
        sf.write(str(out_path), audio, sr, subtype="PCM_16")
        duration = float(audio.shape[0]) / float(sr)

        # Served by /webui/files/<filename>
        audio_url = f"/webui/files/{out_path.name}"
        return WebUIGenerateResponse(
            audioUrl=audio_url,
            outputPath=str(out_path),
            sampleRate=sr,
            durationSec=duration,
            preset=(req.preset or "neutral").strip().lower() or "neutral",
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}") from e


@app.get("/webui/files/{name}")
def webui_file(name: str):
    # Simple file serving for generated wavs
    safe_name = Path(name).name  # prevent path traversal
    out_dir = (_repo_root() / "output" / "omnivoice_webui").resolve()
    file_path = (out_dir / safe_name).resolve()
    if not file_path.exists() or file_path.parent != out_dir:
        raise HTTPException(status_code=404, detail="File not found")

    from fastapi.responses import FileResponse

    return FileResponse(str(file_path), media_type="audio/wav", filename=safe_name)
