#!/usr/bin/env node
// Standalone runner: node run.js <input>
import { pipeline } from "./src/pipeline.js";
import { regenerateVoice } from "./src/regenerate-voice.js";
import { logger } from "./src/utils/logger.js";

const command = process.argv[2];
const arg = process.argv[3];
const flags = process.argv.slice(4);

if (!command) {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         Short Video Gen AI - Powered by LMStudio     ║
╠══════════════════════════════════════════════════════╣
║  Cách dùng:                                          ║
║    node run.js {url}                                 ║
║    node run.js {file.md}                             ║
║    node run.js {storyboard.json}                     ║
║    node run.js regen-voice {outputDir}               ║
║    node run.js upload-youtube {storyboard.json}      ║
║                                                      ║
║  Hoặc qua npm:                                       ║
║    npm run gen -- {url}                              ║
║    npm run gen -- {file.md}                          ║
║    npm run gen -- {storyboard.json}                  ║
║    npm run regen-voice -- {outputDir}                ║
║    npm run upload-youtube -- {storyboard.json}       ║
║                                                      ║
║  Ví dụ:                                              ║
║    node run.js example-storyboard.json               ║
║    npm run gen -- example-storyboard.json            ║
║    npm run regen-voice -- output\\19-05-2026-...      ║
║    node run.js upload-youtube storyboards\\...json    ║
╚══════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

logger.info("🎬 Short Video Gen AI Starting...");

try {
  if (command === "regen-voice" || command === "regenerate-voice") {
    logger.info(`📥 Output dir: ${arg}`);
    await regenerateVoice(arg);
  } else if (command === "upload-youtube") {
    logger.info(`📥 Storyboard: ${arg}`);
    const { uploadYoutubeFromStoryboard } = await import("./src/youtube/upload-video.js");
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
