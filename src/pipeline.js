/**
 * Main pipeline orchestrator
 * Steps:
 *  1. Read input (URL / .md file / storyboard.json)
 *  2. Generate storyboard.json via LMStudio
 *  3. Generate TTS audio per scene
 *  4. Adjust scene durations to match audio
 *  5. Build HyperFrames HTML project
 *  6. Render video via HyperFrames CLI
 *  7. Merge audio tracks into final MP4
 */

import { existsSync, readdirSync } from "fs";
import path from "path";
import { logger } from "./utils/logger.js";
import { readInput } from "./steps/01-read-input.js";
import { generateStoryboard, enrichFootballTeams } from "./steps/02-generate-storyboard.js";
import { generateTTS } from "./steps/03-generate-tts.js";
import { adjustTimings } from "./steps/04-adjust-timings.js";
import { buildHyperFrames } from "./steps/05-build-hyperframes.js";
import { renderVideo } from "./steps/06-render-video.js";
import { mergeAudio } from "./steps/07-merge-audio.js";
import { createOutputDir } from "./utils/fs-helpers.js";
import { config } from "./config.js";

export async function pipeline(input) {
  const startTime = Date.now();

  // ── Step 0: Prepare output directory ──────────────────────────────────────
  const { outputDir, slug } = await createOutputDir(input);
  logger.info(`📁 Output directory: ${outputDir}`);

  // ── Step 1: Read input content ────────────────────────────────────────────
  logger.step(1, "Reading input...");
  const { content, title, isStoryboard, storyboardData } = await readInput(input);

  let storyboard;

  if (isStoryboard) {
    logger.info("✅ Using provided storyboard JSON");
    storyboard = storyboardData;
    if (!storyboard.scenes || storyboard.scenes.length === 0) {
      throw new Error("Invalid storyboard: missing scenes array");
    }
    // Best-effort: enrich football teams with local flag/logo assets.
    storyboard = await enrichFootballTeams(storyboard);
  } else {
    // ── Step 2: Generate storyboard via LMStudio ─────────────────────────────
    logger.step(2, "Generating storyboard with LMStudio...");
    storyboard = await generateStoryboard(content, title, outputDir);
    logger.info(`✅ Storyboard generated: ${storyboard.scenes.length} scenes`);
  }

  // ── Step 3: Generate TTS audio ────────────────────────────────────────────
  logger.step(3, "Generating TTS audio...");
  const audioFiles = await generateTTS(storyboard, outputDir);
  logger.info(`✅ Audio generated for ${audioFiles.length} scenes`);

  // ── Step 4: Adjust scene timings ──────────────────────────────────────────
  logger.step(4, "Adjusting scene timings to match audio...");
  const timedStoryboard = await adjustTimings(storyboard, audioFiles, outputDir);
  logger.info(`✅ Timings adjusted. Total duration: ${timedStoryboard.totalDuration.toFixed(2)}s`);

  // ── Step 5: Build HyperFrames project ─────────────────────────────────────
  logger.step(5, "Building HyperFrames HTML project...");
  const projectDir = await buildHyperFrames(timedStoryboard, audioFiles, outputDir);
  logger.info(`✅ HyperFrames project built: ${projectDir}`);

  // ── Step 6: Render video ──────────────────────────────────────────────────
  logger.step(6, "Rendering video with HyperFrames...");
  let renderedMp4;
  try {
    renderedMp4 = await renderVideo(projectDir, outputDir);
    logger.info(`✅ Video rendered: ${renderedMp4}`);
  } catch (err) {
    logger.error(`❌ Video rendering failed: ${err.message}`);
    const possibleMp4 = findExistingMp4(outputDir);
    if (possibleMp4) {
      renderedMp4 = possibleMp4;
      logger.info(`Found existing MP4: ${renderedMp4}`);
    } else {
      throw new Error(`Cannot proceed without video file: ${err.message}`);
    }
  }

  // ── Step 7: Merge audio into video ────────────────────────────────────────
  logger.step(7, "Merging audio tracks into final video...");
  let finalVideo;
  try {
    finalVideo = await mergeAudio(renderedMp4, audioFiles, timedStoryboard, outputDir, slug);
    logger.info(`✅ Audio merged: ${finalVideo}`);
  } catch (err) {
    logger.error(`❌ Audio merge failed: ${err.message}`);
    finalVideo = renderedMp4;
  }

  // ── Final Summary ─────────────────────────────────────────────────────────
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  logger.info(`\n${"═".repeat(60)}`);
  logger.success(`🎉 Pipeline complete in ${duration}s!`);
  logger.info(`${"═".repeat(60)}`);
  logger.info(`📹 Final video: ${finalVideo}`);
  logger.info(`📂 Project files: ${outputDir}`);
  logger.info(`${"═".repeat(60)}\n`);

  return {
    finalVideo,
    outputDir,
    storyboard: timedStoryboard,
    duration: timedStoryboard.totalDuration
  };
}

// Helper: Find existing MP4 in output directory
function findExistingMp4(outputDir) {
  try {
    const files = readdirSync(outputDir);
    const mp4File = files.find(f => f.endsWith(".mp4") && !f.includes("-with-subs"));
    if (mp4File) {
      return path.join(outputDir, mp4File);
    }

    const hyperframesDir = path.join(outputDir, "hyperframes");
    if (existsSync(hyperframesDir)) {
      const hyperFiles = readdirSync(hyperframesDir);
      const hyperMp4 = hyperFiles.find(f => f.endsWith(".mp4"));
      if (hyperMp4) {
        return path.join(hyperframesDir, hyperMp4);
      }
    }
  } catch (err) {
    logger.debug(`Error finding existing MP4: ${err.message}`);
  }
  return null;
}
