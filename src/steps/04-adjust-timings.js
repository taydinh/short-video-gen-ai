/**
 * Step 4: Adjust scene durations to match TTS audio length.
 * Adds a small buffer (0.3s) after each audio clip ends.
 * Saves adjusted storyboard as storyboard-timed.json
 */

import { writeFileSync } from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

const AUDIO_BUFFER = 0.3;    // Seconds after audio ends before scene transitions
const MIN_SCENE_DURATION = 2; // Minimum scene duration in seconds

export async function adjustTimings(storyboard, audioFiles, outputDir) {
  logger.info("  Matching scene durations to audio...");

  const audioMap = {};
  for (const a of audioFiles) {
    audioMap[a.sceneId] = a;
  }

  const timedScenes = [];
  let cursor = 0;

  for (const scene of storyboard.scenes) {
    const audio = audioMap[scene.id];
    let duration = scene.duration || 4;

    if (audio && audio.duration) {
      // Scene duration = audio duration + buffer
      duration = Math.max(MIN_SCENE_DURATION, audio.duration + AUDIO_BUFFER);
    }

    const timedScene = {
      ...scene,
      startTime: parseFloat(cursor.toFixed(3)),
      duration: parseFloat(duration.toFixed(3)),
      audioDuration: audio?.duration || 0,
      audioOffset: 0, // Audio starts at beginning of scene
    };

    logger.info(`  Scene ${scene.id}: ${timedScene.duration.toFixed(2)}s (audio: ${timedScene.audioDuration.toFixed(2)}s)`);

    timedScenes.push(timedScene);
    cursor += duration;
  }

  const timedStoryboard = {
    ...storyboard,
    scenes: timedScenes,
    totalDuration: parseFloat(cursor.toFixed(3)),
    adjustedAt: new Date().toISOString(),
  };

  // Save timed storyboard
  const outPath = path.join(outputDir, "storyboard-timed.json");
  writeFileSync(outPath, JSON.stringify(timedStoryboard, null, 2), "utf-8");
  logger.info(`  💾 Timed storyboard saved: ${outPath}`);
  logger.info(`  📊 Total video duration: ${timedStoryboard.totalDuration.toFixed(2)}s`);

  return timedStoryboard;
}