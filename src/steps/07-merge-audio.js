/**
 * Step 7: Merge individual scene audio files into the rendered video.
 * (Giữ nguyên code cũ, chỉ thêm export để dùng trong pipeline)
 */

import { execSync } from "child_process";
import { existsSync, copyFileSync, renameSync, unlinkSync } from "fs";
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

  if (scenesWithAudio.length === 0) {
    logger.warn("  No audio files found, copying video without audio merge");
    copyFileSync(renderedMp4, finalPath);
    return finalPath;
  }

  // Build silent base track matching total video duration
  const totalDuration = storyboard.totalDuration;
  const extension = config.vieneu.outputFormat || "mp3";
  const silencePath = path.join(outputDir, "audio", `silence.${extension}`);

  logger.info(`  Building mixed audio track (${totalDuration.toFixed(2)}s)...`);

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
      })
    ];

    const delayFilters = scenesWithAudio.map((scene, i) => {
      const delayMs = Math.round(scene.startTime * 1000);
      return `[${i + 1}:a]aformat=channel_layouts=stereo,adelay=${delayMs}|${delayMs}[a${i}]`;
    });

    const mixInputs = `[0:a]` + scenesWithAudio.map((_, i) => `[a${i}]`).join("");
    const numInputs = scenesWithAudio.length + 1;

    const mixFilter = `${mixInputs}amix=inputs=${numInputs}:duration=longest:normalize=0,volume=${numInputs}[amix]`;

    const filterComplex = [...delayFilters, mixFilter].join(";");

    const mixedAudioPath = path.join(outputDir, "audio", `mixed.${extension}`);

    execSync(
      `ffmpeg ${audioInputs.join(" ")} -filter_complex "${filterComplex}" -map "[amix]" -ar 44100 "${mixedAudioPath}" -y`,
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
  try { copyFileSync(renderedMp4, rawVideoPath); } catch { }

  return finalPath;
}
