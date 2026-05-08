#!/usr/bin/env node
/**
 * short-video-gen-ai
 * Usage:
 *   node src/index.js {url}
 *   node src/index.js {file.md}
 *   node src/index.js {storyboard.json}
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { pipeline } from "./pipeline.js";
import { logger } from "./utils/logger.js";

const arg = process.argv[2];

if (!arg) {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         Short Video Gen AI - Powered by LMStudio     ║
╠══════════════════════════════════════════════════════╣
║  Usage:                                              ║
║    node src/index.js {url}                           ║
║    node src/index.js {file.md}                       ║
║    node src/index.js {storyboard.json}               ║
╠══════════════════════════════════════════════════════╣
║  Config: src/config.js                               ║
║  Output: output/{dd-mm-yyyy}-{slug}/                 ║
╚══════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

logger.info(`🎬 Short Video Gen AI Starting...`);
logger.info(`📥 Input: ${arg}`);

try {
  await pipeline(arg);
} catch (err) {
  logger.error(`❌ Pipeline failed: ${err.message}`);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
}