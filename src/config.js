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
  vieneu: {
    enabled: true,
    apiUrl: "http://localhost:7860/api/tts",
    voice: "female_south",
    speed: 1.0,
    outputFormat: "mp3",
    timeout: 60000,
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

    // Karaoke subtitle from voiceText (HTML/CSS overlay - KHÔNG cần SRT)
    karaokeSubtitle: {
      enabled: true,
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
      enabled: true,
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