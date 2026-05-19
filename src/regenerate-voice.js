/**
 * Regenerate scene voices for an existing output folder, then merge them into
 * the already-rendered video without re-rendering HyperFrames.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync } from "fs";
import path from "path";
import { generateTTS } from "./steps/03-generate-tts.js";
import { mergeAudio } from "./steps/07-merge-audio.js";
import { logger } from "./utils/logger.js";

export async function regenerateVoice(outputDirInput) {
  if (!outputDirInput) {
    throw new Error("Missing output directory. Usage: node src/index.js regen-voice output/<folder>");
  }

  const outputDir = path.resolve(outputDirInput);
  if (!existsSync(outputDir) || !statSync(outputDir).isDirectory()) {
    throw new Error(`Output directory not found: ${outputDir}`);
  }

  const storyboardPath = resolveStoryboardPath(outputDir);
  const storyboard = JSON.parse(readFileSync(storyboardPath, "utf-8"));
  if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) {
    throw new Error(`Invalid storyboard: missing scenes array in ${storyboardPath}`);
  }

  const slug = deriveOutputSlug(outputDir);
  const baseVideoPath = findBaseVideo(outputDir, slug);
  if (!baseVideoPath) {
    throw new Error(`Cannot find video-upscaled-2k.mp4, video-raw.mp4, or another usable MP4 in ${outputDir}`);
  }

  logger.info(`📁 Existing output: ${outputDir}`);
  logger.info(`🧾 Storyboard: ${storyboardPath}`);
  logger.info(`🎞️ Base video: ${baseVideoPath}`);

  backupExistingAudio(outputDir);
  backupExistingFinalVideo(outputDir, slug);

  logger.step(1, "Regenerating voice audio...");
  const audioFiles = await generateTTS(storyboard, outputDir);
  logger.info(`✅ Voice regenerated for ${audioFiles.length} scenes`);

  logger.step(2, "Merging regenerated voice into existing video...");
  const finalVideo = await mergeAudio(baseVideoPath, audioFiles, storyboard, outputDir, slug);
  logger.info(`✅ Regenerated voice merged: ${finalVideo}`);

  return { outputDir, finalVideo, audioFiles, storyboard };
}

function resolveStoryboardPath(outputDir) {
  const timedPath = path.join(outputDir, "storyboard-timed.json");
  if (existsSync(timedPath)) return timedPath;

  const storyboardPath = path.join(outputDir, "storyboard.json");
  if (existsSync(storyboardPath)) return storyboardPath;

  throw new Error(`Cannot find storyboard-timed.json or storyboard.json in ${outputDir}`);
}

function deriveOutputSlug(outputDir) {
  const dirName = path.basename(outputDir);
  const withoutDate = dirName.replace(/^\d{2}-\d{2}-\d{4}-/, "");
  return withoutDate || "regenerated-video";
}

function findBaseVideo(outputDir, slug) {
  const preferred = [
    path.join(outputDir, "video-upscaled-2k.mp4"),
    path.join(outputDir, "video-raw.mp4"),
  ];

  for (const candidate of preferred) {
    if (existsSync(candidate)) return candidate;
  }

  const finalName = `${slug}.mp4`;
  const files = readdirSync(outputDir)
    .filter((file) => file.toLowerCase().endsWith(".mp4"))
    .filter((file) => file !== finalName)
    .filter((file) => !file.includes(".voice-backup-"))
    .sort();

  if (files.length > 0) return path.join(outputDir, files[0]);

  const fallbackFinal = path.join(outputDir, finalName);
  return existsSync(fallbackFinal) ? fallbackFinal : null;
}

function backupExistingAudio(outputDir) {
  const audioDir = path.join(outputDir, "audio");
  if (!existsSync(audioDir)) {
    mkdirSync(audioDir, { recursive: true });
    return;
  }

  const backupDir = uniquePath(path.join(outputDir, `audio-backup-${timestamp()}`));
  renameSync(audioDir, backupDir);
  mkdirSync(audioDir, { recursive: true });
  logger.info(`🗂️ Old audio backed up: ${backupDir}`);
}

function backupExistingFinalVideo(outputDir, slug) {
  const finalPath = path.join(outputDir, `${slug}.mp4`);
  if (!existsSync(finalPath)) return;

  const parsed = path.parse(finalPath);
  const backupPath = uniquePath(path.join(parsed.dir, `${parsed.name}.voice-backup-${timestamp()}${parsed.ext}`));
  copyFileSync(finalPath, backupPath);
  logger.info(`🗂️ Old final video backed up: ${backupPath}`);
}

function uniquePath(basePath) {
  if (!existsSync(basePath)) return basePath;

  const parsed = path.parse(basePath);
  for (let i = 2; i < 100; i++) {
    const candidate = path.join(parsed.dir, `${parsed.name}-${i}${parsed.ext}`);
    if (!existsSync(candidate)) return candidate;
  }

  throw new Error(`Cannot create unique backup path for ${basePath}`);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "-",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join("");
}
