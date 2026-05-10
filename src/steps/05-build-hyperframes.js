/**
 * Step 5: Build the complete HyperFrames project structure
 *
 * Creates:
 *   {outputDir}/hyperframes/
 *     index.html          ← root composition
 *     meta.json
 *     package.json
 *     hyperframes.json
 *     compositions/
 *       scene-1.html      ← per-scene composition
 *       scene-2.html
 *       ...
 *     assets/             ← audio files copied here
 */

import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "fs";
import path from "path";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { buildSceneHtml } from "../composers/scene-composer.js";

export async function buildHyperFrames(storyboard, audioFiles, outputDir) {
  const projectDir = path.join(outputDir, "hyperframes");
  const compositionsDir = path.join(projectDir, "compositions");
  const assetsDir = path.join(projectDir, "assets");

  // Create directories
  [projectDir, compositionsDir, assetsDir].forEach((d) => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  });

  // Copy audio files into assets
  const audioMap = {};
  for (const a of audioFiles) {
    if (a.audioPath && existsSync(a.audioPath)) {
      const destName = `scene-${a.sceneId}.wav`;
      const destPath = path.join(assetsDir, destName);
      copyFileSync(a.audioPath, destPath);
      audioMap[a.sceneId] = destName;
    }
  }

  // Copy static assets (like logo.svg)
  const projectAssetsDir = path.join(process.cwd(), "assets");
  if (existsSync(projectAssetsDir)) {
    const fs = await import("fs");
    fs.readdirSync(projectAssetsDir).forEach(file => {
      copyFileSync(path.join(projectAssetsDir, file), path.join(assetsDir, file));
    });
  }

  // Build per-scene HTML compositions
  logger.info("  Building scene compositions...");
  for (const scene of storyboard.scenes) {
    const audioFile = audioMap[scene.id] || null;
    const html = buildSceneHtml(scene, audioFile);
    const filePath = path.join(compositionsDir, `scene-${scene.id}.html`);
    writeFileSync(filePath, html, "utf-8");
    logger.info(`  📄 scene-${scene.id}.html (${scene.composition}/${scene.animation})`);
  }

  // Build root index.html
  logger.info("  Building root index.html...");
  const indexHtml = buildIndexHtml(storyboard, audioMap);
  writeFileSync(path.join(projectDir, "index.html"), indexHtml, "utf-8");

  // Write config files
  writeFileSync(
    path.join(projectDir, "meta.json"),
    JSON.stringify({
      id: storyboard.slug || "short-video",
      name: storyboard.title || "Short Video",
      createdAt: new Date().toISOString(),
    }, null, 2)
  );

  writeFileSync(
    path.join(projectDir, "package.json"),
    JSON.stringify({
      name: storyboard.slug || "short-video",
      private: true,
      type: "module",
      scripts: {
        dev: `npx --yes hyperframes@${config.hyperframes.version} preview`,
        check: `npx --yes hyperframes@${config.hyperframes.version} lint && npx --yes hyperframes@${config.hyperframes.version} validate && npx --yes hyperframes@${config.hyperframes.version} inspect`,
        render: `npx --yes hyperframes@${config.hyperframes.version} render`,
        publish: `npx --yes hyperframes@${config.hyperframes.version} publish`,
      },
    }, null, 2)
  );

  writeFileSync(
    path.join(projectDir, "hyperframes.json"),
    JSON.stringify({
      $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
      registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
      paths: {
        blocks: "compositions",
        components: "compositions/components",
        assets: "assets",
      },
    }, null, 2)
  );

  logger.info(`  ✅ HyperFrames project ready: ${projectDir}`);
  return projectDir;
}

// ── Root index.html ──────────────────────────────────────────────────────────

function buildIndexHtml(storyboard, audioMap) {
  const { width, height } = config.hyperframes;
  const totalDuration = storyboard.totalDuration;

  // Scene divs
  const sceneDivs = storyboard.scenes.map((scene) => {
    return `
      <!-- Scene ${scene.id}: ${scene.title} -->
      <div
        id="scene-${scene.id}"
        class="scene clip"
        data-composition-id="scene-${scene.id}"
        data-composition-src="compositions/scene-${scene.id}.html"
        data-start="${scene.startTime}"
        data-duration="${scene.duration}"
        data-track-index="1"
        data-width="${width}"
        data-height="${height}"
      ></div>`;
  }).join("\n");

  // Main timeline transitions
  const transitions = storyboard.scenes.map((scene, i) => {
    if (i === 0) return "";
    const transitionStart = scene.startTime - 0.2;
    return `
      mainTl.fromTo("#scene-${scene.id}", { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" }, ${transitionStart.toFixed(3)});`;
  }).join("");

  // Scene exit transitions
  const exitTransitions = storyboard.scenes.slice(0, -1).map((scene) => {
    const exitTime = scene.startTime + scene.duration - 0.2;
    return `
      mainTl.to("#scene-${scene.id}", { opacity: 0, duration: 0.2, ease: "power2.in" }, ${exitTime.toFixed(3)});`;
  }).join("");

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${width}, height=${height}" />
    <title>${escapeHtml(storyboard.title)}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=block" rel="stylesheet" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        margin: 0;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: #000;
        font-family: "Inter", sans-serif;
      }
      .scene {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        opacity: 0;
      }
      #scene-1 { opacity: 1; }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${totalDuration}"
      data-width="${width}"
      data-height="${height}"
    >
      ${sceneDivs}
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const mainTl = gsap.timeline({ paused: true });
      mainTl.set("#scene-1", { opacity: 1 }, 0);
      ${transitions}
      ${exitTransitions}
      // Force root timeline to last the entire video duration
      mainTl.to({}, { duration: 0 }, ${totalDuration.toFixed(3)});
      window.__timelines["main"] = mainTl;
    </script>
  </body>
</html>`;
}

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}