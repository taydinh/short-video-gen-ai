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

export async function buildHyperFrames(storyboard, audioFiles, outputDir, options = {}) {
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

  // Copy trimmed video clips into assets
  for (const scene of storyboard.scenes) {
    const clipConfigs = [];
    if (scene.videoClip && scene.videoClip.trimmedPath) clipConfigs.push(scene.videoClip);
    if (Array.isArray(scene.visuals)) {
      for (const v of scene.visuals) {
        if ((v.type === 'video' || v.type === 'video-clip-card') && v.trimmedPath) {
          clipConfigs.push(v);
        }
      }
    }

    for (let j = 0; j < clipConfigs.length; j++) {
      const clip = clipConfigs[j];
      if (clip.trimmedPath && existsSync(clip.trimmedPath)) {
        const clipDestDir = path.join(assetsDir, "video-clips");
        if (!existsSync(clipDestDir)) mkdirSync(clipDestDir, { recursive: true });
        const destName = `clip-scene-${scene.id}${clipConfigs.length > 1 ? `-${j}` : ''}.mp4`;
        const clipDest = path.join(clipDestDir, destName);
        copyFileSync(clip.trimmedPath, clipDest);
        // Update relative path for HTML reference
        clip._assetPath = `assets/video-clips/${destName}`;
      }
    }
  }

  // Copy static assets (like logo.svg)
  const projectAssetsDir = path.join(process.cwd(), "assets");
  if (existsSync(projectAssetsDir)) {
    const fs = await import("fs");
    copyDirRecursive(projectAssetsDir, assetsDir, fs);
  }

  // Resolve background mode (avoid render failure when bg video is missing)
  const cfgBg = config.video.background || {};
  let effectiveBackgroundMode = cfgBg.mode || "gradient";
  if (effectiveBackgroundMode === "video") {
    const bgSrc = cfgBg.src || "assets/bg-broll.mp4";
    const normalized = bgSrc.replace(/\\/g, "/");
    const relative = normalized.startsWith("assets/") ? normalized.slice("assets/".length) : normalized;
    const bgOnDisk = path.join(assetsDir, relative);
    if (!existsSync(bgOnDisk)) {
      logger.warn(`  ⚠️ Background video missing: ${bgSrc} (expected at ${bgOnDisk}). Falling back to gradient.`);
      effectiveBackgroundMode = "gradient";
    }
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
  const indexHtml = buildIndexHtml(storyboard, audioMap, {
    backgroundMode: effectiveBackgroundMode,
    subtitleTimings: options.subtitleTimings || null,
  });
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

function copyDirRecursive(srcDir, destDir, fs) {
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(srcDir, e.name);
    const destPath = path.join(destDir, e.name);
    if (e.isDirectory()) {
      copyDirRecursive(srcPath, destPath, fs);
    } else if (e.isFile()) {
      copyFileSync(srcPath, destPath);
    }
  }
}

// ── Root index.html ──────────────────────────────────────────────────────────

function buildIndexHtml(storyboard, audioMap, options = {}) {
  const { width, height } = config.hyperframes;
  const totalDuration = storyboard.totalDuration;
  const totalScenes = storyboard.scenes.length;
  const bg = config.video.background || {};
  const backgroundMode = options.backgroundMode || bg.mode || "gradient";
  const phraseCaption = config.video.phraseCaption || { enabled: false };

  // Scene divs
  const sceneDivs = storyboard.scenes.map((scene, idx) => {
    const start = Number.isFinite(scene.startTime) ? scene.startTime : 0;
    let duration = Number.isFinite(scene.duration) ? scene.duration : 0;

    const next = storyboard.scenes[idx + 1];
    if (next && Number.isFinite(next.startTime)) {
      const maxDur = Math.max(0, next.startTime - start);
      duration = Math.min(duration, maxDur);
      if (Math.abs((start + duration) - next.startTime) < 0.002) {
        duration = Math.max(0, duration - 0.001);
      }
    }

    return `
      <!-- Scene ${scene.id}: ${scene.title} -->
      <div
        id="scene-${scene.id}"
        class="scene clip"
        data-composition-id="scene-${scene.id}"
        data-composition-src="compositions/scene-${scene.id}.html"
        data-start="${start.toFixed(3)}"
        data-duration="${duration.toFixed(3)}"
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

  const paginationCalls = storyboard.scenes.map((scene, idx) => {
    const t = Number.isFinite(scene.startTime) ? scene.startTime : 0;
    return `
      mainTl.call(() => setPage(${idx + 1}, ${totalScenes}), [], ${t.toFixed(3)});`;
  }).join("");

  const captionCalls = phraseCaption.enabled
    ? buildPhraseCaptionCalls(storyboard, options.subtitleTimings)
    : "";

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
        background: ${bg.fallbackGradient || "#000"};
        font-family: "Inter", sans-serif;
      }
      .scene {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        opacity: 0;
      }
      #scene-1 { opacity: 1; }

      /* ── Root background layer (AI-news style) ─────────────────────────── */
      .root-bg {
        position: absolute;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        background: ${bg.fallbackGradient || "#000"};
      }
      .root-bg video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: blur(${bg.blurPx ?? 10}px);
        opacity: ${bg.dimOpacity ?? 0.55};
        transform: scale(1.08);
      }
      .root-bg .overlay {
        position: absolute;
        inset: 0;
        background: ${bg.overlay || "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.7))"};
      }

      /* ── Root overlays ─────────────────────────────────────────────────── */
      .overlay-wrap {
        position: absolute;
        inset: 0;
        z-index: 10;
        pointer-events: none;
      }
      #page-indicator {
        position: absolute;
        top: 42px;
        left: 42px;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: rgba(255,255,255,0.55);
        text-shadow: 0 10px 25px rgba(0,0,0,0.35);
      }
      #phrase-caption {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        top: ${(phraseCaption.style?.y ?? 0.76) * height}px;
        font-size: ${phraseCaption.style?.fontSize ?? 46}px;
        font-weight: ${phraseCaption.style?.fontWeight ?? 800};
        letter-spacing: ${phraseCaption.style?.letterSpacing ?? "0.01em"};
        color: ${phraseCaption.style?.color ?? "#fff"};
        text-shadow: ${phraseCaption.style?.shadow ?? "0 10px 30px rgba(0,0,0,0.45)"};
        opacity: 0;
        white-space: pre-wrap;
      }
      #phrase-caption .accent {
        color: ${phraseCaption.style?.accentColor ?? "#8dd3ff"};
      }
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
      <div class="root-bg">
        ${backgroundMode === "video"
          ? `<video id="bg-video" data-start="0" data-duration="${Number(totalDuration || 0).toFixed(3)}" autoplay muted loop playsinline preload="auto" src="${bg.src || "assets/bg-broll.mp4"}"></video>`
          : ""}
        <div class="overlay"></div>
      </div>
      ${sceneDivs}
      <div class="overlay-wrap">
        <div id="page-indicator">01 / ${String(totalScenes).padStart(2, "0")}</div>
        <div id="phrase-caption"></div>
      </div>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const mainTl = gsap.timeline({ paused: true });
      const pageEl = document.getElementById("page-indicator");
      const captionEl = document.getElementById("phrase-caption");

      function pad2(n) { return String(n).padStart(2, "0"); }
      function setPage(i, total) {
        if (!pageEl) return;
        pageEl.textContent = \`\${pad2(i)} / \${pad2(total)}\`;
      }

      function setCaption(text) {
        if (!captionEl) return;
        captionEl.innerHTML = text;
      }

      // If background video fails to load, keep fallback gradient
      const bgVideo = document.getElementById("bg-video");
      if (bgVideo) {
        bgVideo.addEventListener("error", () => {
          bgVideo.style.display = "none";
        });
      }

      mainTl.set("#scene-1", { opacity: 1 }, 0);
      setPage(1, ${totalScenes});
      ${transitions}
      ${exitTransitions}
      ${paginationCalls}
      ${captionCalls}
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

function buildPhraseCaptionCalls(storyboard, subtitleTimings = null) {
  const cfg = config.video.phraseCaption || {};
  const segCfg = cfg.segment || {};
  const minWords = segCfg.minWords ?? 2;
  const maxWords = segCfg.maxWords ?? 6;
  const fadeIn = segCfg.fadeIn ?? 0.12;
  const hold = segCfg.hold ?? 0.55;
  const fadeOut = segCfg.fadeOut ?? 0.18;

  const segments = [];
  const alignedByScene = buildAlignedSegmentsByScene(subtitleTimings);
  for (const scene of storyboard.scenes) {
    const aligned = alignedByScene.get(String(scene.id));
    if (aligned?.length) {
      segments.push(...aligned);
      continue;
    }

    if (config.video?.subtitleAlignment?.fallbackToEstimatedTiming !== false) {
      segments.push(...buildEstimatedCaptionSegments(scene, { minWords, maxWords }));
    }
  }

  // Build timeline calls; fade in/out around segment windows
  return segments.map((s) => {
    const safeHtml = escapeHtml(s.text)
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    const start = s.start;
    const end = s.end;
    const showAt = start;
    const hideAt = Math.max(showAt + fadeIn + 0.01, end - fadeOut);
    return `
      mainTl.call(() => {
        setCaption(\`${safeHtml.replace(/\n/g, " ")}\`);
        gsap.to("#phrase-caption", { opacity: 1, duration: ${fadeIn}, ease: "power2.out" });
      }, [], ${showAt.toFixed(3)});
      mainTl.call(() => {
        gsap.to("#phrase-caption", { opacity: 0, duration: ${fadeOut}, ease: "power2.in" });
      }, [], ${hideAt.toFixed(3)});`;
  }).join("");
}

function getSceneSubtitleText(scene) {
  return String(scene.subtitle || scene.voiceText || "").trim();
}

function buildAlignedSegmentsByScene(subtitleTimings) {
  const byScene = new Map();
  if (!subtitleTimings || !Array.isArray(subtitleTimings.scenes)) {
    return byScene;
  }

  for (const scene of subtitleTimings.scenes) {
    const sceneId = String(scene.sceneId ?? "");
    if (!sceneId || !Array.isArray(scene.segments)) continue;

    const segments = scene.segments
      .map((segment) => {
        const start = Number(segment.start);
        const end = Number(segment.end);
        const text = String(segment.text || "").trim();
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) {
          return null;
        }
        return { start, end, text };
      })
      .filter(Boolean);

    if (segments.length) {
      byScene.set(sceneId, segments);
    }
  }

  return byScene;
}

function buildEstimatedCaptionSegments(scene, { minWords, maxWords }) {
  const start = Number.isFinite(scene.startTime) ? scene.startTime : 0;
  const dur = Number.isFinite(scene.duration) ? scene.duration : 4;
  const subtitleText = getSceneSubtitleText(scene);
  const parts = splitSubtitleTextToPhrases(subtitleText, { minWords, maxWords });
  if (parts.length === 0) return [];

  const wordCounts = parts.map((p) => p.split(/\s+/).filter(Boolean).length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0) || 1;

  let cursor = start;
  return parts.map((part, index) => {
    const alloc = dur * (wordCounts[index] / totalWords);
    const segStart = cursor;
    const segEnd = Math.min(start + dur, cursor + alloc);
    cursor = segEnd;
    return { start: segStart, end: segEnd, text: part };
  });
}

function splitSubtitleTextToPhrases(text, { minWords, maxWords }) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return [];

  // Prefer sentence-like splits, then chunk words 2–6
  const rough = clean
    .split(/(?<=[.!?…])\s+|[,;:]\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const phrases = [];
  for (const seg of rough.length ? rough : [clean]) {
    const words = seg.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < words.length) {
      const remaining = words.length - i;
      const take = Math.min(maxWords, Math.max(minWords, remaining >= minWords ? maxWords : remaining));
      phrases.push(words.slice(i, i + take).join(" "));
      i += take;
    }
  }

  // Limit to avoid over-chatty captions
  return phrases.slice(0, 24);
}
