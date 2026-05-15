/**
 * Step 3: Generate TTS audio for each scene
 * 
 * Priority:
 *   1. OmniVoice (local server)
 *   2. Google Translate TTS (fallback)
 *   3. Silent audio (last resort)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { getAudioDuration } from "../utils/audio-utils.js";
import { normalizeVoiceTextForTTS } from "../utils/voice-text.js";

export async function generateTTS(storyboard, outputDir) {
  const audioDir = path.join(outputDir, "audio");
  if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });

  const results = [];

  const extension = config.omnivoice?.outputFormat || "wav";
  const omnivoiceDefaultRefPath = resolvePath(getDefaultOmniVoiceRefAudioPath());
  const omnivoiceEnhance = config.omnivoice?.enhance || {};

  let canUseOmniVoice = !!config.omnivoice?.enabled;
  if (canUseOmniVoice) {
    if (!omnivoiceDefaultRefPath || !existsSync(omnivoiceDefaultRefPath)) {
      canUseOmniVoice = false;
      logger.warn(
        `  ⚠️ OmniVoice default ref audio not found (resolved: ${omnivoiceDefaultRefPath || "n/a"}). ` +
        `Please set config.omnivoice.refAudioPath or provide config.omnivoice.refAudioPresets.<preset>. Falling back to Google TTS.`
      );
    }
  }

  if (canUseOmniVoice) {
    try {
      const ok = await probeOmniVoice();
      if (!ok) canUseOmniVoice = false;
    } catch {
      canUseOmniVoice = false;
    }

    if (!canUseOmniVoice) {
      logger.warn(`  ⚠️ OmniVoice server unavailable at ${config.omnivoice?.serverUrl}. Falling back to Google TTS.`);
    }
  }

  for (const scene of storyboard.scenes) {
    const text = normalizeVoiceTextForTTS(scene.voiceText);
    if (!text || text.trim() === "") {
      logger.warn(`Scene ${scene.id}: no voiceText, skipping TTS`);
      results.push({ sceneId: scene.id, audioPath: null, duration: scene.duration || 3 });
      continue;
    }

    logger.info(`  🎙️ Scene ${scene.id}: "${text.slice(0, 50)}..."`);

    const audioPath = path.join(audioDir, `scene-${scene.id}.${extension}`);
    let duration = scene.duration || 4;
    let success = false;

    // Try OmniVoice first
    if (canUseOmniVoice) {
      try {
        const { preset, refAudioPath } = resolveOmniVoiceRefForScene(scene, omnivoiceDefaultRefPath);
        logger.info(`     Ref preset: ${preset} (${refAudioPath})`);
        logger.info(`     Trying OmniVoice...`);
        const ttsResult = await callOmniVoiceTTS(text, audioPath, refAudioPath);
        const actualPath = ttsResult || audioPath;
        if (existsSync(actualPath) && (await getAudioDuration(actualPath)) > 0.5) {
          duration = await getAudioDuration(actualPath);

          // Apply speed up if needed
          const spedPath = await applySpeedUp(actualPath, config.omnivoice?.speed);
          const enhancedPath = await enhanceAudio(spedPath, omnivoiceEnhance);
          const finalDuration = await getAudioDuration(enhancedPath);

          logger.info(`     ✅ OmniVoice success: ${finalDuration.toFixed(2)}s (speed: ${config.omnivoice?.speed || 1})`);
          results.push({ sceneId: scene.id, audioPath: enhancedPath, duration: finalDuration });
          success = true;
        } else {
          logger.warn(`     OmniVoice returned invalid audio`);
        }
      } catch (err) {
        logger.warn(`     OmniVoice failed: ${err.message}`);
      }
    }

    // Fallback to Google Translate TTS
    if (!success) {
      try {
        logger.info(`     Trying Google Translate TTS...`);
        const ttsResult = await callGoogleTTS(text, audioPath);
        const actualPath = ttsResult || audioPath;
        if (existsSync(actualPath) && (await getAudioDuration(actualPath)) > 0.5) {
          // Apply speed up if configured
          const speedFactor = config.googleTTS.speed || 1;
          const finalPath = (speedFactor !== 1)
            ? await speedUpAudio(actualPath, audioPath.replace(/\.(mp3|wav)$/, `_speed.${extension}`), speedFactor)
            : actualPath;

          duration = await getAudioDuration(finalPath);
          logger.info(`     ✅ Google TTS success: ${duration.toFixed(2)}s (speed: ${speedFactor})`);
          results.push({ sceneId: scene.id, audioPath: finalPath, duration });
          success = true;
        } else {
          logger.warn(`     Google TTS returned invalid audio`);
        }
      } catch (err) {
        logger.warn(`     Google TTS failed: ${err.message}`);
      }
    }

    // Last resort: silent audio
    if (!success) {
      logger.warn(`     ⚠️  All TTS failed, using silent audio placeholder`);
      await createSilentAudio(audioPath, duration);
      results.push({ sceneId: scene.id, audioPath, duration });
    }
  }

  return results;
}

function getDefaultOmniVoiceRefAudioPath() {
  const presetName = String(config.omnivoice?.defaultPreset || "neutral").trim() || "neutral";
  const presets = config.omnivoice?.refAudioPresets || {};
  const fromPreset = String(presets?.[presetName] || "").trim();
  const fromRefAudioPath = String(config.omnivoice?.refAudioPath || "").trim();

  // Prefer preset only if it exists on disk; otherwise fall back to refAudioPath.
  const presetResolved = resolvePath(fromPreset);
  if (fromPreset && presetResolved && existsSync(presetResolved)) return fromPreset;

  return fromRefAudioPath;
}

function resolveOmniVoiceRefForScene(scene, omnivoiceDefaultRefPath) {
  const presets = config.omnivoice?.refAudioPresets || {};

  const explicitPath = String(scene?.omnivoiceRefAudioPath || "").trim();
  if (explicitPath) {
    const resolved = resolvePath(explicitPath);
    if (resolved && existsSync(resolved)) return { preset: "custom", refAudioPath: resolved };
    logger.warn(`     ⚠️ Scene ${scene?.id}: omnivoiceRefAudioPath not found: ${explicitPath} (resolved: ${resolved || "n/a"}). Using default.`);
  }

  const preset = String(scene?.omnivoiceRefPreset || "").trim().toLowerCase();
  if (preset) {
    const candidate = String(presets?.[preset] || "").trim();
    const resolved = resolvePath(candidate);
    if (candidate && resolved && existsSync(resolved)) return { preset, refAudioPath: resolved };
    logger.warn(`     ⚠️ Scene ${scene?.id}: omnivoiceRefPreset "${preset}" missing ref audio (path: ${candidate || "(empty)"}). Using default.`);
  }

  return { preset: String(config.omnivoice?.defaultPreset || "neutral"), refAudioPath: omnivoiceDefaultRefPath };
}

// ── Apply speed up to audio using FFmpeg ─────────────────────────────────────

async function applySpeedUp(audioPath, speedFactor) {
  if (!speedFactor || speedFactor === 1) return audioPath;

  const parsedPath = path.parse(audioPath);
  const speedPath = path.join(parsedPath.dir, `${parsedPath.name}_speed${parsedPath.ext}`);

  // Check if already processed
  if (existsSync(speedPath) && speedPath !== audioPath) {
    return speedPath;
  }

  try {
    logger.info(`       ⚡ Speeding up audio: ${speedFactor}x`);

    // FFmpeg atempo filter (supports 0.5 to 2.0)
    // For speed > 2, chain multiple atempo filters
    let atempoFilter = "";
    if (speedFactor <= 2) {
      atempoFilter = `atempo=${speedFactor}`;
    } else {
      // Chain multiple filters: atempo=2.0,atempo=1.5 for speed=3.0
      const filters = [];
      let remaining = speedFactor;
      while (remaining > 2) {
        filters.push("atempo=2.0");
        remaining /= 2;
      }
      if (remaining > 1) {
        filters.push(`atempo=${remaining}`);
      }
      atempoFilter = filters.join(",");
    }

    const nullDevice = process.platform === "win32" ? "nul" : "/dev/null";

    const ext = (parsedPath.ext || "").toLowerCase();
    const isWav = ext === ".wav";
    const codecArgs = isWav
      ? `-c:a pcm_s16le -ar 44100 -ac 2`
      : `-c:a libmp3lame -q:a 2`;

    execSync(
      `ffmpeg -i "${audioPath}" -filter:a "${atempoFilter}" ${codecArgs} "${speedPath}" -y`,
      { timeout: 30000, stdio: 'pipe' }
    );

    // Clean up original file if different
    if (existsSync(speedPath) && speedPath !== audioPath) {
      try {
        unlinkSync(audioPath);
      } catch (e) { /* ignore */ }
    }

    logger.info(`       ✅ Speed up completed: ${speedPath}`);
    return speedPath;
  } catch (err) {
    logger.warn(`       Speed up failed: ${err.message}, using original`);
    return audioPath;
  }
}

// ── Optional clarity enhancement (FFmpeg) ───────────────────────────────────

async function enhanceAudio(audioPath, enhanceOptions) {
  if (!audioPath) return audioPath;
  if (!enhanceOptions || enhanceOptions.enabled !== true) return audioPath;
  if (!existsSync(audioPath)) return audioPath;

  const parsedPath = path.parse(audioPath);
  const enhancedPath = path.join(parsedPath.dir, `${parsedPath.name}_enhanced${parsedPath.ext}`);

  if (existsSync(enhancedPath) && enhancedPath !== audioPath) {
    return enhancedPath;
  }

  const filters = [];
  const hp = Number(enhanceOptions.highpassHz || 0);
  const lp = Number(enhanceOptions.lowpassHz || 0);

  if (Number.isFinite(hp) && hp > 0) filters.push(`highpass=f=${hp}`);
  if (Number.isFinite(lp) && lp > 0) filters.push(`lowpass=f=${lp}`);
  if (enhanceOptions.denoise !== false) filters.push("afftdn=nf=-25");
  if (enhanceOptions.normalize !== false) filters.push("dynaudnorm=f=150:g=15");
  if (enhanceOptions.limiter !== false) filters.push("alimiter=limit=0.97");

  const filterGraph = filters.join(",");
  if (!filterGraph) return audioPath;

  try {
    logger.info(`       🧼 Enhancing audio...`);

    const ext = (parsedPath.ext || "").toLowerCase();
    const isWav = ext === ".wav";
    const codecArgs = isWav
      ? `-c:a pcm_s16le -ar 44100 -ac 2`
      : `-c:a libmp3lame -q:a 2`;

    execSync(
      `ffmpeg -i "${audioPath}" -filter:a "${filterGraph}" ${codecArgs} "${enhancedPath}" -y`,
      { timeout: 30000, stdio: "pipe" }
    );

    if (existsSync(enhancedPath) && enhancedPath !== audioPath) {
      try { unlinkSync(audioPath); } catch { }
    }

    return enhancedPath;
  } catch (err) {
    logger.warn(`       Enhance failed: ${err.message}, using original`);
    return audioPath;
  }
}

// ── OmniVoice (local server) ────────────────────────────────────────────────

async function probeOmniVoice() {
  const { default: fetch } = await import("node-fetch");
  const baseUrl = String(config.omnivoice?.serverUrl || "").replace(/\/+$/, "");
  if (!baseUrl) return false;

  const res = await fetch(`${baseUrl}/health`, {
    method: "GET",
    signal: AbortSignal.timeout(config.omnivoice?.timeout || 120000),
  });

  if (!res.ok) return false;
  try {
    const json = await res.json();
    if (!json?.ok) return false;
    if (json?.modelLoaded === false) return false;

    const requireGpu = config.omnivoice?.requireGpu !== false;
    if (requireGpu) {
      const modelDevice = String(json?.modelDevice || "").toLowerCase();
      const cudaAvailable = json?.cudaAvailable !== false;
      const okGpu = cudaAvailable && (modelDevice.startsWith("cuda") || modelDevice === "cuda");
      if (!okGpu) {
        logger.warn(
          `OmniVoice health ok but not on GPU (requireGpu=true). modelDevice=${json?.modelDevice || "(unknown)"} cudaAvailable=${json?.cudaAvailable}`
        );
        return false;
      }
    }

    return true;
  } catch {
    return true;
  }
}

async function callOmniVoiceTTS(text, outputPath, refAudioPath) {
  const { default: fetch } = await import("node-fetch");

  const baseUrl = String(config.omnivoice?.serverUrl || "").replace(/\/+$/, "");
  if (!baseUrl) throw new Error("OmniVoice serverUrl is not configured");
  if (!refAudioPath || !existsSync(refAudioPath)) throw new Error(`OmniVoice ref audio missing: ${refAudioPath || "(empty)"}`);

  const absOutputPath = resolvePath(outputPath);
  const res = await fetch(`${baseUrl}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      ref_audio_path: refAudioPath,
      ref_text: config.omnivoice?.refText || "",
      output_path: absOutputPath,
      output_sr: 24000,
    }),
    signal: AbortSignal.timeout(config.omnivoice?.timeout || 120000),
  });

  if (!res.ok) {
    const body = await safeReadText(res);
    throw new Error(`OmniVoice HTTP ${res.status}: ${body || res.statusText}`);
  }

  const json = await res.json().catch(() => null);
  const returnedPath = json?.outputPath || json?.output_path || absOutputPath;
  return returnedPath;
}

// ── Google Translate TTS (reliable fallback) ─────────────────────────────────

async function callGoogleTTS(text, outputPath) {
  const { default: fetch } = await import("node-fetch");

  // Google Translate TTS endpoint
  const url = "https://translate.google.com/translate_tts";

  // Google Translate TTS has a per-request text limit (~200 chars for this endpoint).
  // If we truncate, the voice will read missing content; instead we chunk & concat.
  const maxChars = config.googleTTS?.maxCharsPerRequest || 200;
  const chunks = splitTextByMaxChars(text, maxChars);
  if (chunks.length === 0) throw new Error("Google TTS: empty text");

  const requestAudio = async (chunkText) => {
    const params = new URLSearchParams({
      ie: "UTF-8",
      q: chunkText,
      tl: config.googleTTS.lang || "vi",
      client: "tw-ob",
      ttsspeed: config.googleTTS.slow ? "0.5" : "1", // Note: Google only supports slow or normal
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://translate.google.com/",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Google TTS HTTP ${response.status}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    if (audioBuffer.length < 100) {
      throw new Error("Google TTS returned empty audio");
    }

    return audioBuffer;
  };

  // Fetch audio for each chunk and concatenate using ffmpeg (mp3 concat).
  const tmpDir = path.dirname(outputPath);
  const baseName = path.basename(outputPath).replace(/\.(mp3|wav)$/i, "");
  const tempParts = [];
  try {
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const partPath = path.join(tmpDir, `${baseName}__gtts_part${String(idx + 1).padStart(2, "0")}.mp3`);
      const buf = await requestAudio(chunk);
      writeFileSync(partPath, buf);
      tempParts.push(partPath);
    }

    const combinedMp3 = outputPath.endsWith(".mp3")
      ? outputPath
      : outputPath.replace(/\.wav$/i, "_combined.mp3");

    if (tempParts.length === 1) {
      // Fast path: single chunk
      if (tempParts[0] !== combinedMp3) {
        writeFileSync(combinedMp3, readFileSync(tempParts[0]));
      }
    } else {
      const listPath = path.join(tmpDir, `${baseName}__gtts_concat.txt`);
      const listBody = tempParts.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
      writeFileSync(listPath, listBody);
      execSync(
        `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${combinedMp3}" -y`,
        { timeout: 30000, stdio: "pipe" }
      );
      try { unlinkSync(listPath); } catch { }
    }

    // If output path is already mp3, we're done
    if (outputPath.endsWith(".mp3")) return combinedMp3;

    // Otherwise convert MP3 to WAV using ffmpeg
    try {
      execSync(
        `ffmpeg -i "${combinedMp3}" -ar 44100 -ac 2 "${outputPath}" -y`,
        { timeout: 15000, stdio: "pipe" }
      );
      return outputPath;
    } catch {
      // If ffmpeg fails, use the MP3 as is (rename to .mp3)
      const mp3Path = outputPath.replace(/\.wav$/i, ".mp3");
      try {
        writeFileSync(mp3Path, readFileSync(combinedMp3));
      } catch {
        // As a last resort, just return the combined mp3 path we have
        return combinedMp3;
      }
      return mp3Path;
    }
  } finally {
    // Clean up part files
    for (const p of tempParts) {
      try { unlinkSync(p); } catch { }
    }
  }
}

function resolvePath(p) {
  if (!p) return "";
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

async function safeReadText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function splitTextByMaxChars(text, maxChars) {
  const clean = String(text || "").trim().replace(/\s+/g, " ");
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  // Prefer splitting on sentence-ish boundaries first.
  const hardParts = clean.split(/(?<=[.!?…]|[。！？])\s+/u);
  const out = [];
  for (const part of hardParts) {
    const p = part.trim();
    if (!p) continue;
    if (p.length <= maxChars) {
      out.push(p);
      continue;
    }

    // Fallback: pack words into maxChars buckets.
    const words = p.split(/\s+/);
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length <= maxChars) {
        cur = next;
      } else {
        if (cur) out.push(cur);
        // If a single token exceeds maxChars, hard-slice it.
        if (w.length > maxChars) {
          for (let i = 0; i < w.length; i += maxChars) out.push(w.slice(i, i + maxChars));
          cur = "";
        } else {
          cur = w;
        }
      }
    }
    if (cur) out.push(cur);
  }

  // Final cleanup
  return out.map(s => s.trim()).filter(Boolean);
}

// ── Create silent WAV placeholder (last resort) ───────────────────────────────

async function createSilentAudio(outputPath, durationSeconds) {
  try {
    const nullDevice = process.platform === "win32" ? "nul" : "/dev/null";
    const codec = outputPath.endsWith(".mp3") ? "libmp3lame" : "pcm_s16le";
    const bitrate = outputPath.endsWith(".mp3") ? "-b:a 128k" : "";
    execSync(
      `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${durationSeconds} -c:a ${codec} ${bitrate} "${outputPath}" -y`,
      { timeout: 15000, stdio: 'pipe' }
    );
  } catch {
    // Write minimal WAV header (44 bytes) as absolute fallback
    const sampleRate = 44100;
    const channels = 1;
    const bitsPerSample = 16;
    const numSamples = Math.floor(sampleRate * durationSeconds);
    const dataSize = numSamples * channels * (bitsPerSample / 8);
    const buf = Buffer.alloc(44 + dataSize);
    buf.write("RIFF", 0);
    buf.writeUInt32LE(36 + dataSize, 4);
    buf.write("WAVE", 8);
    buf.write("fmt ", 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(channels, 22);
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
    buf.writeUInt16LE(channels * (bitsPerSample / 8), 32);
    buf.writeUInt16LE(bitsPerSample, 34);
    buf.write("data", 36);
    buf.writeUInt32LE(dataSize, 40);
    // Fill with zeros (silence)
    for (let i = 44; i < buf.length; i++) buf[i] = 0;
    writeFileSync(outputPath, buf);
  }
}

// Helper function to speed up audio (alias for backwards compatibility)
async function speedUpAudio(inputPath, outputPath, speedFactor) {
  // First write to input path, then apply speed up
  if (inputPath !== outputPath && existsSync(inputPath)) {
    try {
      const filters = speedFactor <= 2
        ? `atempo=${speedFactor}`
        : `atempo=2.0,atempo=${speedFactor / 2}`;

      execSync(
        `ffmpeg -i "${inputPath}" -filter:a "${filters}" -c:a libmp3lame -q:a 2 "${outputPath}" -y`,
        { timeout: 30000, stdio: 'pipe' }
      );

      if (existsSync(outputPath)) {
        try { unlinkSync(inputPath); } catch (e) { }
        return outputPath;
      }
    } catch (err) {
      logger.warn(`Speed up failed: ${err.message}`);
    }
  }
  return inputPath;
}
