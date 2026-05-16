/**
 * Step 7: Upscale the silent HyperFrames render before audio is merged.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export async function upscaleVideo(renderedMp4, outputDir) {
  const upscale = config.video?.upscale;
  if (!upscale?.enabled) return renderedMp4;

  const width = Number(upscale.width) || 1440;
  const height = Number(upscale.height) || 2560;
  const algorithm = upscale.algorithm || "lanczos";
  const outputPath = path.join(outputDir, "video-upscaled-2k.mp4");

  logger.info(`  Upscaling raw video to ${width}x${height} with ${algorithm}...`);

  try {
    execSync(
      `ffmpeg -i "${renderedMp4}" -vf "scale=${width}:${height}:flags=${algorithm}" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -an "${outputPath}" -y`,
      { timeout: 600000, stdio: "pipe" }
    );

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
