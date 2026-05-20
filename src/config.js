/**
 * Configuration for short-video-gen-ai
 * Edit these settings to match your local environment.
 */

export const config = {
  // ── LMStudio (Local LLM) ──────────────────────────────────────────────────
  lmstudio: {
    baseUrl: "http://localhost:1234/v1",
    model: "local-model",
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 120000,
  },

  // ── TTS Configuration ─────────────────────────────────────────────────────
  omnivoice: {
    enabled: true,
    // OmniVoice local server (FastAPI). See `omnivoice_server/README.md`.
    serverUrl: "http://127.0.0.1:8001",
    // When true, only accept OmniVoice if server reports CUDA modelDevice.
    // If you want to allow CPU (slow), set this to false and set OMNIVOICE_REQUIRE_CUDA=0 on the server.
    requireGpu: false,
    // Voice reference for cloning (3–10s recommended).
    refAudioPath: "assets/voice/ref.wav",
    // Default "emotion" preset for scenes that don't specify one.
    // Note: OmniVoice doesn't accept an explicit emotion parameter; we approximate emotion by using different reference clips.
    defaultPreset: "neutral",
    // Optional per-emotion reference clips. If a scene sets `omnivoiceRefPreset`, we resolve it here.
    // Recommended: record 3–10s clips with the same speaker, different delivery.
    refAudioPresets: {
      // Defaults point to files that exist in this repo; replace with your own clips as needed.
      neutral: "assets/voice/ref.wav",
      hype: "assets/voice/hype.wav",
      serious: "assets/voice/serious.wav",
      sad: "assets/voice/sad.wav",
    },
    // Optional: leave empty to let OmniVoice auto-transcribe with Whisper.
    refText: "",
    // Output format for generated audio files.
    outputFormat: "wav",
    // Optional FFmpeg post-processing to reduce "rè"/noise and improve clarity.
    // Tip: if your ref audio is already clean, you can leave this disabled.
    enhance: {
      enabled: false,
      highpassHz: 80,
      lowpassHz: 12000,
      denoise: true,
      normalize: true,
      limiter: true,
    },
    // Optional post-speedup on Node side (ffmpeg). 1.0 = no change.
    speed: 1.0,
    // Delay between OmniVoice scene requests to keep local generation stable.
    // Increase this if generated voices contain small glitches when scenes are processed too quickly.
    sceneDelayMs: 2000,
    timeout: 120000,
  },

  googleTTS: {
    enabled: true,
    lang: "vi",
    speed: 1.3,
  },

  // ── HyperFrames ───────────────────────────────────────────────────────────
  hyperframes: {
    version: "0.5.3",
    width: 1080,
    height: 1920,
    fps: 60,
  },

  // ── Video Configuration ───────────────────────────────────────────────────
  video: {
    ratio: "9:16",
    bgColor: "#0d0d1a",
    fontFamily: "Inter",
    theme: "ai-news",

    upscale: {
      enabled: true,
      width: 1440,
      height: 2560,
      algorithm: "lanczos",
    },

    backgroundMusic: {
      enabled: true,
      src: "assets/audio/stadium-background-music.mp3",
      volume: 0.1,
    },

    // Final gain applied after voice + background music are mixed.
    masterVolume: 1.45,

    // Background layer (rendered in root index.html)
    background: {
      // Default to gradient to avoid warnings when bg-broll.mp4 isn't provided.
      mode: "gradient", // "video" | "gradient"
      src: "assets/bg-broll.mp4",
      blurPx: 10,
      dimOpacity: 0.55,
      overlay:
        "linear-gradient(180deg, rgba(6,10,18,0.65) 0%, rgba(6,10,18,0.50) 45%, rgba(6,10,18,0.75) 100%)",
      fallbackGradient:
        "linear-gradient(135deg, rgba(10,16,28,1) 0%, rgba(11,20,36,1) 45%, rgba(6,10,18,1) 100%)",
    },

    // Karaoke subtitle from voiceText (HTML/CSS overlay - KHÔNG cần SRT)
    karaokeSubtitle: {
      enabled: false,
      style: {
        fontSize: 42,
        fontFamily: "Inter",
        color: "#FFFFFF",
        highlightColor: "#7c3aed",
        backgroundColor: "rgba(0,0,0,0.75)",
        padding: "14px 28px",
        borderRadius: 60,
        wordsPerChunk: 4,         // Số từ hiển thị mỗi lần (4-5 từ/chunk)
        bottomOffset: 120,        // Khoảng cách từ đáy video (px)
        wordSpacing: "10px",
      },
    },

    // Scene caption (subtext) configuration - hiển thị trên scene
    sceneCaption: {
      enabled: false,
      style: {
        fontSize: 32,
        fontWeight: 600,
        position: "top",
        marginTop: 120,
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 50,
        padding: "10px 24px",
      },
    },

    // Root-level caption (phrase-based) - giống video mẫu
    phraseCaption: {
      enabled: true,
      style: {
        fontSize: 46,
        fontWeight: 800,
        letterSpacing: "0.01em",
        y: 0.76, // 0..1 of height
        color: "#ffffff",
        accentColor: "#8dd3ff",
        shadow: "0 10px 30px rgba(0,0,0,0.45)",
      },
      segment: {
        minWords: 2,
        maxWords: 6,
        fadeIn: 0.12,
        hold: 0.55,
        fadeOut: 0.18,
      },
    },

    // Scene color themes
    themes: [
      { bg: "#0d0d1a", accent: "#7c3aed", text: "#ffffff" },
      { bg: "#0a1628", accent: "#2563eb", text: "#ffffff" },
      { bg: "#0d1a0d", accent: "#16a34a", text: "#ffffff" },
      { bg: "#1a0d0d", accent: "#dc2626", text: "#ffffff" },
      { bg: "#1a1a0d", accent: "#d97706", text: "#ffffff" },
      { bg: "#0d1a1a", accent: "#0891b2", text: "#ffffff" },
    ],
  },

  // ── Content Fetching ──────────────────────────────────────────────────────
  fetch: {
    timeout: 30000,
    userAgent: "Mozilla/5.0 (compatible; ShortVideoGenAI/1.0)",
  },

  // ── Output ────────────────────────────────────────────────────────────────
  output: {
    dir: "./output",
    keepHtml: true,
    keepAudio: true,
    keepSrt: false,  // TẮT tạo file SRT
  },

  // ── Visual Effects ────────────────────────────────────────────────────────
  visuals: {
    enabled: true,
    imageSearch: {
      provider: "picsum",
      apiKey: "",
      fallbackToPlaceholder: true,
    },
    animation: {
      maxParticles: 80,
      defaultDuration: 3,
      defaultOpacity: 0.3,
    },
    diagram: {
      nodeRadius: 60,
      lineWidth: 3,
      animationSpeed: "normal",
    },
  },
};
