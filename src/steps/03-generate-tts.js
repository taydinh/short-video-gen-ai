/**
 * Step 3: Generate TTS audio for each scene
 * 
 * Priority:
 *   1. VieNeu-TTS (local Gradio)
 *   2. Google Translate TTS (fallback)
 *   3. Silent audio (last resort)
 */

import { writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { getAudioDuration } from "../utils/audio-utils.js";

export async function generateTTS(storyboard, outputDir) {
  const audioDir = path.join(outputDir, "audio");
  if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });

  const results = [];

  for (const scene of storyboard.scenes) {
    const text = scene.voiceText;
    if (!text || text.trim() === "") {
      logger.warn(`Scene ${scene.id}: no voiceText, skipping TTS`);
      results.push({ sceneId: scene.id, audioPath: null, duration: scene.duration || 3 });
      continue;
    }

    logger.info(`  🎙️ Scene ${scene.id}: "${text.slice(0, 50)}..."`);

    const extension = config.vieneu.outputFormat || "mp3";
    const audioPath = path.join(audioDir, `scene-${scene.id}.${extension}`);
    let duration = scene.duration || 4;
    let success = false;

    // Try VieNeu TTS first
    if (config.vieneu.enabled) {
      try {
        logger.info(`     Trying VieNeu TTS...`);
        const ttsResult = await callVieNeuTTS(text, audioPath);
        const actualPath = ttsResult || audioPath;
        if (existsSync(actualPath) && (await getAudioDuration(actualPath)) > 0.5) {
          duration = await getAudioDuration(actualPath);

          // Apply speed up if needed
          const finalPath = await applySpeedUp(actualPath, config.vieneu.speed);
          const finalDuration = await getAudioDuration(finalPath);

          logger.info(`     ✅ VieNeu success: ${finalDuration.toFixed(2)}s (speed: ${config.vieneu.speed || 1})`);
          results.push({ sceneId: scene.id, audioPath: finalPath, duration: finalDuration });
          success = true;
        } else {
          logger.warn(`     VieNeu returned invalid audio`);
        }
      } catch (err) {
        logger.warn(`     VieNeu failed: ${err.message}`);
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
    execSync(
      `ffmpeg -i "${audioPath}" -filter:a "${atempoFilter}" -c:a libmp3lame -q:a 2 "${speedPath}" -y`,
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

// ── VieNeu TTS API call ──────────────────────────────────────────────────────

async function callVieNeuTTS(text, outputPath) {
  const { default: fetch } = await import("node-fetch");
  const url = config.vieneu.apiUrl;

  let audioData = null;

  // Attempt 1: Standard REST API
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice: config.vieneu.voice,
        speed: config.vieneu.speed,
        format: config.vieneu.outputFormat,
      }),
      signal: AbortSignal.timeout(config.vieneu.timeout || 60000),
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("audio")) {
        audioData = Buffer.from(await res.arrayBuffer());
      } else {
        const json = await res.json();
        if (json.audio) {
          audioData = Buffer.from(json.audio, "base64");
        } else if (json.data?.[0]) {
          const b64 = json.data[0].replace(/^data:audio\/\w+;base64,/, "");
          audioData = Buffer.from(b64, "base64");
        }
      }
    }
  } catch (e) {
    // Fall through
  }

  // Attempt 2: Gradio /run/predict format
  if (!audioData) {
    try {
      const gradioUrl = url.replace(/\/api\/tts$/, "/run/predict");
      const res = await fetch(gradioUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [text, config.vieneu.voice, config.vieneu.speed],
          fn_index: 0,
        }),
        signal: AbortSignal.timeout(config.vieneu.timeout || 60000),
      });

      if (res.ok) {
        const json = await res.json();
        const b64 = (json.data?.[0] || "").replace(/^data:audio\/\w+;base64,/, "");
        if (b64) audioData = Buffer.from(b64, "base64");
      }
    } catch (e) {
      // Fall through
    }
  }

  if (!audioData || audioData.length < 100) {
    throw new Error("VieNeu returned no audio data");
  }

  writeFileSync(outputPath, audioData);
  return outputPath;
}

// ── Google Translate TTS (reliable fallback) ─────────────────────────────────

async function callGoogleTTS(text, outputPath) {
  const { default: fetch } = await import("node-fetch");

  // Google Translate TTS endpoint
  const url = "https://translate.google.com/translate_tts";

  // Limit text length (Google TTS has limits)
  const truncatedText = text.slice(0, 200);

  const params = new URLSearchParams({
    ie: "UTF-8",
    q: truncatedText,
    tl: config.googleTTS.lang || "vi",
    client: "tw-ob",
    ttsspeed: config.googleTTS.slow ? "0.5" : "1",  // Note: Google only supports slow or normal
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

  // If output path is already mp3, just write it
  if (outputPath.endsWith(".mp3")) {
    writeFileSync(outputPath, audioBuffer);
    return outputPath;
  }

  // Otherwise convert MP3 to WAV using ffmpeg
  const tempMp3 = outputPath.replace(/\.wav$/, "_temp.mp3");
  writeFileSync(tempMp3, audioBuffer);

  try {
    // Try to convert to WAV with ffmpeg
    const nullDevice = process.platform === "win32" ? "nul" : "/dev/null";
    execSync(
      `ffmpeg -i "${tempMp3}" -ar 44100 -ac 2 "${outputPath}" -y`,
      { timeout: 15000, stdio: 'pipe' }
    );
    // Clean up temp file
    try { unlinkSync(tempMp3); } catch { }
    return outputPath;
  } catch {
    // If ffmpeg fails, use the MP3 as is (rename to .mp3)
    const mp3Path = outputPath.replace(/\.wav$/, ".mp3");
    writeFileSync(mp3Path, audioBuffer);
    // Update outputPath to mp3
    return mp3Path;
  }
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