/**
 * Step 7: Merge individual scene audio files into the rendered video.
 * (Giữ nguyên code cũ, chỉ thêm export để dùng trong pipeline)
 */

import { execSync } from "child_process";
import { existsSync, copyFileSync, mkdirSync, renameSync, unlinkSync } from "fs";
import path from "path";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export async function mergeAudio(renderedMp4, audioFiles, storyboard, outputDir, slug) {
  const finalName = `${slug}.mp4`;
  const finalPath = path.join(outputDir, finalName);
  const tmpFinalPath = renderedMp4 === finalPath
    ? path.join(outputDir, `${slug}-with-audio.tmp.mp4`)
    : finalPath;

  // Filter scenes that have audio
  const scenesWithAudio = storyboard.scenes.filter((s) => {
    const af = audioFiles.find((a) => a.sceneId === s.id);
    return af && af.audioPath && existsSync(af.audioPath);
  });

  const backgroundMusic = resolveBackgroundMusic();

  if (scenesWithAudio.length === 0 && !backgroundMusic) {
    logger.warn("  No audio files or background music found, copying video without audio merge");
    copyFileSync(renderedMp4, finalPath);
    return finalPath;
  }

  // Build silent base track matching total video duration
  const totalDuration = storyboard.totalDuration;
  const extension = config.omnivoice?.outputFormat || "wav";
  const audioDir = path.join(outputDir, "audio");
  if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });
  const silencePath = path.join(audioDir, `silence.${extension}`);

  logger.info(`  Building mixed audio track (${totalDuration.toFixed(2)}s)...`);
  if (backgroundMusic) {
    logger.info(`  Background music: ${backgroundMusic.src} (${Math.round(backgroundMusic.volume * 100)}%)`);
  }
  const masterVolume = resolveMasterVolume();
  logger.info(`  Master audio volume: ${Math.round(masterVolume * 100)}%`);

  try {
    // Create silence base
    const silenceCodec = extension === "mp3" ? "libmp3lame" : "pcm_s16le";
    execSync(
      `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${totalDuration} -c:a ${silenceCodec} "${silencePath}" -y`,
      { timeout: 30000, stdio: 'pipe' }
    );

    // Build ffmpeg command to mix all audio at correct timestamps
    const audioInputs = [
      `-i "${silencePath}"`,
      ...scenesWithAudio.map((scene) => {
        const af = audioFiles.find((a) => a.sceneId === scene.id);
        return `-i "${af.audioPath}"`;
      }),
      ...(backgroundMusic ? [`-stream_loop -1 -i "${backgroundMusic.src}"`] : [])
    ];

    const delayFilters = scenesWithAudio.map((scene, i) => {
      const delayMs = Math.round(scene.startTime * 1000);
      return `[${i + 1}:a]aformat=channel_layouts=stereo,adelay=${delayMs}|${delayMs}[a${i}]`;
    });

    const backgroundInputIndex = scenesWithAudio.length + 1;
    const backgroundFilter = backgroundMusic
      ? `[${backgroundInputIndex}:a]aformat=channel_layouts=stereo,atrim=0:${totalDuration.toFixed(3)},asetpts=PTS-STARTPTS,volume=${backgroundMusic.volume}[bg]`
      : null;

    const mixInputs = `[0:a]`
      + scenesWithAudio.map((_, i) => `[a${i}]`).join("")
      + (backgroundMusic ? "[bg]" : "");
    const numInputs = scenesWithAudio.length + 1 + (backgroundMusic ? 1 : 0);

    const mixFilter = `${mixInputs}amix=inputs=${numInputs}:duration=longest:normalize=0,volume=${masterVolume},alimiter=limit=0.95[amix]`;

    const filterComplex = [...delayFilters, backgroundFilter, mixFilter].filter(Boolean).join(";");

    const mixedAudioPath = path.join(audioDir, `mixed.${extension}`);
    const mixCodec = extension === "mp3" ? "libmp3lame" : "pcm_s16le";

    execSync(
      `ffmpeg ${audioInputs.join(" ")} -filter_complex "${filterComplex}" -map "[amix]" -ar 44100 -c:a ${mixCodec} "${mixedAudioPath}" -y`,
      { timeout: 120000, stdio: 'pipe' }
    );

    logger.info(`  Merging audio into video...`);

    execSync(
      `ffmpeg -i "${renderedMp4}" -i "${mixedAudioPath}" -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest "${tmpFinalPath}" -y`,
      { timeout: 120000, stdio: 'pipe' }
    );

    if (tmpFinalPath !== finalPath) {
      try { unlinkSync(finalPath); } catch { /* ignore */ }
      renameSync(tmpFinalPath, finalPath);
    }

    logger.info(`  ✅ Final video with audio: ${finalPath}`);

  } catch (err) {
    logger.warn(`  Audio merge failed: ${err.stderr ? err.stderr.toString() : err.message}`);
    logger.warn(`  Copying video without merged audio...`);
    copyFileSync(renderedMp4, finalPath);
  }

  const rawVideoPath = path.join(outputDir, "video-raw.mp4");
  if (!existsSync(rawVideoPath)) {
    try { copyFileSync(renderedMp4, rawVideoPath); } catch { }
  }

  return finalPath;
}

function resolveBackgroundMusic() {
  const musicConfig = config.video?.backgroundMusic;
  if (!musicConfig?.enabled || !musicConfig.src) return null;

  const src = path.isAbsolute(musicConfig.src)
    ? musicConfig.src
    : path.resolve(musicConfig.src);

  if (!existsSync(src)) {
    logger.warn(`  Background music not found: ${src}`);
    return null;
  }

  const rawVolume = Number(musicConfig.volume);
  const volume = Number.isFinite(rawVolume) ? Math.max(0, Math.min(rawVolume, 1)) : 0.3;

  return { src, volume };
}

function resolveMasterVolume() {
  const rawVolume = Number(config.video?.masterVolume);
  if (!Number.isFinite(rawVolume)) return 1;
  return Math.max(0.1, Math.min(rawVolume, 3));
}
