#!/usr/bin/env node
/**
 * short-video-gen-ai
 * Usage:
 *   node src/index.js {url}
 *   node src/index.js {file.md}
 *   node src/index.js {storyboard.json}
 *   node src/index.js upload-youtube {storyboard.json}
 */

import { pipeline } from "./pipeline.js";
import { regenerateVoice } from "./regenerate-voice.js";
import { uploadYoutubeFromStoryboard } from "./youtube/upload-video.js";
import { logger } from "./utils/logger.js";

const command = process.argv[2];
const arg = process.argv[3];
const flags = process.argv.slice(4);

if (!command) {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         Short Video Gen AI - Powered by LMStudio     ║
╠══════════════════════════════════════════════════════╣
║  Usage:                                              ║
║    node src/index.js {url}                           ║
║    node src/index.js {file.md}                       ║
║    node src/index.js {storyboard.json}               ║
║    node src/index.js regen-voice {outputDir}         ║
║    node src/index.js upload-youtube {storyboard.json}║
╠══════════════════════════════════════════════════════╣
║  Config: src/config.js                               ║
║  Output: output/{dd-mm-yyyy}-{slug}/                 ║
╚══════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

logger.info(`🎬 Short Video Gen AI Starting...`);

try {
  if (command === "regen-voice" || command === "regenerate-voice") {
    logger.info(`📥 Output dir: ${arg}`);
    await regenerateVoice(arg);
  } else if (command === "upload-youtube") {
    logger.info(`📥 Storyboard: ${arg}`);
    await uploadYoutubeFromStoryboard(arg, {
      dryRun: flags.includes("--dry-run"),
    });
  } else {
    logger.info(`📥 Input: ${command}`);
    await pipeline(command);
  }
} catch (err) {
  logger.error(`Command failed: ${err.message}`);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
}
