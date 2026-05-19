# OmniVoice local server

This folder provides a small FastAPI server so the Node pipeline can call OmniVoice over HTTP (model stays warm in GPU memory).

## 1) Prepare reference audio

- Put your voice reference at `assets/voice/ref.wav` (recommended 3–10 seconds).
- You can also change `config.omnivoice.refAudioPath` in `src/config.js`.

## 2) Create Python env + install

From the repo root:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r omnivoice_server/requirements.txt
```

`requirements.txt` pins `omnivoice==0.1.5`, the latest stable upstream release checked on 2026-05-19. Install the correct PyTorch build for your CUDA version if needed (see PyTorch official instructions).

## 3) Run server

```bash
uvicorn omnivoice_server.app:app --host 0.0.0.0 --port 8001
```

By default the server requires CUDA (`OMNIVOICE_REQUIRE_CUDA=1`). To allow CPU (slow), set `OMNIVOICE_REQUIRE_CUDA=0` before starting uvicorn.

## 4) WebUI (optional)

This repo includes a minimal WebUI on the same server:

- Open: `http://127.0.0.1:8001/`
- Generate endpoint: `POST /webui/generate`
- Audio files: `GET /webui/files/<name>.wav`

Emotion presets are approximated by swapping reference clips:

- Default config (`src/config.js`) points presets to these files:
  - `assets/voice/ref.wav` (neutral)
  - `assets/voice/hype.wav`
  - `assets/voice/serious.wav`
  - `assets/voice/sad.wav`
- You can alternatively store them under `assets/voice/refs/*` and update `config.omnivoice.refAudioPresets` accordingly.

Health check:

```bash
curl http://127.0.0.1:8001/health
```

## Notes

- This server is intended for **local use only**.
- OmniVoice supports voice cloning; use responsibly and comply with local laws and permissions.
