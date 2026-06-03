import { existsSync, writeFileSync, readFileSync } from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { config } from "../config.js";
import { logger } from "./logger.js";

export function alignSubtitles(storyboard, audioFiles, outputDir) {
  const cfg = config.video?.subtitleAlignment || {};
  if (cfg.enabled !== true) {
    return null;
  }

  const provider = cfg.provider || "stable-ts";
  if (provider !== "stable-ts") {
    logger.warn(`  Subtitle alignment provider "${provider}" is not supported. Using estimated caption timing.`);
    return null;
  }

  const audioByScene = new Map(audioFiles.map((audio) => [audio.sceneId, audio]));
  const scenes = storyboard.scenes.map((scene) => {
    const audio = audioByScene.get(scene.id) || {};
    const subtitle = getDisplaySubtitle(scene);
    if (!scene.subtitle && subtitle) {
      logger.warn(`  Scene ${scene.id}: missing subtitle, falling back to voiceText for display.`);
    }
    return {
      id: scene.id,
      startTime: scene.startTime,
      duration: scene.duration,
      voiceText: scene.voiceText || "",
      subtitle,
      audioPath: audio.audioPath ? path.resolve(audio.audioPath) : null,
    };
  });

  const scriptPath = path.resolve("scripts", "align-subtitles-stable-ts.py");
  if (!existsSync(scriptPath)) {
    logger.warn(`  Subtitle alignment script not found: ${scriptPath}`);
    return null;
  }

  const inputPath = path.join(outputDir, "subtitle-align-input.json");
  const outputPath = path.join(outputDir, "subtitle-timings.json");
  const payload = {
    config: {
      model: cfg.model || "base",
      language: cfg.language || "vi",
      maxWordsPerCaption: cfg.maxWordsPerCaption || config.video?.phraseCaption?.segment?.maxWords || 6,
      timingOffsetSeconds: Number.isFinite(Number(cfg.timingOffsetSeconds)) ? Number(cfg.timingOffsetSeconds) : 0,
    },
    scenes,
  };

  writeFileSync(inputPath, JSON.stringify(payload, null, 2), "utf-8");

  const pythonPath = cfg.pythonPath || "python";
  const timeoutMs = cfg.timeoutMs || 600000;
  logger.info(`  Aligning subtitles with stable-ts (${payload.config.model})...`);

  const proc = spawnSync(pythonPath, [scriptPath, inputPath, outputPath], {
    cwd: process.cwd(),
    encoding: "utf-8",
    timeout: timeoutMs,
    windowsHide: true,
  });

  if (proc.error) {
    logger.warn(`  Subtitle alignment skipped: ${proc.error.message}`);
    return null;
  }

  if (proc.status !== 0) {
    const stderr = (proc.stderr || "").trim();
    logger.warn(`  Subtitle alignment failed (exit ${proc.status}). Using estimated caption timing.`);
    if (stderr) logger.warn(`  stable-ts: ${stderr.slice(-800)}`);
    return null;
  }

  if (!existsSync(outputPath)) {
    logger.warn("  Subtitle alignment finished without subtitle-timings.json. Using estimated caption timing.");
    return null;
  }

  try {
    const timings = JSON.parse(readFileSync(outputPath, "utf-8"));
    const alignedCount = (timings.scenes || []).filter((scene) => scene.source === "aligned").length;
    logger.info(`  ✅ Subtitle timings saved: ${outputPath} (${alignedCount}/${scenes.length} aligned)`);
    return timings;
  } catch (err) {
    logger.warn(`  Could not read subtitle timings: ${err.message}`);
    return null;
  }
}

function getDisplaySubtitle(scene) {
  return String(scene.subtitle || scene.voiceText || "").trim();
}
