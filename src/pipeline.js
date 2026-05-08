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

import { readFileSync, existsSync } from "fs";
import path from "path";
import { logger } from "./utils/logger.js";
import { readInput } from "./steps/01-read-input.js";
import { generateStoryboard } from "./steps/02-generate-storyboard.js";
import { generateTTS } from "./steps/03-generate-tts.js";
import { adjustTimings } from "./steps/04-adjust-timings.js";
import { buildHyperFrames } from "./steps/05-build-hyperframes.js";
import { renderVideo } from "./steps/06-render-video.js";
import { mergeAudio } from "./steps/07-merge-audio.js";
import { createOutputDir } from "./utils/fs-helpers.js";

export async function pipeline(input) {
  // ── Step 0: Prepare output directory ──────────────────────────────────────
  const { outputDir, slug } = await createOutputDir(input);
  logger.info(`📁 Output directory: ${outputDir}`);

  // ── Step 1: Read input content ────────────────────────────────────────────
  logger.step(1, "Reading input...");
  const { content, title, isStoryboard, storyboardData } = await readInput(input);

  let storyboard;

  if (isStoryboard) {
    // Input is already a storyboard JSON
    logger.info("✅ Using provided storyboard JSON");
    storyboard = storyboardData;
  } else {
    // ── Step 2: Generate storyboard via LMStudio ─────────────────────────────
    logger.step(2, "Generating storyboard with LMStudio...");
    storyboard = await generateStoryboard(content, title, outputDir);
    logger.info(`✅ Storyboard generated: ${storyboard.scenes.length} scenes`);
  }

  // ── Step 3: Generate TTS audio ────────────────────────────────────────────
  logger.step(3, "Generating TTS audio via VieNeu...");
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
  const renderedMp4 = await renderVideo(projectDir, outputDir);
  logger.info(`✅ Video rendered: ${renderedMp4}`);

  // ── Step 7: Merge audio into final video ──────────────────────────────────
  logger.step(7, "Merging audio tracks into final video...");
  const finalVideo = await mergeAudio(renderedMp4, audioFiles, timedStoryboard, outputDir, slug);
  logger.info(`\n🎉 Pipeline complete!`);
  logger.info(`📹 Final video: ${finalVideo}`);
  logger.info(`📂 Project files: ${outputDir}`);

  return { finalVideo, outputDir, storyboard: timedStoryboard };
}