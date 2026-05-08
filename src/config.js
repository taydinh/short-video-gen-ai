/**
 * Configuration for short-video-gen-ai
 * Edit these settings to match your local environment.
 */

export const config = {
  // ── LMStudio (Local LLM) ──────────────────────────────────────────────────
  lmstudio: {
    baseUrl: "http://localhost:1234/v1",   // LMStudio API endpoint
    model: "local-model",                  // Model name shown in LMStudio (any loaded model)
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 120000,                        // 2 min timeout for LLM
  },

  // ── VieNeu TTS ────────────────────────────────────────────────────────────
  // Option A: VieNeu REST API (if self-hosted or cloud)
  vieneu: {
    apiUrl: "http://localhost:7860/api/tts", // Default VieNeu Gradio endpoint
    // apiUrl: "https://your-vieneu-host/api/tts",
    voice: "female_south",                  // female_south | female_north | male_south | male_north
    speed: 1.0,
    outputFormat: "mp3",
  },

  // googleTTS
  googleTTS: {
    enabled: true,
    lang: "vi",  // Vietnamese
    slow: false, // Normal speed
  },

  // ── HyperFrames ───────────────────────────────────────────────────────────
  hyperframes: {
    version: "0.5.3",
    width: 1080,   // 9:16 portrait for mobile
    height: 1920,
    fps: 30,
  },

  // ── Video ─────────────────────────────────────────────────────────────────
  video: {
    ratio: "9:16",
    bgColor: "#0d0d1a",  // Default dark background
    fontFamily: "Inter",
    // Scene color themes (cycled through scenes 2-7)
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
    keepHtml: true,   // Save HTML files for manual editing
    keepAudio: true,  // Keep individual scene audio files
  },
};