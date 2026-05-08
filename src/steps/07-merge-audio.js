/**
 * Step 7: Merge individual scene audio files into the rendered video.
 *
 * Strategy:
 *  1. Build a concat audio track by placing each scene's audio at its scene's startTime
 *  2. Use ffmpeg to mix the audio track into the rendered video MP4
 *  3. Output final MP4 to {outputDir}/{slug}.mp4
 */

import { execSync } from "child_process";
import { existsSync, copyFileSync, writeFileSync } from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

export async function mergeAudio(renderedMp4, audioFiles, storyboard, outputDir, slug) {
  const finalName = `${slug}.mp4`;
  const finalPath = path.join(outputDir, finalName);
  const nullDevice = process.platform === "win32" ? "nul" : "/dev/null";

  // Filter scenes that have audio
  const scenesWithAudio = storyboard.scenes.filter((s) => {
    const af = audioFiles.find((a) => a.sceneId === s.id);
    return af && af.audioPath && existsSync(af.audioPath);
  });

  if (scenesWithAudio.length === 0) {
    logger.warn("  No audio files found, copying video without audio merge");
    copyFileSync(renderedMp4, finalPath);
    return finalPath;
  }

  // Build silent base track matching total video duration
  const totalDuration = storyboard.totalDuration;
  const silencePath = path.join(outputDir, "audio", "silence.wav");

  logger.info(`  Building mixed audio track (${totalDuration.toFixed(2)}s)...`);

  try {
    // Create silence base
    execSync(
      `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${totalDuration} -ar 44100 "${silencePath}" -y 2>${nullDevice}`,
      { timeout: 30000 }
    );

    // Build ffmpeg command to mix all audio at correct timestamps
    const audioInputs = scenesWithAudio.map((scene) => {
      const af = audioFiles.find((a) => a.sceneId === scene.id);
      return `-i "${af.audioPath}"`;
    });

    const delayFilters = scenesWithAudio.map((scene, i) => {
      const delayMs = Math.round(scene.startTime * 1000);
      return `[${i + 1}:a]adelay=${delayMs}|${delayMs}[a${i}]`;
    });

    const mixInputs = scenesWithAudio.map((_, i) => `[a${i}]`).join("");
    const mixFilter = `${mixInputs}amix=inputs=${scenesWithAudio.length}:duration=longest:normalize=0[amix]`;

    const filterComplex = [...delayFilters, mixFilter].join(";");

    // Combined audio path
    const mixedAudioPath = path.join(outputDir, "audio", "mixed.wav");

    execSync(
      `ffmpeg -i "${silencePath}" ${audioInputs.join(" ")} -filter_complex "${filterComplex}" -map "[amix]" -ar 44100 "${mixedAudioPath}" -y 2>${nullDevice}`,
      { timeout: 120000 }
    );

    logger.info(`  Merging audio into video...`);

    // Merge audio into video
    execSync(
      `ffmpeg -i "${renderedMp4}" -i "${mixedAudioPath}" -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest "${finalPath}" -y 2>${nullDevice}`,
      { timeout: 120000 }
    );

    logger.info(`  ✅ Final video with audio: ${finalPath}`);

  } catch (err) {
    logger.warn(`  Audio merge failed: ${err.message}`);
    logger.warn(`  Copying video without merged audio...`);
    copyFileSync(renderedMp4, finalPath);
  }

  // Also copy the rendered video without audio for reference
  const rawVideoPath = path.join(outputDir, "video-raw.mp4");
  try { copyFileSync(renderedMp4, rawVideoPath); } catch {}

  return finalPath;
}