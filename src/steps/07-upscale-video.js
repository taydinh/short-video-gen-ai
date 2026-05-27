/**
 * Step 7: Upscale the silent HyperFrames render before audio is merged.
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export async function upscaleVideo(renderedMp4, outputDir) {
  const upscale = config.video?.upscale;
  if (!upscale?.enabled) return renderedMp4;

  const method = upscale.method || "ffmpeg";
  if (method === "realesrgan") {
    return upscaleWithRealEsrgan(renderedMp4, outputDir, upscale);
  }

  const width = Number(upscale.width) || 1440;
  const height = Number(upscale.height) || 2560;
  const algorithm = upscale.algorithm || "lanczos";
  const outputPath = path.join(outputDir, "video-upscaled-2k.mp4");

  logger.info(`  Upscaling raw video to ${width}x${height} with ${algorithm}...`);

  try {
    runCommand("ffmpeg", [
      "-i", renderedMp4,
      "-vf", `scale=${width}:${height}:flags=${algorithm}`,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-an",
      outputPath,
      "-y",
    ], 600000);

    if (!existsSync(outputPath)) {
      throw new Error("ffmpeg finished but did not create the upscaled video");
    }

    logger.info(`  ✅ Upscaled video: ${outputPath}`);
    return outputPath;
  } catch (err) {
    const detail = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`Video upscale failed: ${detail}`);
  }
}

function upscaleWithRealEsrgan(renderedMp4, outputDir, upscale) {
  const realEsrgan = upscale.realesrgan || {};
  const binPath = realEsrgan.binPath || "tools/realesrgan-ncnn-vulkan/realesrgan-ncnn-vulkan.exe";
  const modelPath = realEsrgan.modelPath || path.join(path.dirname(binPath), "models");
  const model = realEsrgan.model || "realesrgan-x4plus";
  const scale = Number(realEsrgan.scale) || 2;
  const timeout = Number(realEsrgan.timeoutMs) || 3600000;
  const framesDir = path.join(outputDir, "realesrgan-frames");
  const upscaledFramesDir = path.join(outputDir, "realesrgan-frames-2x");
  const outputPath = path.join(outputDir, "video-upscaled-realesrgan-2x.mp4");

  if (!existsSync(binPath)) {
    throw new Error(
      `Real-ESRGAN binary not found: ${binPath}. Update config.video.upscale.realesrgan.binPath.`
    );
  }
  if (!existsSync(modelPath)) {
    throw new Error(
      `Real-ESRGAN models folder not found: ${modelPath}. Update config.video.upscale.realesrgan.modelPath.`
    );
  }

  logger.info(`  Upscaling raw video with Real-ESRGAN ${scale}x (${model})...`);

  try {
    rmSync(framesDir, { recursive: true, force: true });
    rmSync(upscaledFramesDir, { recursive: true, force: true });
    mkdirSync(framesDir, { recursive: true });
    mkdirSync(upscaledFramesDir, { recursive: true });

    const fps = getVideoFps(renderedMp4);
    const framePattern = path.join(framesDir, "%08d.png");
    const upscaledFramePattern = path.join(upscaledFramesDir, "%08d.png");

    logger.info("  Extracting video frames...");
    runCommand("ffmpeg", [
      "-i", renderedMp4,
      "-vsync", "0",
      framePattern,
      "-y",
    ], timeout);

    logger.info("  Running Real-ESRGAN on extracted frames...");
    runCommand(binPath, [
      "-i", framesDir,
      "-o", upscaledFramesDir,
      "-m", modelPath,
      "-n", model,
      "-s", String(scale),
      "-f", "png",
    ], timeout);

    logger.info("  Encoding Real-ESRGAN frames to MP4...");
    runCommand("ffmpeg", [
      "-framerate", fps,
      "-i", upscaledFramePattern,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", String(realEsrgan.crf ?? 18),
      "-pix_fmt", "yuv420p",
      "-an",
      outputPath,
      "-y",
    ], timeout);

    if (!existsSync(outputPath)) {
      throw new Error("Real-ESRGAN finished but did not create the upscaled video");
    }

    logger.info(`  ✅ Real-ESRGAN 2x video: ${outputPath}`);
    return outputPath;
  } catch (err) {
    const detail = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`Real-ESRGAN upscale failed: ${detail}`);
  }
}

function getVideoFps(videoPath) {
  try {
    const raw = execFileSync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=r_frame_rate",
      "-of", "default=nokey=1:noprint_wrappers=1",
      videoPath,
    ], { encoding: "utf8" }).trim();

    return raw || String(config.hyperframes?.fps || 60);
  } catch {
    return String(config.hyperframes?.fps || 60);
  }
}

function runCommand(command, args, timeout) {
  execFileSync(command, args, { timeout, stdio: "pipe" });
}
