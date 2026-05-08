#!/usr/bin/env node
// Standalone runner: node run.js <input>
import { pipeline } from "./src/pipeline.js";
import { logger } from "./src/utils/logger.js";

const arg = process.argv[2];

if (!arg) {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         Short Video Gen AI - Powered by LMStudio     ║
╠══════════════════════════════════════════════════════╣
║  Cách dùng:                                          ║
║    node run.js {url}                                 ║
║    node run.js {file.md}                             ║
║    node run.js {storyboard.json}                     ║
║                                                      ║
║  Hoặc qua npm:                                       ║
║    npm run gen -- {url}                              ║
║    npm run gen -- {file.md}                          ║
║    npm run gen -- {storyboard.json}                  ║
║                                                      ║
║  Ví dụ:                                              ║
║    node run.js example-storyboard.json               ║
║    npm run gen -- example-storyboard.json            ║
╚══════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

logger.info("🎬 Short Video Gen AI Starting...");
logger.info(`📥 Input: ${arg}`);

try {
  await pipeline(arg);
} catch (err) {
  logger.error(`❌ Pipeline failed: ${err.message}`);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
}