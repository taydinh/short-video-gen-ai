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

Install the correct PyTorch build for your CUDA version if needed (see PyTorch official instructions).

## 3) Run server

```bash
uvicorn omnivoice_server.app:app --host 0.0.0.0 --port 8001
```

By default the server requires CUDA (`OMNIVOICE_REQUIRE_CUDA=1`). To allow CPU (slow), set `OMNIVOICE_REQUIRE_CUDA=0` before starting uvicorn.

Health check:

```bash
curl http://127.0.0.1:8001/health
```

## Notes

- This server is intended for **local use only**.
- OmniVoice supports voice cloning; use responsibly and comply with local laws and permissions.
