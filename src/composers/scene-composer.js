/**
 * Scene Composer
 * Generates HyperFrames-compatible HTML for each scene type & animation style.
 */

import { config } from "../config.js";
import { generateVisualsHTML } from "./visual-generator.js";
import {
  buildJolyAnimationScript,
  buildJolySceneHtml,
  buildJolyStyles,
  isJolyComposition,
} from "./joly-widgets.js";

const { width, height } = config.hyperframes;

export function buildSceneHtml(scene, audioFile) {
  const isJoly = isJolyComposition(scene.composition);
  const composerFn = COMPOSERS[scene.composition] || COMPOSERS["bullet-points"];
  let content = isJoly ? buildJolySceneHtml(scene) : composerFn(scene);

  const injectBeforeLastClosingDiv = (html, injection) => {
    const needle = "</div>";
    const idx = html.lastIndexOf(needle);
    if (idx === -1) return html + injection;
    return html.slice(0, idx) + injection + html.slice(idx);
  };

  // Thêm visuals nếu có
  const visualsHTML = generateVisualsHTML(scene);
  if (visualsHTML) {
    content = injectBeforeLastClosingDiv(content, visualsHTML);
  }

  // Thêm subtext/caption trên scene
  const captionHTML = buildSceneCaptionHTML(scene);
  if (captionHTML) {
    content = injectBeforeLastClosingDiv(content, captionHTML);
  }

  // Karaoke subtitle được inject vào root container (KHÔNG dùng replace vào content)
  // để position: absolute; bottom: 0 hoạt động đúng relative to root
  const karaokeHTML = buildKaraokeSubtitleCSSHTML(scene);

  const animationScript = `${buildAnimationScript(scene)}\n${buildJolyAnimationScript(scene)}`;

  const sceneDuration = Number.isFinite(scene.duration) ? scene.duration : 0;
  const audioEl = audioFile
    ? `<audio id="scene-${scene.id}-audio" data-start="0" data-duration="${sceneDuration.toFixed(3)}" src="assets/${audioFile}" preload="auto"></audio>`
    : "";

  return `<div
    data-composition-id="scene-${scene.id}"
    data-width="${width}"
    data-height="${height}"
    data-duration="${sceneDuration.toFixed(3)}"
  >
    ${content}
    ${karaokeHTML}
    ${audioEl}

    <style>
      ${buildBaseStyles(scene)}
      ${composerStyles(scene)}
      ${buildJolyStyles(scene)}
      ${buildKaraokeStylesCSS(scene)}
    </style>

    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      (function () {
        ${animationScript}
      })();
    </script>
  </div>`;
}

// ── Scene Caption (subtext) - Hiển thị trên scene ───────────────────────────

function buildSceneCaptionHTML(scene) {
  if (!config.video.sceneCaption.enabled) return '';
  if (!scene.subtext || scene.subtext.trim() === '') return '';

  const captionStyle = config.video.sceneCaption.style;

  let positionStyle = '';
  if (captionStyle.position === 'top') {
    positionStyle = `top: ${captionStyle.marginTop}px; left: 50%; transform: translateX(-50%);`;
  } else if (captionStyle.position === 'center') {
    positionStyle = `top: 50%; left: 50%; transform: translate(-50%, -50%);`;
  } else {
    positionStyle = `bottom: ${captionStyle.marginTop || 80}px; left: 50%; transform: translateX(-50%);`;
  }

  return `
    <div class="scene-caption" style="
      position: absolute;
      ${positionStyle}
      text-align: center;
      z-index: 9999; /* Ensure it is on top */
      pointer-events: none;
    ">
      <div class="caption-text" style="
        font-size: ${captionStyle.fontSize}px;
        font-weight: ${captionStyle.fontWeight};
        color: ${scene.accentColor};
        background: ${captionStyle.backgroundColor};
        backdrop-filter: blur(8px);
        padding: ${captionStyle.padding};
        border-radius: ${captionStyle.borderRadius}px;
        display: inline-block;
        letter-spacing: 0.05em;
        border-left: 4px solid ${scene.accentColor};
        font-family: '${config.video.fontFamily}', sans-serif;
      ">
        ${escapeHtml(scene.subtext)}
      </div>
    </div>
  `;
}

// ── Karaoke Subtitle từ voiceText - Dùng CSS Animation (NO JavaScript timer) ──

// ── Karaoke Subtitle từ voiceText - CHUNKED (4-5 từ/lần) ─────────────────────
// Mỗi chunk hiện lên → highlight từng từ → ẩn đi, rồi chunk tiếp theo xuất hiện

function buildKaraokeSubtitleCSSHTML(scene) {
  if (!config.video.karaokeSubtitle.enabled) return '';
  if (!scene.voiceText || scene.voiceText.trim() === '') return '';

  const style = config.video.karaokeSubtitle.style;
  // HyperFrames sẽ preload tất cả scene từ t=0 (dù scene đang opacity:0),
  // nên CSS animation sẽ chạy "sớm" và đến lúc scene xuất hiện thì subtitle đã kết thúc.
  // Offset animation theo scene.startTime để subtitle chạy đúng lúc scene bắt đầu.
  const startOffset = Number.isFinite(scene.startTime) ? scene.startTime : 0;
  const wordsPerChunk = style.wordsPerChunk || 4;
  const words = scene.voiceText.trim().split(/\s+/);
  const totalWords = words.length;
  const durationPerWord = scene.duration / totalWords;

  // Chia words thành các chunks
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk));
  }

  // Chiều cao wrapper cố định để các chunk absolute không bị collapse
  const lineHeight = style.fontSize * 1.4;
  const paddingVert = 28; // top+bottom padding tổng (14px mỗi chiều)
  const wrapperHeight = Math.ceil(lineHeight) + paddingVert;

  let chunksHTML = '';
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const chunkWordStartIndex = ci * wordsPerChunk;

    let wordsHTML = '';
    for (let wi = 0; wi < chunk.length; wi++) {
      const wordAbsIndex = chunkWordStartIndex + wi;
      const wordDelay = (startOffset + (wordAbsIndex * durationPerWord)).toFixed(3);
      wordsHTML += `<span class="karaoke-word-${scene.id}" style="animation-delay:${wordDelay}s;">${escapeHtml(chunk[wi])}</span> `;
    }

    chunksHTML += `
      <div class="karaoke-chunk-${scene.id}" id="kchunk-${scene.id}-${ci}">
        ${wordsHTML.trimEnd()}
      </div>
    `;
  }

  return `
    <div class="karaoke-container" style="
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      z-index: 9999; /* Ensure it is on top */
      pointer-events: none;
      background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
      padding-top: 50px;
      padding-bottom: ${style.bottomOffset}px;
    ">
      <div class="karaoke-subtitle-wrapper-${scene.id}" style="
        position: relative;
        display: inline-block;
        width: 88%;
        height: ${wrapperHeight}px;
      ">
        ${chunksHTML}
      </div>
    </div>
  `;
}

function buildKaraokeStylesCSS(scene) {
  if (!config.video.karaokeSubtitle.enabled) return '';
  if (!scene.voiceText || scene.voiceText.trim() === '') return '';

  const style = config.video.karaokeSubtitle.style;
  const startOffset = Number.isFinite(scene.startTime) ? scene.startTime : 0;
  const wordsPerChunk = style.wordsPerChunk || 4;
  const words = scene.voiceText.trim().split(/\s+/);
  const totalWords = words.length;
  const durationPerWord = scene.duration / totalWords;
  const totalDuration = scene.duration;

  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk));
  }

  // ── 1. Word highlight keyframe (dùng chung, timing đặt qua animation-delay) ─
  let css = `
    @keyframes highlightWord${scene.id} {
      0%   { opacity: 0.35; color: ${style.color}; transform: scale(1); text-shadow: none; }
      8%   { opacity: 1;    color: ${style.highlightColor}; transform: scale(1.1); text-shadow: 0 0 12px ${style.highlightColor}80; }
      85%  { opacity: 1;    color: ${style.highlightColor}; transform: scale(1.1); text-shadow: 0 0 12px ${style.highlightColor}80; }
      100% { opacity: 0.35; color: ${style.color}; transform: scale(1); text-shadow: none; }
    }

    .karaoke-word-${scene.id} {
      display: inline-block;
      margin: 0 ${style.wordSpacing || '6px'};
      opacity: 0.35;
      white-space: nowrap;
      word-break: keep-all;
      animation: highlightWord${scene.id} ${durationPerWord.toFixed(3)}s linear both;
    }

    .karaoke-chunk-${scene.id} {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: ${style.fontSize}px;
      font-family: '${style.fontFamily}', 'Inter', sans-serif;
      color: ${style.color};
      background: ${style.backgroundColor};
      padding: ${style.padding};
      border-radius: ${style.borderRadius}px;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      line-height: 1.4;
      opacity: 0;
      word-wrap: break-word;
    }
  `;

  // ── 2. Per-chunk show/hide keyframes ─────────────────────────────────────────
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const chunkWordStartIndex = ci * wordsPerChunk;
    const chunkStartTime = chunkWordStartIndex * durationPerWord;
    const chunkEndTime   = Math.min(totalDuration, (chunkWordStartIndex + chunk.length) * durationPerWord);

    const sPct = ((chunkStartTime / totalDuration) * 100).toFixed(3);
    const ePct = ((chunkEndTime   / totalDuration) * 100).toFixed(3);

    // Fade-in: bắt đầu 0.3s trước chunk, fade-out: biến mất ngay khi chunk kế tiếp vào
    const fadeInPct  = Math.max(0,   ((chunkStartTime - 0.25) / totalDuration) * 100).toFixed(3);
    const fadeOutPct = Math.min(100, ((chunkEndTime   + 0.05) / totalDuration) * 100).toFixed(3);

    let stops = '';
    if (parseFloat(fadeInPct) > 0) stops += `0%{opacity:0}`;
    stops += ` ${fadeInPct}%{opacity:0} ${sPct}%{opacity:1} ${ePct}%{opacity:1} ${fadeOutPct}%{opacity:0}`;
    if (parseFloat(fadeOutPct) < 100) stops += ` 100%{opacity:0}`;

    css += `
      @keyframes showChunk${scene.id}_${ci} { ${stops} }
      #kchunk-${scene.id}-${ci} {
        animation: showChunk${scene.id}_${ci} ${totalDuration.toFixed(3)}s linear ${startOffset.toFixed(3)}s both;
      }
    `;
  }

  return css;
}

// ── Base Styles ───────────────────────────────────────────────────────────────

function buildBaseStyles(scene) {
  const cid = `scene-${scene.id}`;
  const isAiNews = config.video?.theme === "ai-news";
  return `
    [data-composition-id="${cid}"] {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: ${isAiNews ? "transparent" : scene.bgColor};
      font-family: "Inter", sans-serif;
      color: ${isAiNews ? "#ffffff" : (scene.textColor || "#ffffff")};
    }
    [data-composition-id="${cid}"] .canvas {
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 50px;
    }
    [data-composition-id="${cid}"] .bg-gradient {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 10% 10%, hsla(${(scene.id * 137.5) % 360}, 80%, 20%, 0.5), transparent 50%),
        radial-gradient(circle at 90% 90%, hsla(${(scene.id * 137.5 + 40) % 360}, 80%, 20%, 0.5), transparent 50%),
        ${scene.bgColor};
      z-index: 0;
    }
    [data-composition-id="${cid}"] .bg-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(${hexToRgba(scene.accentColor, 0.04)} 1px, transparent 1px),
        linear-gradient(90deg, ${hexToRgba(scene.accentColor, 0.04)} 1px, transparent 1px);
      background-size: 60px 60px;
      z-index: 1;
    }
    [data-composition-id="${cid}"] .accent-bar {
      width: 80px;
      height: 6px;
      background: ${scene.accentColor};
      border-radius: 3px;
      margin-bottom: 32px;
      position: relative;
      z-index: 2;
    }
    [data-composition-id="${cid}"] .emoji-deco {
      font-size: 100px;
      line-height: 1;
      margin-bottom: 30px;
      display: block;
      position: relative;
      z-index: 2;
    }
    [data-composition-id="${cid}"] .scene-title,
    [data-composition-id="${cid}"] .scene-subtitle,
    [data-composition-id="${cid}"] .bullet-item,
    [data-composition-id="${cid}"] .quote-text,
    [data-composition-id="${cid}"] .stat-number,
    [data-composition-id="${cid}"] .stat-label,
    [data-composition-id="${cid}"] .tag-badge,
    [data-composition-id="${cid}"] .hero-wrap,
    [data-composition-id="${cid}"] .chart-container,
    [data-composition-id="${cid}"] .stats-grid-wrap,
    [data-composition-id="${cid}"] .terminal-wrap,
    [data-composition-id="${cid}"] .callout-wrap,
    [data-composition-id="${cid}"] .cmp-wrap,
    [data-composition-id="${cid}"] .code-diff-wrap {
      position: relative;
      z-index: 2;
    }
    
    /* Visual styles */
    [data-composition-id="${cid}"] .visual-image,
    [data-composition-id="${cid}"] .visual-animation,
    [data-composition-id="${cid}"] .visual-diagram,
    [data-composition-id="${cid}"] .visual-motion {
      transition: opacity 0.5s ease;
    }
    [data-composition-id="${cid}"] canvas,
    [data-composition-id="${cid}"] svg {
      pointer-events: none;
    }

    /* ── AI-news shared UI primitives ─────────────────────────────────────── */
    [data-composition-id="${cid}"] .ai-label {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.55);
    }
    [data-composition-id="${cid}"] .ai-title {
      font-size: 72px;
      font-weight: 900;
      line-height: 1.12;
      letter-spacing: -0.02em;
      color: #ffffff;
    }
    [data-composition-id="${cid}"] .ai-muted {
      color: rgba(255,255,255,0.62);
    }
    [data-composition-id="${cid}"] .ai-accent {
      color: ${scene.accentColor};
    }
    [data-composition-id="${cid}"] .ai-underline {
      text-decoration: underline;
      text-decoration-thickness: 6px;
      text-underline-offset: 10px;
      text-decoration-color: rgba(141, 211, 255, 0.95);
    }
    [data-composition-id="${cid}"] .ai-card {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 28px;
      box-shadow: 0 30px 70px rgba(0,0,0,0.25);
      backdrop-filter: blur(12px);
    }
    [data-composition-id="${cid}"] .ai-card.ai-card-pop {
      border-color: rgba(141,211,255,0.28);
      box-shadow:
        0 30px 70px rgba(0,0,0,0.28),
        0 0 0 1px rgba(141,211,255,0.16),
        0 0 60px rgba(141,211,255,0.10);
    }
    [data-composition-id="${cid}"] .ai-gradient-text {
      background: linear-gradient(90deg, rgba(141,211,255,1) 0%, rgba(167,139,250,1) 38%, rgba(34,211,238,1) 78%, rgba(251,191,36,1) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    [data-composition-id="${cid}"] .ai-card-inner {
      padding: 34px 34px;
    }
    [data-composition-id="${cid}"] .ai-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }
    [data-composition-id="${cid}"] .ai-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      backdrop-filter: blur(10px);
      color: rgba(255,255,255,0.82);
      font-weight: 700;
      font-size: 22px;
    }
  `;
}

// ── Composition Styles ────────────────────────────────────────────────────────

function composerStyles(scene) {
  const cid = `scene-${scene.id}`;
  const acc = scene.accentColor;

  return `
    [data-composition-id="${cid}"] .scene-title {
      font-size: 72px;
      font-weight: 900;
      color: ${scene.textColor};
      text-align: center;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin-bottom: 24px;
      text-shadow: 0 4px 30px ${hexToRgba(acc, 0.5)};
    }
    [data-composition-id="${cid}"] .scene-subtitle {
      font-size: 40px;
      font-weight: 500;
      color: ${hexToRgba(scene.textColor, 0.8)};
      text-align: center;
      line-height: 1.4;
      max-width: 900px;
    }
    [data-composition-id="${cid}"] .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 36px;
      opacity: 0;
      transform: translateX(-40px);
    }
    [data-composition-id="${cid}"] .bullet-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: ${acc};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      flex-shrink: 0;
      box-shadow: 0 8px 24px ${hexToRgba(acc, 0.4)};
    }
    [data-composition-id="${cid}"] .bullet-text {
      font-size: 44px;
      font-weight: 600;
      color: ${scene.textColor};
      line-height: 1.35;
    }
    [data-composition-id="${cid}"] .quote-mark {
      font-size: 180px;
      color: ${acc};
      line-height: 0.7;
      font-family: Georgia, serif;
      opacity: 0.4;
      position: absolute;
      top: 80px;
      left: 40px;
    }
    [data-composition-id="${cid}"] .quote-text {
      font-size: 58px;
      font-weight: 700;
      color: ${scene.textColor};
      text-align: center;
      line-height: 1.4;
      font-style: italic;
      padding: 0 40px;
      position: relative;
      z-index: 1;
    }
    [data-composition-id="${cid}"] .stat-number {
      font-size: 220px;
      font-weight: 900;
      color: ${acc};
      line-height: 1;
      letter-spacing: -0.04em;
      text-shadow: 0 0 60px ${hexToRgba(acc, 0.6)};
    }
    [data-composition-id="${cid}"] .stat-label {
      font-size: 52px;
      font-weight: 600;
      color: ${scene.textColor};
      text-align: center;
    }
    [data-composition-id="${cid}"] .cta-hearts {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    [data-composition-id="${cid}"] .heart {
      position: absolute;
      font-size: 60px;
      opacity: 0;
    }
    [data-composition-id="${cid}"] .cta-title {
      font-size: 88px;
      font-weight: 900;
      color: ${scene.textColor};
      text-align: center;
      line-height: 1.2;
      text-shadow: 0 4px 30px ${hexToRgba(acc, 0.6)};
      margin-bottom: 30px;
    }
    [data-composition-id="${cid}"] .cta-sub {
      font-size: 46px;
      color: ${hexToRgba(scene.textColor, 0.85)};
      text-align: center;
      line-height: 1.45;
      max-width: 900px;
    }
    [data-composition-id="${cid}"] .glow-orb {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, ${hexToRgba(acc, 0.4)}, transparent 70%);
      pointer-events: none;
    }
    [data-composition-id="${cid}"] .tag-badge {
      display: inline-block;
      background: ${acc};
      color: #fff;
      font-size: 32px;
      font-weight: 700;
      padding: 10px 28px;
      border-radius: 100px;
      margin-bottom: 36px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* TikTok Follow Card Styles */
    [data-composition-id="${cid}"] .tt-card {
      position: absolute;
      bottom: 250px;
      left: 50%;
      transform: translateX(-50%) translateY(300px);
      display: flex;
      align-items: center;
      gap: 24px;
      background: #1a1a1a;
      border-radius: 100px;
      padding: 24px 40px 24px 24px;
      box-shadow: 0 12px 60px rgba(0,0,0,0.6), 0 0 80px ${hexToRgba(acc, 0.3)};
      opacity: 0;
      z-index: 150;
      white-space: nowrap;
      border: 1px solid rgba(255,255,255,0.1);
    }
    [data-composition-id="${cid}"] .tt-logo {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #333;
      flex-shrink: 0;
      background: #333;
    }
    [data-composition-id="${cid}"] .tt-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-right: 20px;
    }
    [data-composition-id="${cid}"] .tt-name {
      font-size: 48px;
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
    }
    [data-composition-id="${cid}"] .tt-sub {
      font-size: 28px;
      font-weight: 400;
      color: #aaa;
    }
    [data-composition-id="${cid}"] .tt-btn {
      position: relative;
      min-width: 220px;
      height: 85px;
      border-radius: 50px;
      background: #fe2c55;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(254, 44, 85, 0.4);
    }
    [data-composition-id="${cid}"] .tt-btn-text {
      position: absolute;
      font-size: 34px;
      font-weight: 800;
      color: #fff;
    }
    [data-composition-id="${cid}"] .tt-btn-following {
      opacity: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Infographic Chart */
    [data-composition-id="${cid}"] .chart-container {
      width: 90%;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(25px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 40px;
      padding: 60px 50px;
      display: flex;
      flex-direction: column;
      gap: 40px;
      box-shadow: 0 60px 120px rgba(0, 0, 0, 0.5);
    }
    [data-composition-id="${cid}"] .chart-title {
      font-size: 56px;
      font-weight: 800;
      color: #fff;
      text-align: center;
      margin-bottom: 20px;
    }
    [data-composition-id="${cid}"] .bar-row {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }
    [data-composition-id="${cid}"] .bar-info {
      display: flex;
      justify-content: space-between;
      font-weight: 800;
      font-size: 32px;
      color: rgba(255, 255, 255, 0.6);
    }
    [data-composition-id="${cid}"] .bar-track {
      width: 100%;
      height: 28px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50px;
      overflow: hidden;
    }
    [data-composition-id="${cid}"] .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, ${scene.accentColor}, #2dd4bf);
      width: 0%;
      border-radius: 50px;
    }
    [data-composition-id="${cid}"] .donut-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 40px;
    }
    [data-composition-id="${cid}"] .donut-svg {
      width: 400px;
      height: 400px;
      transform: rotate(-90deg);
    }
    [data-composition-id="${cid}"] .donut-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.05);
      stroke-width:4;
    }
    [data-composition-id="${cid}"] .donut-fill {
      fill: none;
      stroke: ${scene.accentColor};
      stroke-width: 4;
      stroke-dasharray: 0 100;
      stroke-linecap: round;
    }

    /* Stats Grid */
    [data-composition-id="${cid}"] .stats-grid-wrap {
      display: flex;
      flex-direction: column;
      gap: 30px;
      width: 100%;
      align-items: center;
    }
    [data-composition-id="${cid}"] .stat-grid-card {
      background: rgba(15, 23, 42, 0.75);
      padding: 40px;
      border-radius: 40px;
      text-align: center;
      width: 90%;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 40px 80px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(20px);
    }

    /* Terminal */
    [data-composition-id="${cid}"] .terminal-wrap {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      width: 95%;
      box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    [data-composition-id="${cid}"] .terminal-header {
      background: rgba(255, 255, 255, 0.03);
      padding: 20px 30px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }
    [data-composition-id="${cid}"] .terminal-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
    }
    [data-composition-id="${cid}"] .dot-red { background: #ff5f56; }
    [data-composition-id="${cid}"] .dot-yellow { background: #ffbd2e; }
    [data-composition-id="${cid}"] .dot-green { background: #27c93f; }
    [data-composition-id="${cid}"] .terminal-title {
      margin-left: 15px;
      color: rgba(255, 255, 255, 0.6);
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
    }
    [data-composition-id="${cid}"] .terminal-body {
      padding: 40px 30px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 32px;
      line-height: 1.6;
    }
    [data-composition-id="${cid}"] .line-prompt { color: ${scene.accentColor}; }
    [data-composition-id="${cid}"] .line-output { color: #f8fafc; }

    /* Callout */
    [data-composition-id="${cid}"] .callout-wrap {
      width: 88%;
    }
    [data-composition-id="${cid}"] .callout-card {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(20px);
      border-radius: 30px;
      padding: 60px 50px;
      border: 2px solid ${hexToRgba(scene.accentColor, 0.4)};
      box-shadow: 0 40px 80px rgba(0, 0, 0, 0.4);
      text-align: center;
      opacity: 0;
    }
    [data-composition-id="${cid}"] .callout-tag {
      display: inline-block;
      font-size: 32px;
      font-weight: 700;
      color: ${scene.accentColor};
      background: ${hexToRgba(scene.accentColor, 0.12)};
      border: 1px solid ${hexToRgba(scene.accentColor, 0.4)};
      border-radius: 50px;
      padding: 10px 30px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 30px;
    }
    [data-composition-id="${cid}"] .callout-statement {
      font-size: 48px;
      font-weight: 600;
      color: #fff;
      line-height: 1.35;
    }

    /* Comparison */
    [data-composition-id="${cid}"] .cmp-wrap {
      display: flex;
      flex-direction: column;
      gap: 15px;
      width: 90%;
      z-index: 10;
    }
    [data-composition-id="${cid}"] .cmp-card {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(20px);
      border-radius: 30px;
      padding: 40px 50px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      border: 2px solid rgba(255, 255, 255, 0.12);
      opacity: 0;
    }
    [data-composition-id="${cid}"] .cmp-card.cmp-cyan {
      border-color: #22d3ee;
      box-shadow: 0 0 40px rgba(34, 211, 238, 0.2);
    }
    [data-composition-id="${cid}"] .cmp-card.cmp-purple {
      border-color: #a855f7;
      box-shadow: 0 0 40px rgba(168, 85, 247, 0.2);
    }
    [data-composition-id="${cid}"] .cmp-card.cmp-winner {
      border-width: 3px;
    }
    [data-composition-id="${cid}"] .cmp-label {
      font-size: 24px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: rgba(255, 255, 255, 0.6);
    }
    [data-composition-id="${cid}"] .cmp-value {
      font-size: 80px;
      font-weight: 900;
      color: #fff;
      line-height: 1;
    }
    [data-composition-id="${cid}"] .cmp-card.cmp-cyan .cmp-value { color: #22d3ee; }
    [data-composition-id="${cid}"] .cmp-card.cmp-purple .cmp-value { color: #a855f7; }
    [data-composition-id="${cid}"] .cmp-winner-badge {
      display: inline-block;
      font-size: 20px;
      font-weight: 700;
      color: #22d3ee;
      background: rgba(34, 211, 238, 0.12);
      border: 1px solid rgba(34, 211, 238, 0.4);
      border-radius: 50px;
      padding: 8px 20px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      width: fit-content;
    }
    [data-composition-id="${cid}"] .cmp-vs {
      font-size: 48px;
      font-weight: 900;
      color: rgba(255, 255, 255, 0.2);
      text-align: center;
      opacity: 0;
    }

    /* Code Diff */
    [data-composition-id="${cid}"] .code-diff-wrap {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 95%;
    }
    [data-composition-id="${cid}"] .diff-pane {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(25px);
      border-radius: 20px;
      padding: 30px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 40px 80px rgba(0, 0, 0, 0.4);
    }
    [data-composition-id="${cid}"] .diff-label {
      font-size: 24px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 20px;
      font-weight: 800;
    }
    [data-composition-id="${cid}"] .diff-pane.bad { border-left: 6px solid #ef4444; }
    [data-composition-id="${cid}"] .diff-pane.good { border-left: 6px solid #22c55e; }
    [data-composition-id="${cid}"] .diff-pane.bad .diff-label { color: #ef4444; }
    [data-composition-id="${cid}"] .diff-pane.good .diff-label { color: #22c55e; }
    [data-composition-id="${cid}"] .diff-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      white-space: pre-wrap;
      line-height: 1.4;
      color: #cbd5e1;
    }

    /* ── Football broadcast primitives ───────────────────────────────────── */
    [data-composition-id="${cid}"] .football-scene {
      position: relative;
      overflow: hidden;
      color: #ffffff;
    }
    [data-composition-id="${cid}"] .football-pitch-bg {
      position: absolute;
      inset: -70px -50px;
      z-index: 0;
      opacity: 0.58;
      pointer-events: none;
      background:
        linear-gradient(90deg, rgba(19,122,58,0.88) 0 12.5%, rgba(15,94,48,0.88) 12.5% 25%, rgba(19,122,58,0.88) 25% 37.5%, rgba(15,94,48,0.88) 37.5% 50%, rgba(19,122,58,0.88) 50% 62.5%, rgba(15,94,48,0.88) 62.5% 75%, rgba(19,122,58,0.88) 75% 87.5%, rgba(15,94,48,0.88) 87.5% 100%);
      transform: rotate(-4deg) scale(1.08);
    }
    [data-composition-id="${cid}"] .football-pitch-bg svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.72;
    }
    [data-composition-id="${cid}"] .football-pitch-bg::after {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 44%, rgba(247,201,72,0.18), transparent 36%), linear-gradient(180deg, rgba(8,17,31,0.10), rgba(8,17,31,0.78));
    }
    [data-composition-id="${cid}"] .football-kicker {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      border-radius: 999px;
      background: rgba(8,17,31,0.72);
      border: 1px solid rgba(255,255,255,0.16);
      color: #F7C948;
      font-size: 19px;
      font-weight: 950;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      backdrop-filter: blur(10px);
    }
    [data-composition-id="${cid}"] .football-title {
      position: relative;
      z-index: 2;
      margin-top: 24px;
      max-width: 940px;
      text-align: center;
      font-size: 70px;
      line-height: 1.05;
      font-weight: 950;
      letter-spacing: -0.02em;
      text-shadow: 0 16px 44px rgba(0,0,0,0.42);
    }
    [data-composition-id="${cid}"] .football-matchup,
    [data-composition-id="${cid}"] .football-score-shell,
    [data-composition-id="${cid}"] .football-player-spotlight,
    [data-composition-id="${cid}"] .football-bracket,
    [data-composition-id="${cid}"] .football-event-list {
      position: relative;
      z-index: 2;
    }
    [data-composition-id="${cid}"] .football-matchup {
      width: 930px;
      margin-top: 58px;
      display: grid;
      grid-template-columns: 1fr 146px 1fr;
      gap: 18px;
      align-items: center;
    }
    [data-composition-id="${cid}"] .football-team-card,
    [data-composition-id="${cid}"] .football-score-shell,
    [data-composition-id="${cid}"] .football-stat-card,
    [data-composition-id="${cid}"] .football-event-card,
    [data-composition-id="${cid}"] .football-bracket-node,
    [data-composition-id="${cid}"] .football-lower-third {
      background: rgba(8,17,31,0.78);
      border: 1px solid rgba(255,255,255,0.14);
      box-shadow: 0 26px 70px rgba(0,0,0,0.32);
      backdrop-filter: blur(12px);
    }
    [data-composition-id="${cid}"] .football-team-card {
      min-height: 250px;
      border-radius: 34px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    [data-composition-id="${cid}"] .football-team-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    [data-composition-id="${cid}"] .football-team-badge {
      flex: 0 0 auto;
      object-fit: cover;
      box-shadow: 0 18px 40px rgba(0,0,0,0.28);
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.10);
    }
    [data-composition-id="${cid}"] .football-team-badge-logo {
      width: 76px;
      height: 76px;
      border-radius: 999px;
    }
    [data-composition-id="${cid}"] .football-team-badge-flag {
      width: 96px;
      height: 64px;
      border-radius: 18px;
    }
    [data-composition-id="${cid}"] .football-team-code {
      font-size: 22px;
      font-weight: 950;
      color: rgba(255,255,255,0.66);
      letter-spacing: 0.16em;
      margin-top: 4px;
    }
    [data-composition-id="${cid}"] .football-team-name {
      font-size: 42px;
      font-weight: 950;
      line-height: 1.05;
    }
    [data-composition-id="${cid}"] .football-team-form {
      display: flex;
      gap: 8px;
      margin-top: 20px;
    }
    [data-composition-id="${cid}"] .football-form-dot {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: rgba(255,255,255,0.22);
    }
    [data-composition-id="${cid}"] .football-vs {
      height: 146px;
      border-radius: 999px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #08111F;
      background: #F7C948;
      font-size: 30px;
      font-weight: 950;
      box-shadow: 0 24px 60px rgba(0,0,0,0.28);
    }
    [data-composition-id="${cid}"] .football-ball-icon {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      border: 3px solid rgba(8,17,31,0.82);
      background: conic-gradient(from 18deg, #08111F 0 12%, #fff 12% 24%, #08111F 24% 36%, #fff 36% 50%, #08111F 50% 62%, #fff 62% 76%, #08111F 76% 88%, #fff 88% 100%);
    }
    [data-composition-id="${cid}"] .football-lower-third {
      margin-top: 44px;
      width: 930px;
      min-height: 74px;
      border-radius: 22px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 25px;
      font-weight: 850;
    }
    [data-composition-id="${cid}"] .football-lower-third strong,
    [data-composition-id="${cid}"] .football-clock {
      color: #F7C948;
    }

    /* ── Football odds + H2H ─────────────────────────────────────────────── */
    [data-composition-id="${cid}"] .football-odds-panels {
      position: relative;
      z-index: 2;
      margin-top: 34px;
      display: flex;
      flex-direction: column;
      gap: 22px;
      width: 100%;
    }
    [data-composition-id="${cid}"] .football-odds-panel,
    [data-composition-id="${cid}"] .football-h2h-panel {
      border-radius: 26px;
      background: rgba(8,17,31,0.78);
      border: 1px solid rgba(255,255,255,0.14);
      box-shadow: 0 26px 70px rgba(0,0,0,0.32);
      backdrop-filter: blur(12px);
      padding: 18px 18px;
      overflow: hidden;
    }
    [data-composition-id="${cid}"] .football-odds-table {
      display: flex;
      flex-direction: column;
      width: 100%;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.12);
    }
    [data-composition-id="${cid}"] .football-odds-thead {
      display: grid;
      grid-template-columns: 3.2fr 1.1fr 1.4fr 1.7fr 1.7fr 1.4fr;
      gap: 0;
      background: linear-gradient(90deg, rgba(22,163,74,0.96), rgba(16,185,129,0.92));
      color: #ffffff;
      font-weight: 950;
      font-size: 20px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    [data-composition-id="${cid}"] .football-odds-th {
      padding: 14px 14px;
      border-right: 1px solid rgba(255,255,255,0.14);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    [data-composition-id="${cid}"] .football-odds-th:first-child { justify-content: flex-start; }
    [data-composition-id="${cid}"] .football-odds-th:last-child { border-right: none; }

    [data-composition-id="${cid}"] .football-odds-tbody {
      display: flex;
      flex-direction: column;
      background: rgba(255,255,255,0.04);
    }
    [data-composition-id="${cid}"] .football-odds-tr {
      display: grid;
      grid-template-columns: 3.2fr 1.1fr 1.4fr 1.7fr 1.7fr 1.4fr;
      border-top: 1px solid rgba(255,255,255,0.10);
    }
    [data-composition-id="${cid}"] .football-odds-tr:first-child { border-top: none; }
    [data-composition-id="${cid}"] .football-odds-tr.is-away { background: rgba(255,255,255,0.03); }
    [data-composition-id="${cid}"] .football-odds-td {
      padding: 12px 12px;
      border-right: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 64px;
    }
    [data-composition-id="${cid}"] .football-odds-td.col-team { justify-content: flex-start; }
    [data-composition-id="${cid}"] .football-odds-td:last-child { border-right: none; }

    [data-composition-id="${cid}"] .football-odds-team {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    [data-composition-id="${cid}"] .football-odds-team-badge {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      object-fit: cover;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.16);
      box-shadow: 0 12px 26px rgba(0,0,0,0.22);
      flex: 0 0 auto;
    }
    [data-composition-id="${cid}"] .football-odds-team-badge.flag {
      width: 44px;
      height: 30px;
      border-radius: 10px;
    }
    [data-composition-id="${cid}"] .football-odds-team-badge.placeholder {
      background: rgba(255,255,255,0.06);
    }
    [data-composition-id="${cid}"] .football-odds-team-name {
      font-size: 24px;
      font-weight: 900;
      color: rgba(255,255,255,0.96);
      line-height: 1.12;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    [data-composition-id="${cid}"] .football-odds-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    [data-composition-id="${cid}"] .football-odds-score-num {
      font-size: 22px;
      font-weight: 950;
      color: rgba(255,255,255,0.90);
      line-height: 1;
    }
    [data-composition-id="${cid}"] .football-odds-score-num.empty {
      opacity: 0.25;
    }
    [data-composition-id="${cid}"] .football-odds-score-minute {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.04em;
      color: rgba(247,201,72,0.92);
    }
    [data-composition-id="${cid}"] .football-odds-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      line-height: 1.05;
      gap: 3px;
      width: 100%;
    }
    [data-composition-id="${cid}"] .football-odds-main {
      font-size: 22px;
      font-weight: 950;
      color: rgba(255,255,255,0.92);
    }
    [data-composition-id="${cid}"] .football-odds-sub {
      font-size: 16px;
      font-weight: 850;
      color: rgba(226,232,240,0.75);
    }
    [data-composition-id="${cid}"] .football-odds-cell.tone-red .football-odds-main { color: rgba(239,68,68,0.96); }
    [data-composition-id="${cid}"] .football-odds-cell.tone-orange .football-odds-main { color: rgba(251,146,60,0.96); }
    [data-composition-id="${cid}"] .football-odds-cell.tone-green .football-odds-main { color: rgba(34,197,94,0.96); }
    [data-composition-id="${cid}"] .football-odds-cell.tone-blue .football-odds-main { color: rgba(59,130,246,0.96); }

    [data-composition-id="${cid}"] .football-h2h-title {
      font-size: 22px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(247,201,72,0.92);
      margin-bottom: 14px;
    }
    [data-composition-id="${cid}"] .football-h2h-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* H2H card UI (match screenshot) */
    [data-composition-id="${cid}"] .football-h2h-card {
      position: relative;
      padding: 14px 18px 16px;
      border-radius: 26px;
      background: rgba(7, 12, 22, 0.58);
      border: 1px solid rgba(255,255,255,0.10);
      overflow: hidden;
      box-shadow: 0 28px 70px rgba(0,0,0,0.34);
      backdrop-filter: blur(10px);
    }
    [data-composition-id="${cid}"] .football-h2h-card::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 30% 50%, rgba(59,130,246,0.14), transparent 55%),
        radial-gradient(circle at 70% 50%, rgba(168,85,247,0.12), transparent 52%),
        radial-gradient(circle at 50% 0%, rgba(247,201,72,0.08), transparent 48%);
      opacity: 1;
      pointer-events: none;
    }
    [data-composition-id="${cid}"] .football-h2h-top {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    [data-composition-id="${cid}"] .football-h2h-comp {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: rgba(226,232,240,0.78);
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      min-width: 0;
    }
    [data-composition-id="${cid}"] .football-h2h-comp-icon {
      width: 20px;
      height: 20px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.14);
      background:
        radial-gradient(circle at 30% 30%, rgba(255,255,255,0.30), rgba(255,255,255,0.06)),
        rgba(255,255,255,0.06);
      box-shadow: 0 10px 22px rgba(0,0,0,0.24);
      flex: 0 0 auto;
    }
    [data-composition-id="${cid}"] .football-h2h-comp-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 380px;
    }
    [data-composition-id="${cid}"] .football-h2h-time {
      flex: 0 0 auto;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 16px;
      font-weight: 950;
      color: rgba(255,255,255,0.92);
      border: 1px solid rgba(34,197,94,0.55);
      background: rgba(34,197,94,0.10);
      box-shadow: 0 14px 30px rgba(0,0,0,0.22);
      letter-spacing: 0.02em;
    }
    [data-composition-id="${cid}"] .football-h2h-mid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr 170px 1fr;
      gap: 14px;
      align-items: center;
    }
    [data-composition-id="${cid}"] .football-h2h-side {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    [data-composition-id="${cid}"] .football-h2h-side.right { justify-content: flex-end; }
    [data-composition-id="${cid}"] .football-h2h-name {
      font-size: 22px;
      font-weight: 950;
      color: rgba(255,255,255,0.92);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 340px;
    }
    [data-composition-id="${cid}"] .football-h2h-logo {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      object-fit: cover;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.08);
      box-shadow: 0 16px 34px rgba(0,0,0,0.26);
      flex: 0 0 auto;
    }
    [data-composition-id="${cid}"] .football-h2h-logo.flag {
      width: 54px;
      height: 36px;
      border-radius: 14px;
    }
    [data-composition-id="${cid}"] .football-h2h-logo.placeholder {
      opacity: 0.45;
    }
    [data-composition-id="${cid}"] .football-h2h-scorepill {
      height: 64px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      border: 1px solid rgba(255,255,255,0.14);
      background: linear-gradient(90deg, rgba(59,130,246,0.55), rgba(168,85,247,0.52));
      box-shadow: 0 22px 56px rgba(0,0,0,0.34);
      position: relative;
      overflow: hidden;
    }
    [data-composition-id="${cid}"] .football-h2h-scorepill::after {
      content: "";
      position: absolute;
      inset: -30px;
      background: radial-gradient(circle at 30% 35%, rgba(255,255,255,0.16), transparent 55%);
      pointer-events: none;
    }
    [data-composition-id="${cid}"] .football-h2h-score-num {
      position: relative;
      z-index: 1;
      width: 34px;
      text-align: center;
      font-size: 30px;
      font-weight: 950;
      color: rgba(255,255,255,0.96);
      text-shadow: 0 16px 30px rgba(0,0,0,0.28);
    }
    [data-composition-id="${cid}"] .football-h2h-score-colon {
      position: relative;
      z-index: 1;
      font-size: 30px;
      font-weight: 950;
      color: rgba(255,255,255,0.92);
      opacity: 0.86;
    }
    [data-composition-id="${cid}"] .football-score-shell {
      width: 940px;
      border-radius: 36px;
      padding: 42px 38px;
      text-align: center;
    }
    [data-composition-id="${cid}"] .football-clock {
      margin: 24px auto 30px;
      width: max-content;
      padding: 10px 24px;
      border-radius: 999px;
      border: 1px solid rgba(247,201,72,0.30);
      background: rgba(247,201,72,0.10);
      font-size: 28px;
      font-weight: 950;
    }
    [data-composition-id="${cid}"] .football-score-row {
      display: grid;
      grid-template-columns: 1fr 230px 1fr;
      align-items: center;
      gap: 24px;
    }
    [data-composition-id="${cid}"] .football-score-team {
      font-size: 34px;
      line-height: 1.1;
      font-weight: 950;
      text-transform: uppercase;
    }
    [data-composition-id="${cid}"] .football-score-value {
      height: 140px;
      border-radius: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: #08111F;
      background: #F7C948;
      font-size: 64px;
      font-weight: 950;
      box-shadow: inset 0 -8px 0 rgba(8,17,31,0.12);
    }
    [data-composition-id="${cid}"] .football-score-note {
      margin-top: 32px;
      font-size: 27px;
      font-weight: 800;
      color: rgba(255,255,255,0.76);
    }
    [data-composition-id="${cid}"] .football-lineup-topbar {
      position: relative;
      z-index: 2;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }
    [data-composition-id="${cid}"] .football-lineup-venue {
      padding: 10px 18px;
      border-radius: 999px;
      background: rgba(8,17,31,0.62);
      border: 1px solid rgba(255,255,255,0.16);
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.02em;
      color: rgba(255,255,255,0.92);
      backdrop-filter: blur(10px);
      max-width: 720px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    [data-composition-id="${cid}"] .football-lineup-pitch {
      position: relative;
      z-index: 2;
      width: 940px;
      height: 1020px;
      margin-top: 22px;
      border-radius: 34px;
      background: rgba(8,17,31,0.22);
      border: 1px solid rgba(255,255,255,0.14);
      box-shadow: 0 26px 70px rgba(0,0,0,0.30);
      overflow: hidden;
      backdrop-filter: blur(8px);
    }
	    [data-composition-id="${cid}"] .football-lineup-pitch::before {
	      content: "";
	      position: absolute;
	      inset: 0;
	      background:
	        radial-gradient(circle at 50% 50%, transparent 0 68px, rgba(255,255,255,0.26) 68px 70px, transparent 70px),
	        linear-gradient(to bottom, transparent calc(50% - 1px), rgba(255,255,255,0.22) calc(50% - 1px), rgba(255,255,255,0.22) calc(50% + 1px), transparent calc(50% + 1px)),
	        radial-gradient(circle at 50% 50%, rgba(247,201,72,0.10), transparent 46%),
	        linear-gradient(180deg, rgba(8,17,31,0.08), rgba(8,17,31,0.18));
	      pointer-events: none;
	    }
    [data-composition-id="${cid}"] .football-lineup-teamblock {
      position: relative;
      z-index: 2;
      width: 940px;
      margin-top: 18px;
      border-radius: 22px;
      padding: 16px 18px;
      background: rgba(8,17,31,0.78);
      border: 1px solid rgba(255,255,255,0.14);
      box-shadow: 0 22px 54px rgba(0,0,0,0.28);
      display: grid;
      grid-template-columns: 120px 1fr auto;
      align-items: center;
      gap: 14px;
      opacity: 0;
      transform: translateY(14px);
      filter: blur(8px);
    }
    [data-composition-id="${cid}"] .football-lineup-teamblock.bottom { margin-top: 18px; }
    [data-composition-id="${cid}"] .football-lineup-formation-label {
      padding: 10px 14px;
      border-radius: 14px;
      background: rgba(247,201,72,0.12);
      border: 1px solid rgba(247,201,72,0.32);
      font-size: 20px;
      font-weight: 950;
      letter-spacing: 0.10em;
      color: rgba(255,255,255,0.92);
      text-transform: uppercase;
      white-space: nowrap;
    }

    [data-composition-id="${cid}"] .football-lineup-player {
      position: absolute;
      z-index: 4;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 96px;
      opacity: 0;
      filter: blur(6px);
    }
    [data-composition-id="${cid}"] .football-lineup-badge {
      width: 56px;
      height: 56px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: 24px;
      font-weight: 950;
      letter-spacing: -0.02em;
      color: #08111F;
      background: #F7C948;
      border: 3px solid rgba(8,17,31,0.72);
      box-shadow: 0 18px 44px rgba(0,0,0,0.34);
    }
    [data-composition-id="${cid}"] .football-lineup-name {
      padding: 8px 10px;
      border-radius: 12px;
      background: rgba(8,17,31,0.70);
      border: 1px solid rgba(255,255,255,0.14);
      font-size: 18px;
      font-weight: 900;
      max-width: 210px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: rgba(255,255,255,0.95);
      box-shadow: 0 14px 40px rgba(0,0,0,0.26);
      backdrop-filter: blur(10px);
    }
    [data-composition-id="${cid}"] .football-lineup-teamcode {
      font-size: 20px;
      font-weight: 950;
      letter-spacing: 0.16em;
      color: rgba(255,255,255,0.78);
      text-transform: uppercase;
    }
    [data-composition-id="${cid}"] .football-lineup-teamname {
      font-size: 30px;
      font-weight: 950;
      line-height: 1.05;
    }

    [data-composition-id="${cid}"] .football-player-spotlight {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 36px;
    }
    [data-composition-id="${cid}"] .football-player-note {
      margin-top: 24px;
      max-width: 650px;
      color: rgba(255,255,255,0.76);
      font-size: 28px;
      line-height: 1.32;
      font-weight: 800;
    }
    [data-composition-id="${cid}"] .football-shirt {
      width: 270px;
      height: 320px;
      border-radius: 72px 72px 40px 40px;
      background: linear-gradient(145deg, #F7C948, #f59e0b);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 34px 80px rgba(0,0,0,0.35);
      clip-path: polygon(20% 0, 80% 0, 100% 24%, 86% 42%, 86% 100%, 14% 100%, 14% 42%, 0 24%);
    }
    [data-composition-id="${cid}"] .football-shirt-number {
      color: #08111F;
      font-size: 106px;
      font-weight: 950;
      letter-spacing: -0.04em;
    }
    [data-composition-id="${cid}"] .football-stat-grid {
      position: relative;
      z-index: 2;
      margin-top: 54px;
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    [data-composition-id="${cid}"] .football-stat-card {
      border-radius: 26px;
      padding: 28px;
    }
    [data-composition-id="${cid}"] .football-stat-value {
      font-size: 60px;
      font-weight: 950;
      color: #F7C948;
      letter-spacing: -0.03em;
    }
    [data-composition-id="${cid}"] .football-stat-label {
      margin-top: 8px;
      font-size: 22px;
      font-weight: 850;
      color: rgba(255,255,255,0.68);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    [data-composition-id="${cid}"] .football-bracket {
      margin-top: 46px;
      width: 900px;
      height: 560px;
    }
    [data-composition-id="${cid}"] .football-bracket-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    [data-composition-id="${cid}"] .football-bracket-path {
      fill: none;
      stroke: rgba(255,255,255,0.86);
      stroke-width: 6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    [data-composition-id="${cid}"] .football-bracket-node {
      position: absolute;
      width: 220px;
      min-height: 110px;
      border-radius: 16px;
      padding: 16px 16px 14px;
      background: var(--node-bg, rgba(8,17,31,0.78));
      border: 1px solid rgba(255,255,255,0.22);
      box-shadow: 0 22px 54px rgba(0,0,0,0.28);
      backdrop-filter: blur(10px);
      color: rgba(8,17,31,0.92);
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    [data-composition-id="${cid}"] .football-node-stage {
      color: rgba(8,17,31,0.72);
      font-size: 14px;
      font-weight: 950;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(8,17,31,0.18);
    }
    [data-composition-id="${cid}"] .football-node-title {
      margin-top: 10px;
      font-size: 22px;
      line-height: 1.15;
      font-weight: 950;
    }
    [data-composition-id="${cid}"] .football-event-list {
      margin-top: 38px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    [data-composition-id="${cid}"] .football-event {
      display: grid;
      grid-template-columns: 118px 1fr;
      gap: 18px;
      align-items: center;
    }
    [data-composition-id="${cid}"] .football-event-minute {
      height: 78px;
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #08111F;
      background: #F7C948;
      font-size: 30px;
      font-weight: 950;
      box-shadow: 0 18px 40px rgba(0,0,0,0.28);
    }
    [data-composition-id="${cid}"] .football-event-card {
      border-radius: 24px;
      padding: 22px 26px;
    }
    [data-composition-id="${cid}"] .football-event-title {
      font-size: 30px;
      font-weight: 950;
    }
    [data-composition-id="${cid}"] .football-event-desc {
      margin-top: 6px;
      color: rgba(255,255,255,0.68);
      font-size: 22px;
      font-weight: 760;
    }

    [data-composition-id="${cid}"] .football-schedule-head {
      position: relative;
      z-index: 2;
      padding: 0 6px;
    }
    [data-composition-id="${cid}"] .football-schedule-title {
      font-size: 46px;
      font-weight: 950;
      letter-spacing: -0.02em;
      text-shadow: 0 16px 44px rgba(0,0,0,0.42);
    }
    [data-composition-id="${cid}"] .football-schedule-sub {
      margin-top: 10px;
      font-size: 28px;
      font-weight: 820;
      color: rgba(255,255,255,0.78);
    }
    [data-composition-id="${cid}"] .football-schedule-tabs {
      position: relative;
      z-index: 2;
      margin-top: 34px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 16px 8px 14px;
      border-radius: 22px;
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.12);
      backdrop-filter: blur(10px);
    }
    [data-composition-id="${cid}"] .football-schedule-tab {
      text-align: center;
      font-size: 16px;
      font-weight: 950;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.74);
      padding: 10px 8px 18px;
      position: relative;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    [data-composition-id="${cid}"] .football-schedule-tab.active {
      color: rgba(255,255,255,0.96);
    }
    [data-composition-id="${cid}"] .football-schedule-tab.active::after {
      content: "";
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 6px;
      height: 3px;
      border-radius: 999px;
      background: #ffffff;
      opacity: 0.9;
    }
    [data-composition-id="${cid}"] .football-fixture-grid {
      position: relative;
      z-index: 2;
      margin-top: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    [data-composition-id="${cid}"] .football-fixture-card {
      border-radius: 22px;
      padding: 18px 18px 16px;
      background: rgba(8,17,31,0.78);
      border: 1px solid rgba(255,255,255,0.14);
      box-shadow: 0 22px 54px rgba(0,0,0,0.26);
      backdrop-filter: blur(12px);
    }
    [data-composition-id="${cid}"] .football-fixture-group {
      font-size: 15px;
      font-weight: 950;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.62);
      margin-bottom: 14px;
    }
    [data-composition-id="${cid}"] .football-fixture-row {
      display: grid;
      grid-template-columns: 1fr 170px;
      gap: 14px;
      align-items: center;
    }
    [data-composition-id="${cid}"] .football-fixture-teams {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
    }
    [data-composition-id="${cid}"] .football-fixture-team {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    [data-composition-id="${cid}"] .football-fixture-flag {
      width: 54px;
      height: 36px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.14);
      box-shadow: 0 14px 30px rgba(0,0,0,0.22);
      background: rgba(255,255,255,0.08);
      object-fit: cover;
      flex: 0 0 auto;
    }
    [data-composition-id="${cid}"] .football-fixture-flag.logo {
      width: 38px;
      height: 38px;
      border-radius: 999px;
    }
    [data-composition-id="${cid}"] .football-fixture-flag.placeholder {
      display: inline-block;
    }
    [data-composition-id="${cid}"] .football-fixture-teamname {
      font-size: 24px;
      font-weight: 900;
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    [data-composition-id="${cid}"] .football-fixture-meta {
      border-left: 1px solid rgba(255,255,255,0.16);
      padding-left: 14px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      gap: 6px;
      min-height: 96px;
    }
    [data-composition-id="${cid}"] .football-fixture-date {
      font-size: 16px;
      font-weight: 900;
      color: rgba(255,255,255,0.78);
    }
    [data-composition-id="${cid}"] .football-fixture-time {
      font-size: 22px;
      font-weight: 950;
      color: #F7C948;
      letter-spacing: 0.04em;
    }
    [data-composition-id="${cid}"] .football-fixture-pill {
      margin-top: 8px;
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding: 8px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.16);
      color: rgba(255,255,255,0.92);
      white-space: nowrap;
    }

    /* ── Football standings table ─────────────────────────────────────────── */
    [data-composition-id="${cid}"] .football-standings-wrap {
      position: relative;
      z-index: 2;
      margin-top: 28px;
      border-radius: 22px;
      background: rgba(0,0,0,0.34);
      border: 1px solid rgba(255,255,255,0.12);
      backdrop-filter: blur(12px);
      overflow: hidden;
    }
    [data-composition-id="${cid}"] .football-standings-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.12);
    }
    [data-composition-id="${cid}"] .football-standings-season {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 920;
      letter-spacing: 0.02em;
      color: rgba(255,255,255,0.92);
    }
    [data-composition-id="${cid}"] .football-standings-season small {
      display: block;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.60);
      margin-bottom: 3px;
    }
    [data-composition-id="${cid}"] .football-standings-table {
      width: 100%;
      border-collapse: collapse;
      font-variant-numeric: tabular-nums;
    }
    [data-composition-id="${cid}"] .football-standings-table thead th {
      padding: 14px 14px;
      text-align: right;
      font-size: 14px;
      font-weight: 950;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.58);
      background: rgba(0,0,0,0.22);
      border-bottom: 1px solid rgba(255,255,255,0.10);
      white-space: nowrap;
    }
    [data-composition-id="${cid}"] .football-standings-table thead th:first-child,
    [data-composition-id="${cid}"] .football-standings-table thead th:nth-child(2) {
      text-align: left;
    }
    [data-composition-id="${cid}"] .football-standings-table tbody td {
      padding: 14px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      text-align: right;
      font-size: 20px;
      font-weight: 900;
      color: rgba(255,255,255,0.86);
    }
    [data-composition-id="${cid}"] .football-standings-table tbody tr:last-child td {
      border-bottom: none;
    }
    [data-composition-id="${cid}"] .football-standings-table tbody td:first-child,
    [data-composition-id="${cid}"] .football-standings-table tbody td:nth-child(2) {
      text-align: left;
    }
    [data-composition-id="${cid}"] .football-standings-rank {
      width: 56px;
      color: rgba(255,255,255,0.78);
    }
    [data-composition-id="${cid}"] .football-standings-team {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    [data-composition-id="${cid}"] .football-standings-badge {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.14);
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    [data-composition-id="${cid}"] .football-standings-badge.flag { border-radius: 6px; }
    [data-composition-id="${cid}"] .football-standings-badge img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    [data-composition-id="${cid}"] .football-standings-teamname {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 22px;
      font-weight: 950;
      color: rgba(255,255,255,0.92);
    }
    [data-composition-id="${cid}"] .football-standings-pts {
      color: rgba(255,255,255,0.96);
    }
    [data-composition-id="${cid}"] .football-standings-last5 {
      display: inline-flex;
      justify-content: flex-end;
      gap: 6px;
      min-width: 120px;
    }
    [data-composition-id="${cid}"] .football-standings-last5 .football-form-dot {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 950;
      color: rgba(255,255,255,0.92);
      border: 2px solid rgba(255,255,255,0.18);
      background: rgba(255,255,255,0.08);
    }
    [data-composition-id="${cid}"] .football-form-dot.w { background: rgba(34,197,94,0.90); border-color: rgba(34,197,94,0.90); }
    [data-composition-id="${cid}"] .football-form-dot.d { background: rgba(148,163,184,0.62); border-color: rgba(148,163,184,0.62); }
    [data-composition-id="${cid}"] .football-form-dot.l { background: rgba(239,68,68,0.86); border-color: rgba(239,68,68,0.86); }
  `;
}

// ── Composition HTML Generators ───────────────────────────────────────────────

const COMPOSERS = {
  // ── Football / World Cup editorial-safe compositions ──────────────────────
  "football-match-card": (scene) => {
    const teams = normalizeFootballTeams(scene);
    const stage = scene.stage || scene.competitionLabel || "WORLD FOOTBALL";
    const venue = scene.venue || scene.subtext || "Match preview";
    return `
    <div class="canvas football-scene football-match-card" style="align-items:center; justify-content:flex-start; padding:150px 76px 150px; background:${footballBg(scene)};">
      ${footballPitchBackdrop(scene)}
      <div class="football-kicker">${escapeHtml(stage)}</div>
      <h1 class="football-title" id="s${scene.id}-title">${escapeHtml(scene.title || "Football Match")}</h1>
      <div class="football-matchup" id="s${scene.id}-matchup">
        ${footballTeamCard(teams[0], scene.accentColor, "left")}
        <div class="football-vs">
          <div class="football-ball-icon"></div>
          <div>VS</div>
        </div>
        ${footballTeamCard(teams[1], "#ffffff", "right")}
      </div>
      <div class="football-lower-third" id="s${scene.id}-lower">
        <span>${escapeHtml(venue)}</span>
        <strong>${escapeHtml(scene.minute || "PRE-MATCH")}</strong>
      </div>
    </div>`;
  },

  "football-scoreboard": (scene) => {
    const teams = normalizeFootballTeams(scene);
    const score = normalizeFootballScore(scene);
    const minute = scene.minute || "90'";
    const label = scene.competitionLabel || scene.stage || "MATCH UPDATE";
    return `
    <div class="canvas football-scene football-scoreboard" style="align-items:center; justify-content:center; padding:150px 76px 170px; background:${footballBg(scene)};">
      ${footballPitchBackdrop(scene)}
      <div class="football-score-shell" id="s${scene.id}-score-shell">
        <div class="football-kicker">${escapeHtml(label)}</div>
        <div class="football-clock">${escapeHtml(minute)}</div>
        <div class="football-score-row">
          <div class="football-score-team">${escapeHtml(teams[0].name)}</div>
          <div class="football-score-value"><span class="football-score-num">${escapeHtml(String(score[0]))}</span><span>-</span><span class="football-score-num">${escapeHtml(String(score[1]))}</span></div>
          <div class="football-score-team">${escapeHtml(teams[1].name)}</div>
        </div>
        <div class="football-score-note">${escapeHtml(scene.subtext || scene.title || "Dien bien tran dau")}</div>
      </div>
    </div>`;
  },

  "football-player-stat": (scene) => {
    const stats = normalizeFootballStats(scene);
    const player = scene.player || scene.playerName || scene.title || "Key Player";
    const team = scene.team || scene.club || scene.competitionLabel || "Football focus";
    return `
    <div class="canvas football-scene football-player-stat" style="align-items:flex-start; justify-content:flex-start; padding:150px 76px 170px; background:${footballBg(scene)};">
      ${footballPitchBackdrop(scene)}
      <div class="football-player-spotlight" id="s${scene.id}-player">
        <div>
          <div class="football-kicker">${escapeHtml(team)}</div>
          <h1 class="football-title" id="s${scene.id}-title" style="text-align:left; max-width:650px;">${escapeHtml(player)}</h1>
          <div class="football-player-note">${escapeHtml(scene.subtext || "Thong so noi bat")}</div>
        </div>
        <div class="football-shirt">
          <div class="football-shirt-number">${escapeHtml(String(scene.number || scene.jersey || "10"))}</div>
        </div>
      </div>
      <div class="football-stat-grid">
        ${stats.slice(0, 4).map((stat, i) => `
          <div class="football-stat-card" id="s${scene.id}-stat-${i}">
            <div class="football-stat-value">${escapeHtml(String(stat.value ?? stat.home ?? ""))}${escapeHtml(stat.unit || "")}</div>
            <div class="football-stat-label">${escapeHtml(stat.label || "")}</div>
          </div>
        `).join("")}
      </div>
    </div>`;
  },

  "football-odds-h2h": (scene) => {
    const teams = normalizeFootballTeams(scene);
    const table = normalizeFootballOddsTable(scene, teams);
    const matches = normalizeFootballH2HMatches(scene, teams);
    const header = scene.title || "TỶ LỆ KÈO & ĐỐI ĐẦU";
    const sub = scene.subtext || scene.competitionLabel || scene.stage || "3 trận gần nhất";

    const renderCell = (cell) => {
      if (!cell) return `<div class="football-odds-cell"></div>`;
      if (typeof cell === "string" || typeof cell === "number") {
        return `<div class="football-odds-cell"><div class="football-odds-main">${escapeHtml(String(cell))}</div></div>`;
      }
      const main = cell.main ?? cell.value ?? cell.text ?? "";
      const sub = cell.sub ?? cell.secondary ?? cell.note ?? "";
      const tone = String(cell.tone || cell.color || "").toLowerCase();
      const toneClass =
        tone === "red" || tone === "danger" ? "tone-red"
          : tone === "orange" || tone === "warn" ? "tone-orange"
            : tone === "green" || tone === "good" ? "tone-green"
              : tone === "blue" ? "tone-blue"
                : "";
      return `<div class="football-odds-cell ${toneClass}">
        <div class="football-odds-main">${escapeHtml(String(main))}</div>
        ${sub ? `<div class="football-odds-sub">${escapeHtml(String(sub))}</div>` : ""}
      </div>`;
    };

    const renderScoreCell = (row) => {
      const score = row?.scoreText ?? row?.score ?? "";
      const minute = row?.minute ?? row?.time ?? "";
      const hasMinute = String(minute || "").trim() !== "";
      const hasScore = String(score || "").trim() !== "";
      return `<div class="football-odds-score">
        ${hasScore ? `<div class="football-odds-score-num">${escapeHtml(String(score))}</div>` : `<div class="football-odds-score-num empty"></div>`}
        ${hasMinute ? `<div class="football-odds-score-minute">${escapeHtml(String(minute))}</div>` : ""}
      </div>`;
    };

    const badge = (t) => t?.badgeSrc
      ? `<img class="football-odds-team-badge ${t.badgeType === "national" ? "flag" : "logo"}" src="${escapeHtmlAttr(t.badgeSrc)}" alt="${escapeHtmlAttr(t.name)}" />`
      : `<div class="football-odds-team-badge placeholder"></div>`;

    const renderTeamCell = (row, idx) => {
      const teamName = row?.teamName || row?.name || row?.label || (idx === 2 ? "Hòa" : (teams[idx]?.name || ""));
      const teamBadge = row?.teamBadgeSrc ? { badgeSrc: row.teamBadgeSrc, badgeType: row.teamBadgeType } : (idx < 2 ? teams[idx] : null);
      return `<div class="football-odds-team">
        ${teamBadge ? badge(teamBadge) : `<div class="football-odds-team-badge placeholder"></div>`}
        <div class="football-odds-team-name">${escapeHtml(String(teamName))}</div>
      </div>`;
    };

    const headerCells = (Array.isArray(table.headers) && table.headers.length ? table.headers : ["Đội bóng", "Tỷ số", "1x2", "HDP", "Tài xỉu", "HT HDP"])
      .slice(0, 6)
      .map((h) => `<div class="football-odds-th">${escapeHtml(String(h))}</div>`)
      .join("");

    const rowsHtml = table.rows.slice(0, 3).map((row, idx) => {
      return `<div class="football-odds-tr ${idx === 1 ? "is-away" : ""}">
        <div class="football-odds-td col-team">${renderTeamCell(row, idx)}</div>
        <div class="football-odds-td col-score">${renderScoreCell(row)}</div>
        <div class="football-odds-td col-x12">${renderCell(row.x12 || row["1x2"] || row.oneXtwo || row.one_x_two)}</div>
        <div class="football-odds-td col-hdp">${renderCell(row.hdp || row.handicap)}</div>
        <div class="football-odds-td col-ou">${renderCell(row.ou || row.overUnder || row.taiXiu)}</div>
        <div class="football-odds-td col-hthdp">${renderCell(row.htHdp || row.ht_handicap || row.halfTimeHandicap)}</div>
      </div>`;
    }).join("");

    const normalizeKey = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const pickBadgeByName = (name) => {
      const key = normalizeKey(name);
      const found = teams.find((t) => normalizeKey(t?.name) === key);
      return found?.badgeSrc ? { badgeSrc: found.badgeSrc, badgeType: found.badgeType } : null;
    };
    const renderMiniLogo = (badgeObj, fallbackName, side) => {
      const b = badgeObj || pickBadgeByName(fallbackName);
      if (b?.badgeSrc) {
        const cls = b.badgeType === "national" ? "flag" : "logo";
        return `<img class="football-h2h-logo ${cls} ${side}" src="${escapeHtmlAttr(b.badgeSrc)}" alt="${escapeHtmlAttr(fallbackName || "")}" />`;
      }
      return `<div class="football-h2h-logo placeholder ${side}"></div>`;
    };
    const parseScore = (scoreText) => {
      const s = String(scoreText || "").trim();
      if (!s) return { a: "", b: "" };
      const m = s.match(/(-?\d+)\s*[:\-–]\s*(-?\d+)/);
      if (!m) return { a: s, b: "" };
      return { a: m[1], b: m[2] };
    };

    const matchesHtml = matches.slice(0, 3).map((m, i) => {
      const time = m.kickoff || m.time || m.date || "";
      const comp = m.competition || m.league || m.tournament || "H2H";
      const home = m.home || m.teamA || m.left || teams[0]?.name || "Home";
      const away = m.away || m.teamB || m.right || teams[1]?.name || "Away";
      const scoreText = m.score || (Number.isFinite(m.homeScore) && Number.isFinite(m.awayScore) ? `${m.homeScore}-${m.awayScore}` : "");
      const { a: homeScore, b: awayScore } = parseScore(scoreText);

      const homeBadge = m.homeBadgeSrc ? { badgeSrc: m.homeBadgeSrc, badgeType: m.homeBadgeType } : null;
      const awayBadge = m.awayBadgeSrc ? { badgeSrc: m.awayBadgeSrc, badgeType: m.awayBadgeType } : null;

      return `<div class="football-h2h-card" id="s${scene.id}-h2h-${i}">
        <div class="football-h2h-top">
          <div class="football-h2h-comp">
            <span class="football-h2h-comp-icon"></span>
            <span class="football-h2h-comp-text">${escapeHtml(String(comp))}</span>
          </div>
          <div class="football-h2h-time">${escapeHtml(String(time))}</div>
        </div>
        <div class="football-h2h-mid">
          <div class="football-h2h-side left">
            ${renderMiniLogo(homeBadge, home, "left")}
            <div class="football-h2h-name">${escapeHtml(String(home))}</div>
          </div>
          <div class="football-h2h-scorepill">
            <span class="football-h2h-score-num home">${escapeHtml(String(homeScore || "-"))}</span>
            <span class="football-h2h-score-colon">:</span>
            <span class="football-h2h-score-num away">${escapeHtml(String(awayScore || "-"))}</span>
          </div>
          <div class="football-h2h-side right">
            <div class="football-h2h-name">${escapeHtml(String(away))}</div>
            ${renderMiniLogo(awayBadge, away, "right")}
          </div>
        </div>
      </div>`;
    }).join("");

    return `
    <div class="canvas football-scene football-odds-h2h" style="align-items:stretch; justify-content:flex-start; padding:118px 62px 138px; background:${footballBg(scene)};">
      ${footballPitchBackdrop(scene)}
      <div class="football-odds-head">
        <div class="football-kicker">${escapeHtml(sub)}</div>
        <h1 class="football-title" id="s${scene.id}-title" style="margin-top:16px;">${escapeHtml(header)}</h1>
      </div>

      <div class="football-odds-panels">
        <div class="football-odds-panel" id="s${scene.id}-odds">
          <div class="football-odds-table">
            <div class="football-odds-thead">${headerCells}</div>
            <div class="football-odds-tbody">${rowsHtml}</div>
          </div>
        </div>

        <div class="football-h2h-panel" id="s${scene.id}-h2h">
          <div class="football-h2h-title">Lịch sử đối đầu (3 trận gần nhất)</div>
          <div class="football-h2h-list">${matchesHtml}</div>
        </div>
      </div>
    </div>`;
  },

  "football-lineup": (scene) => {
    const teams = normalizeFootballTeams(scene);
    const lineup = normalizeFootballLineups(scene, teams);
    const venue = scene.venue || scene.stadium || scene.location || scene.subtext || "";

    const homePlayers = buildFootballLineupPlayersHtml({
      sceneId: scene.id,
      side: "home",
      team: teams[0],
      formation: lineup.home.formation,
      players: lineup.home.players,
    });
    const awayPlayers = buildFootballLineupPlayersHtml({
      sceneId: scene.id,
      side: "away",
      team: teams[1],
      formation: lineup.away.formation,
      players: lineup.away.players,
    });

    return `
    <div class="canvas football-scene football-lineup" style="align-items:center; justify-content:flex-start; padding:86px 76px 90px; background:${footballBg(scene)};">
      ${footballPitchBackdrop(scene)}
      <div class="football-lineup-topbar">
        <div class="football-kicker">${escapeHtml(scene.competitionLabel || scene.stage || "LINEUPS")}</div>
        <div class="football-lineup-venue" id="s${scene.id}-venue">${escapeHtml(venue || "Sân vận động")}</div>
      </div>
      <h1 class="football-title" id="s${scene.id}-title" style="margin-top:20px;">${escapeHtml(scene.title || "Đội hình ra sân")}</h1>

      <div class="football-lineup-teamblock top" id="s${scene.id}-team-home">
        <div class="football-lineup-teamcode">${escapeHtml(teams[0].code)}</div>
        <div class="football-lineup-teamname">${escapeHtml(teams[0].name)}</div>
        <div class="football-lineup-formation-label">${escapeHtml(lineup.home.formation)}</div>
      </div>

      <div class="football-lineup-pitch" id="s${scene.id}-lineup-pitch">
        ${homePlayers}
        ${awayPlayers}
      </div>

      <div class="football-lineup-teamblock bottom" id="s${scene.id}-team-away">
        <div class="football-lineup-teamcode">${escapeHtml(teams[1].code)}</div>
        <div class="football-lineup-teamname">${escapeHtml(teams[1].name)}</div>
        <div class="football-lineup-formation-label">${escapeHtml(lineup.away.formation)}</div>
      </div>
    </div>`;
  },

  "football-bracket-flow": (scene) => {
    const stages = normalizeFootballStages(scene);
    const nodes = stages.slice(0, 7);
    const nodeW = 220;
    const nodeH = 110;
    const layout = [
      { x: (900 - nodeW) / 2, y: 24 }, // root
      { x: 120, y: 170 }, // mid-left
      { x: 560, y: 170 }, // mid-right
      { x: 20, y: 360 }, // leaf-1
      { x: 240, y: 360 }, // leaf-2
      { x: 460, y: 360 }, // leaf-3
      { x: 680, y: 360 }, // leaf-4
    ];
    const palette = ["#F7C948", "#98E58B", "#F6B58D", "#C8B6FF", "#86D8FF", "#FF9DB7", "#FFE35A"];
    const cx = (pt) => pt.x + nodeW / 2;
    const topY = (pt) => pt.y;
    const bottomY = (pt) => pt.y + nodeH;

    const has = (i) => Boolean(nodes[i]);
    const trunkY1 = 150;
    const trunkY2 = 300;
    const paths = [];
    if (has(0) && (has(1) || has(2))) {
      [1, 2].forEach((i) => {
        if (!has(i)) return;
        const p0 = layout[0];
        const pi = layout[i];
        paths.push(`M ${cx(p0)} ${bottomY(p0)} V ${trunkY1} H ${cx(pi)} V ${topY(pi)}`);
      });
    }
    if (has(1)) {
      [3, 4].forEach((i) => {
        if (!has(i)) return;
        const p1 = layout[1];
        const pi = layout[i];
        paths.push(`M ${cx(p1)} ${bottomY(p1)} V ${trunkY2} H ${cx(pi)} V ${topY(pi)}`);
      });
    }
    if (has(2)) {
      [5, 6].forEach((i) => {
        if (!has(i)) return;
        const p2 = layout[2];
        const pi = layout[i];
        paths.push(`M ${cx(p2)} ${bottomY(p2)} V ${trunkY2} H ${cx(pi)} V ${topY(pi)}`);
      });
    }
    return `
    <div class="canvas football-scene football-bracket-flow" style="align-items:center; justify-content:flex-start; padding:150px 76px 170px; background:${footballBg(scene)};">
      ${footballPitchBackdrop(scene)}
      <div class="football-kicker">${escapeHtml(scene.competitionLabel || "TOURNAMENT PATH")}</div>
      <h1 class="football-title" id="s${scene.id}-title">${escapeHtml(scene.title || "Road to the final")}</h1>
      <div class="football-bracket" id="s${scene.id}-bracket">
        <svg viewBox="0 0 900 560" class="football-bracket-svg">
          ${paths.map((d) => `<path class="football-bracket-path" d="${d}" />`).join("")}
        </svg>
        ${nodes.map((st, i) => {
          const pt = layout[i] || layout[layout.length - 1];
          const bg = palette[i % palette.length];
          const stageLabel = st.stage || st.label || (i === 0 ? "START" : i <= 2 ? "BRANCH" : "RESULT");
          const title = st.title || st.team || st.value || "";
          return `
          <div class="football-bracket-node" id="s${scene.id}-bracket-${i}" style="left:${pt.x}px; top:${pt.y}px; --node-bg:${bg};">
            <div class="football-node-stage">${escapeHtml(stageLabel)}</div>
            <div class="football-node-title">${escapeHtml(title)}</div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  },

  "football-timeline": (scene) => {
    const events = normalizeFootballEvents(scene);
    return `
    <div class="canvas football-scene football-timeline" style="align-items:flex-start; justify-content:flex-start; padding:150px 76px 170px; background:${footballBg(scene)};">
      ${footballPitchBackdrop(scene)}
      <div class="football-kicker">${escapeHtml(scene.competitionLabel || scene.stage || "MATCH TIMELINE")}</div>
      <h1 class="football-title" id="s${scene.id}-title" style="text-align:left;">${escapeHtml(scene.title || "Dien bien chinh")}</h1>
      <div class="football-event-list">
        ${events.slice(0, 5).map((ev, i) => `
          <div class="football-event" id="s${scene.id}-event-${i}">
            <div class="football-event-minute">${escapeHtml(ev.minute || `${i * 15 + 12}'`)}</div>
            <div class="football-event-card">
              <div class="football-event-title">${escapeHtml(ev.title || ev.label || "")}</div>
              <div class="football-event-desc">${escapeHtml(ev.desc || ev.description || ev.value || "")}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>`;
  },

  "football-upcoming-schedule": (scene) => {
    const fixtures = normalizeFootballFixtures(scene);
    const headerTitle = scene.title || scene.tournamentTitle || "Giải Bóng đá Thế giới 2026";
    const headerSub = scene.subtext || scene.tournamentStage || "Vòng đấu bảng";
    const tabs = Array.isArray(scene.tabs) && scene.tabs.length
      ? scene.tabs
      : ["TRẬN ĐẤU", "SƠ ĐỒ THI ĐẤU", "CẦU THỦ", "BẢNG XẾP HẠNG"];
    const active = String(scene.activeTab ?? tabs[0]).toUpperCase();
    const pill = scene.ctaLabel || "MATCH STORY";

    return `
    <div class="canvas football-scene football-schedule" style="align-items:stretch; justify-content:flex-start; padding:124px 66px 160px; background:${footballBg(scene)};">
      ${footballPitchBackdrop(scene)}
      <div class="football-schedule-head">
        <div class="football-schedule-title" id="s${scene.id}-title">${escapeHtml(headerTitle)}</div>
        <div class="football-schedule-sub">${escapeHtml(headerSub)}</div>
      </div>
      <div class="football-schedule-tabs" id="s${scene.id}-tabs">
        ${tabs.slice(0, 4).map((t, i) => {
          const label = String(t || "").toUpperCase();
          const isActive = label === active || String(i) === String(scene.activeTabIndex);
          return `<div class="football-schedule-tab ${isActive ? "active" : ""}">${escapeHtml(label)}</div>`;
        }).join("")}
      </div>
      <div class="football-fixture-grid" id="s${scene.id}-fixture-grid">
        ${fixtures.map((fx, i) => {
          const homeFlag = fx.home?.badgeSrc
            ? `<img class="football-fixture-flag ${fx.home.badgeType === "national" ? "flag" : "logo"}" src="${escapeHtmlAttr(fx.home.badgeSrc)}" alt="${escapeHtmlAttr(fx.home.name)}" />`
            : `<div class="football-fixture-flag placeholder"></div>`;
          const awayFlag = fx.away?.badgeSrc
            ? `<img class="football-fixture-flag ${fx.away.badgeType === "national" ? "flag" : "logo"}" src="${escapeHtmlAttr(fx.away.badgeSrc)}" alt="${escapeHtmlAttr(fx.away.name)}" />`
            : `<div class="football-fixture-flag placeholder"></div>`;
          return `
          <div class="football-fixture-card" id="s${scene.id}-fixture-${i}">
            <div class="football-fixture-group">${escapeHtml(fx.group || "")}</div>
            <div class="football-fixture-row">
              <div class="football-fixture-teams">
                <div class="football-fixture-team">
                  ${homeFlag}
                  <div class="football-fixture-teamname">${escapeHtml(fx.home?.name || "")}</div>
                </div>
                <div class="football-fixture-team">
                  ${awayFlag}
                  <div class="football-fixture-teamname">${escapeHtml(fx.away?.name || "")}</div>
                </div>
              </div>
              <div class="football-fixture-meta">
                <div class="football-fixture-date">${escapeHtml(fx.date || "")}</div>
                <div class="football-fixture-time">${escapeHtml(fx.time || "")}</div>
                <div class="football-fixture-pill">${escapeHtml(pill)}</div>
              </div>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  },

  "football-standings-table": (scene) => {
    const table = normalizeFootballStandings(scene);
    const tabs = Array.isArray(scene.tabs) && scene.tabs.length
      ? scene.tabs
      : ["TRẬN ĐẤU", "SƠ ĐỒ THI ĐẤU", "CẦU THỦ", "BẢNG XẾP HẠNG"];
    const active = String(scene.activeTab ?? "BẢNG XẾP HẠNG").toUpperCase();

    const headerTitle = scene.title
      || (table.variant === "club-league" ? (scene.competitionLabel || "League Table") : "Bảng xếp hạng");
    const headerSub = scene.subtext
      || table.subtitle
      || (table.variant === "club-league" ? (table.season || "") : (table.group || ""));

    const seasonBar = table.variant === "club-league"
      ? `
        <div class="football-standings-topbar">
          <div class="football-standings-season">
            <div>
              <small>Season</small>
              <div>${escapeHtml(table.season || "")}</div>
            </div>
          </div>
        </div>
      `
      : "";

    const headHtml = table.variant === "club-league"
      ? `
        <thead>
          <tr>
            <th class="football-standings-rank"></th>
            <th>Club</th>
            <th>MP</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>GD</th>
            <th class="football-standings-pts">Pts</th>
            <th style="text-align:right;">Last 5</th>
          </tr>
        </thead>
      `
      : `
        <thead>
          <tr>
            <th class="football-standings-rank"></th>
            <th>Đội</th>
            <th>ĐĐ</th>
            <th>Thắng</th>
            <th>H</th>
            <th>Thua</th>
            <th>BT</th>
            <th>SBT</th>
            <th>HS</th>
            <th>Đ</th>
          </tr>
        </thead>
      `;

    const rowsHtml = table.rows.map((r, i) => {
      const rank = r.rank ?? (i + 1);
      const badge = r.team?.badgeSrc
        ? `<span class="football-standings-badge ${r.team.badgeType === "national" ? "flag" : "logo"}"><img src="${escapeHtmlAttr(r.team.badgeSrc)}" alt="${escapeHtmlAttr(r.team.name || "")}"/></span>`
        : `<span class="football-standings-badge"></span>`;

      const last5 = Array.isArray(r.last5) ? r.last5.slice(0, 5) : [];
      const last5Html = last5.length
        ? `<span class="football-standings-last5">${last5.map((x) => {
            const v = String(x || "").toUpperCase();
            const cls = v === "W" ? "w" : (v === "D" ? "d" : "l");
            return `<span class="football-form-dot ${cls}">${escapeHtml(v || "")}</span>`;
          }).join("")}</span>`
        : `<span class="football-standings-last5"></span>`;

      const numericCols = table.variant === "club-league"
        ? `
          <td>${escapeHtml(String(r.played ?? ""))}</td>
          <td>${escapeHtml(String(r.wins ?? ""))}</td>
          <td>${escapeHtml(String(r.draws ?? ""))}</td>
          <td>${escapeHtml(String(r.losses ?? ""))}</td>
          <td>${escapeHtml(String(r.gf ?? ""))}</td>
          <td>${escapeHtml(String(r.ga ?? ""))}</td>
          <td>${escapeHtml(String(r.gd ?? ""))}</td>
          <td class="football-standings-pts">${escapeHtml(String(r.pts ?? ""))}</td>
          <td style="text-align:right;">${last5Html}</td>
        `
        : `
          <td>${escapeHtml(String(r.played ?? ""))}</td>
          <td>${escapeHtml(String(r.wins ?? ""))}</td>
          <td>${escapeHtml(String(r.draws ?? ""))}</td>
          <td>${escapeHtml(String(r.losses ?? ""))}</td>
          <td>${escapeHtml(String(r.gf ?? ""))}</td>
          <td>${escapeHtml(String(r.ga ?? ""))}</td>
          <td>${escapeHtml(String(r.gd ?? ""))}</td>
          <td class="football-standings-pts">${escapeHtml(String(r.pts ?? ""))}</td>
        `;

      return `
        <tr id="s${scene.id}-stand-${i}">
          <td class="football-standings-rank">${escapeHtml(String(rank))}</td>
          <td>
            <div class="football-standings-team">
              ${badge}
              <span class="football-standings-teamname">${escapeHtml(r.team?.name || "")}</span>
            </div>
          </td>
          ${numericCols}
        </tr>
      `;
    }).join("");

    return `
    <div class="canvas football-scene football-standings" style="align-items:stretch; justify-content:flex-start; padding:124px 66px 150px; background:${footballBg(scene)};">
      ${footballPitchBackdrop(scene)}
      <div class="football-schedule-head">
        <div class="football-schedule-title" id="s${scene.id}-title">${escapeHtml(headerTitle)}</div>
        <div class="football-schedule-sub">${escapeHtml(headerSub)}</div>
      </div>
      <div class="football-schedule-tabs" id="s${scene.id}-tabs">
        ${tabs.slice(0, 4).map((t, i) => {
          const label = String(t || "").toUpperCase();
          const isActive = label === active || String(i) === String(scene.activeTabIndex);
          return `<div class="football-schedule-tab ${isActive ? "active" : ""}">${escapeHtml(label)}</div>`;
        }).join("")}
      </div>
      <div class="football-standings-wrap" id="s${scene.id}-standings">
        ${seasonBar}
        <table class="football-standings-table">
          ${headHtml}
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>`;
  },

  // ── AI-news compositions (default template set) ────────────────────────────
  "hook-question": (scene) => {
    const label = scene.label || "VẤN ĐỀ THẬT";
    const titleHtml = formatHookTitleHtml(scene.title || scene.voiceText || "", scene.highlightWords);
    const kicker = scene.kicker || "";
    return `
    <div class="canvas" style="align-items:flex-start; justify-content:flex-start; padding:210px 90px;">
      <div style="position:relative; z-index:2; width:100%;">
        <div class="ai-label" style="margin-bottom:18px; color: rgba(245,197,78,0.9);">${escapeHtml(label)}</div>
        <div class="ai-card" style="
          width:100%;
          padding:34px 34px 32px;
          border-radius:26px;
          background: rgba(10, 12, 24, 0.72);
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 18px 44px rgba(0,0,0,0.45);
          backdrop-filter: blur(10px);
        ">
          <div style="display:flex; gap:22px; align-items:flex-start; width:100%;">
            <div style="font-size:92px; line-height:1; opacity:0.45; transform: translateY(-6px);">“</div>
            <div style="width:6px; border-radius:10px; background: rgba(141,211,255,0.9); box-shadow: 0 0 0 1px rgba(255,255,255,0.08);"></div>
            <div style="flex:1;">
              <div class="ai-title" style="max-width: 880px;">${titleHtml}</div>
              ${kicker ? `<div class="ai-muted" style="margin-top:22px; font-size:30px; font-weight:700;">${escapeHtml(kicker)}</div>` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  "ui-cards": (scene) => {
    const title = scene.title || "Trusted Contact";
    const cards = Array.isArray(scene.cards) ? scene.cards : [];

    const safeCards = cards.length
      ? cards
      : [
          { title: "7 / 05", subtitle: "Ngày ra mắt", icon: "📅" },
          { title: "Người thân", subtitle: "Vai trò liên hệ", icon: "💛" },
          { title: "Người trên 18", subtitle: "Đối tượng", icon: "🔞" },
        ];

    const useSingleColumn = safeCards.length < 5;
    const maxCards = useSingleColumn ? 4 : 6;
    const shownCards = safeCards.slice(0, maxCards);

    const cardsHtml = shownCards
      .map(
        (c, i) => `
          <div class="ai-card ai-card-pop ai-ui-card" id="s${scene.id}-uicard-${i}" style="width:100%; padding:26px 28px; opacity:0;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:18px;">
              <div style="min-width:0;">
                <div class="ai-gradient-text" style="font-size:${useSingleColumn ? 38 : 34}px; font-weight:900; line-height:1.15; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(c.title || "")}
                </div>
                <div class="ai-muted" style="margin-top:8px; font-size:${useSingleColumn ? 22 : 20}px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(c.subtitle || "")}
                </div>
              </div>
              <div style="font-size:${useSingleColumn ? 34 : 28}px; opacity:0.9; flex:0 0 auto;">${escapeHtml(c.icon || "⭐")}</div>
            </div>
          </div>
        `
      )
      .join("");
    return `
    <div class="canvas" style="align-items:center; justify-content:flex-start; padding-top:220px;">
      <div class="ai-title ai-gradient-text" style="font-size:54px; font-weight:900; letter-spacing:-0.01em; opacity:0.95; margin-bottom:40px;">
        ${escapeHtml(title)}
      </div>
      <div style="
        ${useSingleColumn ? "display:flex; flex-direction:column;" : "display:grid; grid-template-columns: 1fr 1fr;"}
        gap:18px;
        width:${useSingleColumn ? "920px" : "940px"};
        max-width:${useSingleColumn ? "920px" : "940px"};
      ">
        ${cardsHtml}
      </div>
    </div>`;
  },

  "process-steps": (scene) => {
    const title = scene.title || "Quy Trình 4 Bước";
    const steps = Array.isArray(scene.steps) ? scene.steps : [];
    const safeSteps = steps.length ? steps : [
      { title: "Thêm liên hệ", desc: "Chọn 1 người thân trong cài đặt", state: "done", icon: "✓" },
      { title: "Chờ chấp nhận", desc: "Người được chọn đồng ý", state: "done", icon: "✓" },
      { title: "AI phát hiện dấu hiệu", desc: "Hệ thống tự động đo nguy cơ", state: "done", icon: "✓" },
      { title: "Con người kiểm tra", desc: "Đội hỗ trợ duyệt nhanh", state: "active", icon: "👤" },
    ];
    return `
    <div class="canvas" style="align-items:flex-start; justify-content:flex-start; padding:200px 90px;">
      <div class="ai-title" style="font-size:58px; font-weight:900; margin-bottom:44px; opacity:0.92;">
        ${escapeHtml(title)}
      </div>
      <div style="display:flex; gap:26px; width:100%;">
        <div style="position:relative; width:60px; flex:0 0 60px;">
          <div style="position:absolute; top:16px; bottom:16px; left:28px; width:4px; background: rgba(255,255,255,0.10); border-radius:999px;"></div>
        </div>
        <div style="flex:1; display:flex; flex-direction:column; gap:40px;">
          ${safeSteps.map((st, i) => {
            const done = st.state === "done";
            const active = st.state === "active";
            return `
            <div class="ai-step" id="s${scene.id}-step-${i}" style="display:flex; gap:22px; align-items:flex-start; opacity:0;">
              <div class="ai-card" style="width:58px; height:58px; border-radius:999px; display:flex; align-items:center; justify-content:center; background:${done ? "rgba(141,211,255,0.14)" : "rgba(255,255,255,0.06)"}; border-color:${done ? "rgba(141,211,255,0.35)" : "rgba(255,255,255,0.12)"};">
                <div style="font-size:26px; font-weight:900; color:${done ? "#8dd3ff" : "rgba(255,255,255,0.75)"};">${escapeHtml(st.icon || (done ? "✓" : "•"))}</div>
              </div>
              <div style="flex:1;">
                <div style="font-size:32px; font-weight:900; color:${active ? "#8dd3ff" : "#ffffff"};">${escapeHtml(st.title || "")}</div>
                <div class="ai-muted" style="margin-top:8px; font-size:24px; font-weight:700;">${escapeHtml(st.desc || "")}</div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>
    </div>`;
  },

  "quote-attrib": (scene) => {
    const quote = scene.quote || scene.voiceText || scene.title || "";
    const author = scene.quoteAuthor || scene.author || "Tiến sĩ Arthur Evans";
    const role = scene.quoteRole || scene.role || "Tổng Giám Đốc Hiệp Hội Tâm Lý Học Hoa Kỳ";
    return `
    <div class="canvas" style="align-items:center; justify-content:center; padding:160px 90px;">
      <div style="font-size:84px; opacity:0.25; margin-bottom:18px;">“</div>
      <div style="max-width: 920px; text-align:center; font-size:46px; font-weight:800; font-style:italic; line-height:1.35; color:rgba(255,255,255,0.92);">
        ${escapeHtml(quote)}
      </div>
      <div style="margin-top:44px; text-align:center;">
        <div style="font-size:30px; font-weight:900; color:#8dd3ff;">${escapeHtml(author)}</div>
        <div class="ai-muted" style="margin-top:10px; font-size:18px; font-weight:700; letter-spacing:0.02em;">${escapeHtml(role)}</div>
      </div>
    </div>`;
  },

  "stats-cards-grid": (scene) => {
    const title = scene.title || "Đứng Sau Tính Năng";
    const items = Array.isArray(scene.statsCards) ? scene.statsCards : [];
    const safeItems = items.length ? items : [
      { icon: "🩺", value: "260+", label: "Bác sĩ tham gia" },
      { icon: "🌍", value: "60", label: "Quốc gia" },
      { icon: "🧠", value: "170+", label: "Chuyên gia tâm lý" },
      { icon: "🔒", value: "Không", label: "Nội dung chia sẻ" },
    ];
    const useSingleColumn = safeItems.length < 5;
    const maxCards = useSingleColumn ? 4 : 6;
    const grid = safeItems.slice(0, maxCards).map((it, i) => `
      <div class="ai-card ai-card-pop ai-stat-card" id="s${scene.id}-statcard-${i}" style="padding:26px 26px; opacity:0;">
        <div style="font-size:26px; opacity:0.9; margin-bottom:10px;">${escapeHtml(it.icon || "")}</div>
        <div class="ai-gradient-text" style="font-size:62px; font-weight:900; letter-spacing:-0.02em;">
          <span class="ai-countup" data-final="${escapeHtml(it.value || "")}">${escapeHtml(it.value || "")}</span>
        </div>
        <div class="ai-muted" style="margin-top:6px; font-size:18px; font-weight:800;">${escapeHtml(it.label || "")}</div>
      </div>
    `).join("");
    return `
    <div class="canvas" style="align-items:center; justify-content:flex-start; padding-top:220px;">
      <div class="ai-title ai-gradient-text" style="font-size:54px; font-weight:900; opacity:0.95; margin-bottom:44px;">
        ${escapeHtml(title)}
      </div>
      <div style="display:grid; grid-template-columns: ${useSingleColumn ? "1fr" : "1fr 1fr"}; gap:18px; width: 880px; max-width: 880px;">
        ${grid}
      </div>
    </div>`;
  },

  "kinetic-title": (scene) => {
    const words = Array.isArray(scene.words) ? scene.words : (scene.title || "").split(/\s+/).slice(0, 4);
    const big = words.join(" ");
    const faint = (scene.faintWords || words.slice(0, Math.max(1, words.length - 1)).join(" ")).toUpperCase();
    const lines = Array.isArray(scene.terminalLines) ? scene.terminalLines : [];
    const hasTerminal = lines.length > 0;
    return `
    <div class="canvas" style="align-items:flex-start; justify-content:flex-start; padding:190px 90px;">
      <div style="width:100%; display:flex; flex-direction:column; gap:${hasTerminal ? "46px" : "0"};">
      <div class="ai-kinetic" style="position:relative; width:100%; height:${hasTerminal ? "420px" : "100%"};">
        <div class="ai-kinetic-faint" style="position:absolute; top:-10px; left:-10px; font-size:132px; font-weight:900; letter-spacing:-0.03em; color: rgba(255,255,255,0.14); text-transform:uppercase;">
          ${escapeHtml(faint)}
        </div>
        <div class="ai-kinetic-main ai-gradient-text" style="position:absolute; top:120px; left:0; font-size:118px; font-weight:900; letter-spacing:-0.03em; text-transform:uppercase;">
          ${escapeHtml(big.toUpperCase())}
        </div>
      </div>
      ${hasTerminal ? `
      <div class="terminal-wrap" id="s${scene.id}-terminal" style="width: 100%; max-width: 980px;">
        <div class="terminal-header">
          <div class="terminal-dot dot-red"></div>
          <div class="terminal-dot dot-yellow"></div>
          <div class="terminal-dot dot-green"></div>
          <div class="terminal-title">${escapeHtml(scene.terminalTitle || "agent-trending")}</div>
        </div>
        <div class="terminal-body" style="padding:26px 30px; font-size:28px;">
          ${lines.slice(0, 6).map((line, i) => `
            <div style="margin-bottom:12px;" class="line-${line.type || "output"}" id="s${scene.id}-line-${i}">
              ${line.type === "prompt" ? "$ " : ""}${escapeHtml(line.text)}
            </div>`).join("")}
        </div>
      </div>` : ""}
      </div>
    </div>`;
  },

  "context-bars": (scene) => {
    const title = scene.title || "Bối Cảnh Phía Sau";
    const rows = Array.isArray(scene.rows) ? scene.rows : [];
    const safeRows = rows.length ? rows : [
      { icon: "📅", label: "Thời điểm", value: "11 / 2025" },
      { icon: "⚖️", label: "Vụ kiện chống OpenAI", value: "7 vụ" },
      { icon: "🚨", label: "Cáo buộc chính", value: "Bỏ qua an toàn" },
    ];
    return `
    <div class="canvas" style="align-items:center; justify-content:flex-start; padding-top:220px;">
      <div class="ai-title ai-gradient-text" style="font-size:54px; font-weight:900; opacity:0.95; margin-bottom:44px;">
        ${escapeHtml(title)}
      </div>
      <div style="width: 900px; max-width: 900px; display:flex; flex-direction:column; gap:18px;">
        ${safeRows.slice(0, 3).map((r, i) => `
          <div class="ai-card ai-card-pop ai-row-card" id="s${scene.id}-row-${i}" style="padding:18px 22px; opacity:0;">
            <div class="ai-row">
              <div style="display:flex; align-items:center; gap:14px;">
                <div style="font-size:24px; opacity:0.9;">${escapeHtml(r.icon || "")}</div>
                <div class="ai-muted" style="font-size:22px; font-weight:900;">${escapeHtml(r.label || "")}</div>
              </div>
              <div class="ai-gradient-text" style="font-size:34px; font-weight:900;">${escapeHtml(r.value || "")}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>`;
  },

  "promo-card": (scene) => {
    const headline = scene.title || "ChatGPT báo người thân khi bạn khủng hoảng";
    const promo = scene.promo || {};
    const badge = promo.badge || "Giảm đến 80%";
    const button = promo.button || "MUA NGAY TẠI";
    const url = promo.url || "https://aiinus.net";
    const comment = promo.commentPrompt || "Bình luận góc nhìn của bạn";
    const logos = Array.isArray(promo.logos) ? promo.logos : ["Claude", "Cursor", "ChatGPT", "Gemini", "Copilot", "Antigravity"];
    const pills = logos.slice(0, 6).map((x) => `<span class="ai-pill" style="font-size:18px; padding:10px 14px;">${escapeHtml(x)}</span>`).join("");
    const hearts = Array.from({ length: 8 }, (_, i) => {
      const x = 5 + (i % 4) * 25;
      const y = 6 + Math.floor(i / 4) * 48;
      return `<div class="heart" id="s${scene.id}-h${i}" style="left:${x}%;top:${y}%;">❤️</div>`;
    }).join("");
    let heroLogo = scene.logoSrc || promo.logoSrc || "assets/logos/logo.png";
    if (heroLogo === "assets/logo.svg") heroLogo = "assets/logos/logo.png";
    return `
    <div class="canvas" style="align-items:center; justify-content:flex-start; padding-top:150px;">
      <div class="cta-hearts" data-layout-allow-overflow>${hearts}</div>
      <div class="ai-title ai-gradient-text" style="font-size:58px; font-weight:900; text-align:center; max-width: 960px;">
        ${escapeHtml(headline)}
      </div>
      <img src="${escapeHtml(heroLogo)}" id="s${scene.id}-emoji" style="width:250px; height:250px; border-radius:999px; object-fit:cover; border:4px solid rgba(255,255,255,0.16); box-shadow: 0 24px 80px rgba(0,0,0,0.35), 0 0 80px rgba(141,211,255,0.22); margin-top:30px;" onerror="this.src='https://ui-avatars.com/api/?name=AI&background=random'" />
      <div class="ai-card ai-card-pop ai-promo" style="margin-top:34px; width: 920px; max-width: 920px;">
        <div class="ai-card-inner" style="padding:34px 34px;">
          <div style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center; margin-bottom:18px;">${pills}</div>
          <div class="ai-gradient-text" style="text-align:center; font-size:44px; font-weight:900; margin-top:14px;">${escapeHtml(badge)}</div>
          <div style="display:flex; justify-content:center; margin-top:18px;">
            <div class="ai-card" style="padding:18px 34px; border-radius:999px; background: rgba(255,140,90,0.92); border-color: rgba(255,255,255,0.18);">
              <div style="font-size:22px; font-weight:900; color:#1a0d0d; letter-spacing:0.12em;">${escapeHtml(button)}</div>
            </div>
          </div>
          <div style="text-align:center; margin-top:18px; font-size:26px; font-weight:900; color: rgba(141,211,255,0.95);">${escapeHtml(url)}</div>
        </div>
      </div>
      <div class="ai-card ai-comment" style="margin-top:34px; padding:14px 22px; border-radius:999px; opacity:0;">
        <div style="font-size:22px; font-weight:900; color: rgba(255,255,255,0.86);">💬 ${escapeHtml(comment)}</div>
      </div>
      <div class="tt-card ai-follow-card" style="position:relative; bottom:auto; left:auto; transform:none; margin-top:22px;">
        <div class="tt-info">
          <div class="tt-name">❤️ Thả tim Video</div>
          <div class="tt-sub">➕ Follow để xem thêm</div>
        </div>
        <div class="tt-btn">
          <span class="tt-btn-text tt-btn-follow">Follow</span>
          <span class="tt-btn-text tt-btn-following">✓ Đã Follow</span>
        </div>
      </div>
    </div>`;
  },

  "hero-title": (scene) => `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div class="bg-grid"></div>
      <div class="glow-orb" id="s${scene.id}-orb" style="width:700px;height:700px;top:-100px;left:-100px;"></div>
      <span class="emoji-deco" id="s${scene.id}-emoji">${scene.emoji || "🎯"}</span>
      <div class="accent-bar" id="s${scene.id}-bar"></div>
      <h1 class="scene-title" id="s${scene.id}-title">${escapeHtml(scene.title)}</h1>
    </div>`,

  "bullet-points": (scene) => {
    const lines = scene.points || splitIntoBullets(scene.voiceText, 3);
    const icons = ["💡", "✅", "🚀", "⚡"];
    const bullets = lines.map((line, i) => `
      <div class="bullet-item" id="s${scene.id}-bullet-${i}">
        <div class="bullet-icon">${icons[i] || "•"}</div>
        <div class="bullet-text">${escapeHtml(line)}</div>
      </div>`).join("");
    return `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <span class="tag-badge" id="s${scene.id}-badge">${escapeHtml(scene.emoji || "")} ${escapeHtml(scene.title)}</span>
      ${bullets}
    </div>`;
  },

  "quote-card": (scene) => `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div class="quote-mark">"</div>
      <p class="quote-text" id="s${scene.id}-quote">${escapeHtml(scene.voiceText.slice(0, 150))}</p>
      <div class="accent-bar" style="margin-top:40px;"></div>
    </div>`,

  "stat-highlight": (scene) => {
    const stat = extractStat(scene.voiceText) || scene.emoji || "1";
    const label = scene.title;
    return `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div class="glow-orb" style="width:900px;height:900px;top:50%;left:50%;transform:translate(-50%,-50%);"></div>
      <div class="stat-number" id="s${scene.id}-stat">${escapeHtml(stat)}</div>
      <div class="stat-label" id="s${scene.id}-label">${escapeHtml(label)}</div>
    </div>`;
  },

  "split-screen": (scene) => {
    const [left, right] = splitInTwo(scene.voiceText);
    return `
    <div class="canvas" style="flex-direction:row;gap:0;padding:0;">
      <div style="width:50%;height:100%;background:${scene.bgColor};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 50px;" id="s${scene.id}-left">
        <div class="bg-gradient"></div>
        <span style="font-size:120px;">${scene.emoji || "🔥"}</span>
        <h2 class="scene-title" style="font-size:56px;">${escapeHtml(scene.title)}</h2>
      </div>
      <div style="width:50%;height:100%;background:${lighten(scene.bgColor)};display:flex;align-items:center;justify-content:center;padding:60px 50px;border-left:2px solid ${scene.accentColor};" id="s${scene.id}-right">
        <p class="scene-subtitle" style="font-size:42px;">${escapeHtml(right || left)}</p>
      </div>
    </div>`;
  },

  "countdown": (scene) => `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div style="position:relative;width:500px;height:500px;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 200 200" width="500" height="500" style="position:absolute;top:0;left:0;">
          <circle cx="100" cy="100" r="90" fill="none" stroke="${hexToRgba(scene.accentColor, 0.2)}" stroke-width="6"/>
          <circle id="s${scene.id}-ring" cx="100" cy="100" r="90" fill="none" stroke="${scene.accentColor}" stroke-width="6" stroke-dasharray="565" stroke-dashoffset="565" stroke-linecap="round" transform="rotate(-90 100 100)"/>
        </svg>
        <div class="stat-number" id="s${scene.id}-num" style="font-size:200px;position:relative;z-index:1;">${scene.emoji || "3"}</div>
      </div>
      <h2 class="scene-title" style="margin-top:40px;" id="s${scene.id}-title">${escapeHtml(scene.title)}</h2>
    </div>`,

  "feng-shui-card": (scene) => {
    const imageSrc = scene.imageSrc || scene.imageUrl || "assets/logos/logo.png";
    const label = scene.label || "PHONG THUY 2026";
    const title = scene.title || "";
    const caption = scene.cardCaption || scene.subtext || "";
    const chips = Array.isArray(scene.chips) ? scene.chips.slice(0, 3) : [];
    const chipHtml = chips.map((chip) => `
      <div class="fs-chip" style="
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:10px 14px;
        border-radius:999px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.12);
        color:rgba(255,255,255,0.82);
        font-size:18px;
        font-weight:800;
        white-space:nowrap;
      ">${escapeHtml(chip)}</div>
    `).join("");

    return `
    <div class="canvas fs-card-scene" style="align-items:flex-start; justify-content:flex-start; padding:122px 70px 90px;">
      <div class="bg-gradient"></div>
      <div class="bg-grid" style="opacity:0.42;"></div>
      <div class="fs-kicker" style="
        position:relative;
        z-index:2;
        font-size:20px;
        font-weight:900;
        letter-spacing:0.18em;
        color:${scene.accentColor};
        text-transform:uppercase;
        margin-bottom:18px;
      ">${escapeHtml(label)}</div>
      <h1 class="fs-title ai-title" id="s${scene.id}-title" style="
        position:relative;
        z-index:2;
        font-size:56px;
        line-height:1.08;
        max-width:940px;
        margin-bottom:28px;
        color:${scene.textColor || "#ffffff"};
      ">${escapeHtml(title)}</h1>
      <div class="fs-image-card ai-card ai-card-pop" id="s${scene.id}-image-card" style="
        position:relative;
        z-index:2;
        width:940px;
        height:840px;
        border-radius:34px;
        padding:16px;
        overflow:hidden;
        background:linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05));
        border:1px solid rgba(255,255,255,0.18);
        box-shadow:0 34px 90px rgba(0,0,0,0.34), 0 0 70px ${hexToRgba(scene.accentColor, 0.16)};
      ">
        <img src="${escapeHtml(imageSrc)}" alt="" style="
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:24px;
          display:block;
        " />
        <div style="
          position:absolute;
          inset:16px;
          border-radius:24px;
          pointer-events:none;
          background:linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.18) 100%);
        "></div>
        <div style="
          position:absolute;
          right:34px;
          top:34px;
          min-width:76px;
          height:76px;
          border-radius:24px;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:0 18px;
          font-size:38px;
          background:rgba(10,12,24,0.70);
          border:1px solid rgba(255,255,255,0.18);
          backdrop-filter:blur(10px);
        ">${escapeHtml(scene.emoji || "✦")}</div>
      </div>
      <div class="fs-content-card ai-card" id="s${scene.id}-content-card" style="
        position:relative;
        z-index:2;
        width:940px;
        margin-top:22px;
        padding:24px 28px;
        border-radius:26px;
        background:rgba(10,12,24,0.70);
        border:1px solid rgba(255,255,255,0.14);
        box-shadow:0 18px 52px rgba(0,0,0,0.24);
      ">
        ${caption ? `<div style="font-size:30px; font-weight:850; line-height:1.26; color:rgba(255,255,255,0.92);">${escapeHtml(caption)}</div>` : ""}
        ${chipHtml ? `<div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:18px;">${chipHtml}</div>` : ""}
      </div>
    </div>`;
  },

  "cta-card": (scene) => {
    const hearts = Array.from({ length: 8 }, (_, i) => {
      const x = 5 + (i % 4) * 25;
      const y = 5 + Math.floor(i / 4) * 50;
      return `<div class="heart" id="s${scene.id}-h${i}" style="left:${x}%;top:${y}%;">❤️</div>`;
    }).join("");
    const isOutro = scene.type === "outro";
    let profileImg = scene.imageSrc || scene.profileImage || "assets/logos/logo.png";
    if (profileImg === "assets/logo.svg") profileImg = "assets/logos/logo.png";
    let heroLogo = scene.logoSrc || "assets/logos/logo.png";
    if (heroLogo === "assets/logo.svg") heroLogo = "assets/logos/logo.png";
    const heroMark = isOutro
      ? `<img src="${heroLogo}" class="emoji-deco" id="s${scene.id}-emoji" style="width:540px; height:540px; border-radius:999px; object-fit:cover; border:4px solid rgba(255,255,255,0.16); box-shadow: 0 24px 80px rgba(0,0,0,0.35); margin-bottom: 30px;" />`
      : `<span class="emoji-deco" id="s${scene.id}-emoji" style="font-size:200px; margin-bottom: 30px;">${scene.emoji || "❤️"}</span>`;
    return `
    <div class="canvas" style="background:linear-gradient(160deg,${scene.bgColor},${lighten(scene.bgColor)}); padding-top:220px;">
      <div class="bg-gradient"></div>
      <div class="cta-hearts" data-layout-allow-overflow>${hearts}</div>
      <div class="hero-wrap" style="text-align:center; display:flex; flex-direction:column; align-items:center; transform: translateY(-40px);">
        ${heroMark}
        <h1 class="cta-title ai-gradient-text" id="s${scene.id}-title" style="margin-bottom:20px;">${escapeHtml(scene.title)}</h1>
      </div>
      
      <div class="tt-card">
        <img src="${profileImg}" class="tt-logo" onerror="this.src='https://ui-avatars.com/api/?name=AI&background=random'" />
        <div class="tt-info">
          <div class="tt-name">❤️ Thả tim Video</div>
          <div class="tt-sub">➕ Follow để xem thêm</div>
        </div>
        <div class="tt-btn">
          <span class="tt-btn-text tt-btn-follow">Follow</span>
          <span class="tt-btn-text tt-btn-following">✓ Đã Follow</span>
        </div>
      </div>
    </div>`;
  },

  "infographic-chart": (scene) => {
    const items = scene.data || [];
    const chartTitle = scene.chartTitle || scene.title || "";
    if (scene.chartType === "donut") {
      const val = items[0]?.value || 75;
      return `
      <div class="canvas">
        <div class="bg-gradient"></div>
        <div class="chart-container">
          <div class="chart-title">${escapeHtml(chartTitle)}</div>
          <div class="donut-wrap">
            <svg class="donut-svg" viewBox="0 0 42 42">
              <circle class="donut-bg" cx="21" cy="21" r="15.915"></circle>
              <circle class="donut-fill" id="s${scene.id}-donut" cx="21" cy="21" r="15.915" data-value="${val}"></circle>
            </svg>
            <div class="stat-number" style="font-size:120px;">${val}%</div>
          </div>
        </div>
      </div>`;
    } else {
      return `
      <div class="canvas">
        <div class="bg-gradient"></div>
        <div class="chart-container">
          <div class="chart-title">${escapeHtml(chartTitle)}</div>
          ${items.map((item, i) => `
            <div class="bar-row">
              <div class="bar-info"><span>${escapeHtml(item.label)}</span><span>${item.value}${item.unit || ""}</span></div>
              <div class="bar-track"><div class="bar-fill" id="s${scene.id}-bar-${i}" data-percent="${item.percent || 100}"></div></div>
            </div>`).join("")}
        </div>
      </div>`;
    }
  },

  "stats-grid": (scene) => {
    const stats = scene.stats || [];
    return `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div class="stats-grid-wrap">
        ${stats.map((s, i) => `
          <div class="stat-grid-card" id="s${scene.id}-statcard-${i}">
            <div class="stat-number" style="font-size:100px; margin-bottom:10px;">${escapeHtml(s.big)}</div>
            <div class="stat-label" style="font-size:32px;">${escapeHtml(s.label)}</div>
          </div>`).join("")}
      </div>
    </div>`;
  },

  "terminal": (scene) => {
    const lines = scene.terminalLines || [];
    return `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div class="terminal-wrap" id="s${scene.id}-terminal">
        <div class="terminal-header">
          <div class="terminal-dot dot-red"></div>
          <div class="terminal-dot dot-yellow"></div>
          <div class="terminal-dot dot-green"></div>
          <div class="terminal-title">${escapeHtml(scene.terminalTitle || "bash")}</div>
        </div>
        <div class="terminal-body">
          ${lines.map((line, i) => `
            <div style="margin-bottom:15px;" class="line-${line.type || "output"}" id="s${scene.id}-line-${i}">
              ${line.type === "prompt" ? "$ " : ""}${escapeHtml(line.text)}
            </div>`).join("")}
        </div>
      </div>
    </div>`;
  },

  "callout": (scene) => `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div class="callout-wrap">
        <div class="callout-card" id="s${scene.id}-callout">
          ${scene.calloutTag ? `<div class="callout-tag">${escapeHtml(scene.calloutTag)}</div>` : ""}
          <div class="callout-statement">${escapeHtml(scene.calloutStatement || scene.voiceText)}</div>
        </div>
      </div>
    </div>`,

  "callout": (scene) => `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div class="callout-wrap">
        <div class="callout-card" id="s${scene.id}-callout">
          ${scene.calloutTag ? `<div class="callout-tag">${escapeHtml(scene.calloutTag)}</div>` : ""}
          <div class="callout-statement">${escapeHtml(scene.calloutStatement || scene.voiceText)}</div>
        </div>
      </div>
    </div>`,

  "comparison": (scene) => {
    const L = scene.left || {};
    const R = scene.right || {};
    const lColor = L.color === "purple" ? "cmp-purple" : "cmp-cyan";
    const rColor = R.color === "purple" ? "cmp-purple" : "cmp-cyan";
    return `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div class="cmp-wrap">
        <div class="cmp-card ${lColor}">
          <div class="cmp-label">${escapeHtml(L.label || "")}</div>
          <div class="cmp-value">${escapeHtml(L.value || "")}</div>
        </div>
        <div class="cmp-vs">VS</div>
        <div class="cmp-card ${rColor} ${R.winner ? "cmp-winner" : ""}">
          <div class="cmp-label">${escapeHtml(R.label || "")}</div>
          <div class="cmp-value">${escapeHtml(R.value || "")}</div>
          ${R.winner ? '<div class="cmp-winner-badge">✓ THẮNG</div>' : ""}
        </div>
      </div>
    </div>`;
  },

  "code-diff": (scene) => `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div class="code-diff-wrap">
        <div class="diff-pane bad">
          <div class="diff-label">${escapeHtml(scene.badLabel || "Cũ")}</div>
          <div class="diff-code">${escapeHtml(scene.bad || "")}</div>
        </div>
        <div class="diff-pane good">
          <div class="diff-label">${escapeHtml(scene.goodLabel || "Mới")}</div>
          <div class="diff-code">${escapeHtml(scene.good || "")}</div>
        </div>
      </div>
    </div>`,
};

// ── Animation Script Generator ────────────────────────────────────────────────

function buildAnimationScript(scene) {
  const cid = `scene-${scene.id}`;
  const s = `s${scene.id}`;
  const dur = scene.duration;

  const animFns = {
    "zoom-in": () => `
      const tl = gsap.timeline({ paused: true });
      const canvas = document.querySelector('[data-composition-id="${cid}"] .canvas');
      if (canvas) tl.fromTo(canvas, { scale: 1.15, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: "power3.out" });
      const emoji = document.querySelector('[data-composition-id="${cid}"] .emoji-deco');
      if (emoji) tl.from(emoji, { scale: 0, rotation: -20, duration: 0.6, ease: "back.out(2)" }, 0.3);
      const title = document.querySelector('[data-composition-id="${cid}"] #${s}-title');
      if (title) tl.from(title, { y: 40, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.5);
      const bar = document.querySelector('[data-composition-id="${cid}"] .accent-bar');
      if (bar) tl.from(bar, { scaleX: 0, duration: 0.5, ease: "power3.out", transformOrigin: "left" }, 0.4);`,

    "slide-up": () => `
      const tl = gsap.timeline({ paused: true });
      const badge = document.querySelector('[data-composition-id="${cid}"] .tag-badge');
      if (badge) tl.from(badge, { y: -40, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, 0);
      const bullets = document.querySelectorAll('[data-composition-id="${cid}"] .bullet-item');
      bullets.forEach((b, i) => {
        tl.to(b, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0.3 + i * 0.25);
      });`,

    "fade-cascade": () => `
      const tl = gsap.timeline({ paused: true });
      const els = document.querySelectorAll('[data-composition-id="${cid}"] h1, [data-composition-id="${cid}"] h2, [data-composition-id="${cid}"] p, [data-composition-id="${cid}"] .accent-bar, [data-composition-id="${cid}"] .tag-badge');
      els.forEach((el, i) => {
        tl.fromTo(el, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, i * 0.18);
      });
      const qm = document.querySelector('[data-composition-id="${cid}"] .quote-mark');
      if (qm) tl.from(qm, { scale: 0.5, opacity: 0, duration: 0.7, ease: "back.out(1.5)" }, 0);`,

    "bounce-in": () => `
      const tl = gsap.timeline({ paused: true });
      const stat = document.querySelector('[data-composition-id="${cid}"] .stat-number');
      if (stat) tl.from(stat, { scale: 0, opacity: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" }, 0);
      const label = document.querySelector('[data-composition-id="${cid}"] .stat-label');
      if (label) tl.from(label, { y: 40, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.5);
      const orb = document.querySelector('[data-composition-id="${cid}"] .glow-orb');
      if (orb) tl.from(orb, { scale: 0, opacity: 0, duration: 1, ease: "power2.out" }, 0);`,

    "typewriter": () => `
      const tl = gsap.timeline({ paused: true });
      const left = document.querySelector('[data-composition-id="${cid}"] #${s}-left');
      if (left) tl.from(left, { x: -${width / 2}, opacity: 0, duration: 0.7, ease: "power3.out" }, 0);
      const right = document.querySelector('[data-composition-id="${cid}"] #${s}-right');
      if (right) tl.from(right, { x: ${width / 2}, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.2);
      const title = document.querySelector('[data-composition-id="${cid}"] #${s}-title');
      if (title) tl.from(title, { opacity: 0, y: 20, duration: 0.5 }, 0.5);`,

    "particle-burst": () => `
      const tl = gsap.timeline({ paused: true });
      const emo = document.querySelector('[data-composition-id="${cid}"] #${s}-emoji');
      if (emo) tl.from(emo, { scale: 0, rotation: -30, duration: 0.8, ease: "elastic.out(1, 0.4)" }, 0);
      const title = document.querySelector('[data-composition-id="${cid}"] #${s}-title');
      if (title) tl.from(title, { y: 50, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.4);
      const hearts = document.querySelectorAll('[data-composition-id="${cid}"] .heart');
      hearts.forEach((h, i) => {
        const delay = 0.6 + i * 0.12;
        tl.to(h, { opacity: 1, y: -80, duration: 0.6, ease: "power2.out" }, delay);
        tl.to(h, { opacity: 0, y: -160, duration: 0.8, ease: "power2.in" }, delay + 0.6);
      });
      const ttCard = document.querySelector('[data-composition-id="${cid}"] .tt-card');
      if (ttCard) {
        const ttBtn = ttCard.querySelector('.tt-btn');
        const follow = ttCard.querySelector('.tt-btn-follow');
        const following = ttCard.querySelector('.tt-btn-following');
        const ttBase = 1.2;
        tl.fromTo(ttCard, { y: 300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, ttBase);
        if (ttBtn) {
          tl.to(ttBtn, { scale: 0.9, duration: 0.15 }, ttBase + 1.0);
          tl.to(ttBtn, { scale: 1, backgroundColor: "#2f2f2f", duration: 0.4, ease: "elastic.out(1, 0.4)" }, ttBase + 1.15);
        }
        if (follow) tl.to(follow, { opacity: 0, duration: 0.1 }, ttBase + 1.15);
        if (following) tl.to(following, { opacity: 1, duration: 0.1 }, ttBase + 1.2);
        tl.to(ttCard, { scale: 1.05, duration: ${Math.max(0.5, dur - 3)}, ease: "power1.inOut" }, ttBase + 1.5);
      }
      const promoCard = document.querySelector('[data-composition-id="${cid}"] .ai-promo');
      if (promoCard) {
        tl.fromTo(promoCard, { y: 70, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.72, ease: "power3.out" }, 0.95);
      }
      const comment = document.querySelector('[data-composition-id="${cid}"] .ai-comment');
      if (comment) {
        tl.fromTo(comment, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.48, ease: "power2.out" }, 1.55);
      }`,

    "pulse-glow": () => `
      const tl = gsap.timeline({ paused: true });
      const canvas = document.querySelector('[data-composition-id="${cid}"] .canvas');
      if (canvas) tl.from(canvas, { opacity: 0, duration: 0.5 }, 0);
      const ring = document.querySelector('[data-composition-id="${cid}"] #${s}-ring');
      if (ring) tl.from(ring, { strokeDashoffset: 565, duration: ${Math.min(dur - 1, 3)}, ease: "power2.inOut" }, 0.3);
      const num = document.querySelector('[data-composition-id="${cid}"] #${s}-num');
      if (num) tl.from(num, { scale: 0, opacity: 0, duration: 0.6, ease: "back.out(2)" }, 0.2);
      const title = document.querySelector('[data-composition-id="${cid}"] #${s}-title');
      if (title) tl.from(title, { y: 40, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.7);
      const statNum = document.querySelector('[data-composition-id="${cid}"] #${s}-stat');
      if (statNum) tl.from(statNum, { scale: 0, opacity: 0, duration: 0.6, ease: "back.out(2)" }, 0.2);
      const statLabel = document.querySelector('[data-composition-id="${cid}"] #${s}-label');
      if (statLabel) tl.from(statLabel, { y: 40, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.7);`,

    "image-card-rise": () => `
      const tl = gsap.timeline({ paused: true });
      const kicker = document.querySelector('[data-composition-id="${cid}"] .fs-kicker');
      const title = document.querySelector('[data-composition-id="${cid}"] #${s}-title');
      const imageCard = document.querySelector('[data-composition-id="${cid}"] #${s}-image-card');
      const contentCard = document.querySelector('[data-composition-id="${cid}"] #${s}-content-card');
      const chips = document.querySelectorAll('[data-composition-id="${cid}"] .fs-chip');
      if (kicker) tl.fromTo(kicker, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.46, ease: "power2.out" }, 0.08);
      if (title) tl.fromTo(title, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.62, ease: "power3.out" }, 0.18);
      if (imageCard) tl.fromTo(imageCard, { y: 62, scale: 0.965, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.78, ease: "power3.out" }, 0.42);
      if (contentCard) tl.fromTo(contentCard, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.56, ease: "power2.out" }, 0.86);
      if (chips.length) tl.fromTo(chips, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.34, stagger: 0.08, ease: "power2.out" }, 1.08);`,

    "infographic-chart": () => `
      const tl = gsap.timeline({ paused: true });
      const container = document.querySelector('[data-composition-id="${cid}"] .chart-container');
      if (container) tl.from(container, { y: 60, opacity: 0, duration: 0.8, ease: "power3.out" });
      const fills = document.querySelectorAll('[data-composition-id="${cid}"] .bar-fill');
      fills.forEach((f, i) => {
        tl.to(f, { width: f.dataset.percent + "%", duration: 1.2, ease: "power3.out" }, 0.5 + i * 0.15);
      });
      const donut = document.querySelector('[data-composition-id="${cid}"] .donut-fill');
      if (donut) tl.to(donut, { strokeDasharray: donut.dataset.value + " 100", duration: 1.8, ease: "power4.out" }, 0.5);`,

    "stats-grid": () => `
      const tl = gsap.timeline({ paused: true });
      const cards = document.querySelectorAll('[data-composition-id="${cid}"] .stat-grid-card');
      tl.from(cards, { scale: 0.8, opacity: 0, y: 50, stagger: 0.15, duration: 1, ease: "elastic.out(1, 0.75)" });`,

    "terminal": () => `
      const tl = gsap.timeline({ paused: true });
      const term = document.querySelector('[data-composition-id="${cid}"] .terminal-wrap');
      if (term) tl.from(term, { y: 40, opacity: 0, duration: 0.8, ease: "power3.out" });
      const lines = document.querySelectorAll('[data-composition-id="${cid}"] .terminal-body > div');
      lines.forEach((line, i) => {
        tl.from(line, { opacity: 0, x: -20, duration: 0.4 }, 0.6 + i * 0.2);
      });`,

    "callout": () => `
      const tl = gsap.timeline({ paused: true });
      const card = document.querySelector('[data-composition-id="${cid}"] .callout-card');
      if (card) tl.to(card, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.5)" }, 0.2);`,

    "comparison": () => `
      const tl = gsap.timeline({ paused: true });
      const cards = document.querySelectorAll('[data-composition-id="${cid}"] .cmp-card');
      const vs = document.querySelector('[data-composition-id="${cid}"] .cmp-vs');
      if (cards[0]) tl.fromTo(cards[0], { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.2);
      if (vs) tl.fromTo(vs, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4 }, 0.5);
      if (cards[1]) tl.fromTo(cards[1], { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.7);`,

    "code-diff": () => `
      const tl = gsap.timeline({ paused: true });
      const bad = document.querySelector('[data-composition-id="${cid}"] .diff-pane.bad');
      const good = document.querySelector('[data-composition-id="${cid}"] .diff-pane.good');
      if (bad) tl.fromTo(bad, { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, 0.2);
      if (good) tl.fromTo(good, { x: 60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, 0.5);`,

    "football-broadcast": () => `
      const tl = gsap.timeline({ paused: true });
      const pitch = document.querySelector('[data-composition-id="${cid}"] .football-pitch-bg');
      if (pitch) tl.fromTo(pitch, { scale: 1.18, opacity: 0.18 }, { scale: 1.08, opacity: 0.58, duration: 1.1, ease: "power2.out" }, 0);
      const kicker = document.querySelector('[data-composition-id="${cid}"] .football-kicker');
      if (kicker) tl.fromTo(kicker, { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, ease: "power2.out" }, 0.12);
      const title = document.querySelector('[data-composition-id="${cid}"] #${s}-title');
      if (title) tl.fromTo(title, { y: 42, opacity: 0, filter: "blur(8px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.72, ease: "power3.out" }, 0.24);
      const matchup = document.querySelector('[data-composition-id="${cid}"] #${s}-matchup');
      if (matchup) tl.fromTo(matchup, { y: 54, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.76, ease: "power3.out" }, 0.55);
      const lower = document.querySelector('[data-composition-id="${cid}"] #${s}-lower');
      if (lower) tl.fromTo(lower, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.48, ease: "power2.out" }, 0.95);
      const scoreShell = document.querySelector('[data-composition-id="${cid}"] #${s}-score-shell');
      if (scoreShell) tl.fromTo(scoreShell, { y: 58, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.78, ease: "power3.out" }, 0.35);
      const scoreNums = document.querySelectorAll('[data-composition-id="${cid}"] .football-score-num');
      if (scoreNums.length) tl.fromTo(scoreNums, { y: -24, opacity: 0, rotateX: -80 }, { y: 0, opacity: 1, rotateX: 0, duration: 0.58, stagger: 0.12, ease: "back.out(1.6)" }, 0.86);
      const player = document.querySelector('[data-composition-id="${cid}"] #${s}-player');
      if (player) tl.fromTo(player, { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: "power3.out" }, 0.32);
      const statCards = document.querySelectorAll('[data-composition-id="${cid}"] .football-stat-card');
      if (statCards.length) tl.fromTo(statCards, { y: 40, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.56, stagger: 0.12, ease: "power3.out" }, 0.78);
      const bracket = document.querySelector('[data-composition-id="${cid}"] #${s}-bracket');
      if (bracket) tl.fromTo(bracket, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.58, ease: "power3.out" }, 0.44);
      const bracketPaths = document.querySelectorAll('[data-composition-id="${cid}"] .football-bracket-path');
      bracketPaths.forEach((path, i) => {
        const len = path.getTotalLength ? path.getTotalLength() : 900;
        tl.set(path, { strokeDasharray: len, strokeDashoffset: len }, 0.48);
        tl.to(path, { strokeDashoffset: 0, duration: 1.0, ease: "power2.out" }, 0.58 + i * 0.10);
      });
      const bracketNodes = document.querySelectorAll('[data-composition-id="${cid}"] .football-bracket-node');
      if (bracketNodes.length) tl.fromTo(bracketNodes, { scale: 0.82, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, stagger: 0.14, ease: "back.out(1.5)" }, 0.84);
      const events = document.querySelectorAll('[data-composition-id="${cid}"] .football-event');
      if (events.length) tl.fromTo(events, { x: -54, opacity: 0 }, { x: 0, opacity: 1, duration: 0.52, stagger: 0.16, ease: "power3.out" }, 0.56);`,

    "football-lineup": () => `
      const tl = gsap.timeline({ paused: true });
      const pitch = document.querySelector('[data-composition-id="${cid}"] .football-pitch-bg');
      if (pitch) tl.fromTo(pitch, { scale: 1.18, opacity: 0.16 }, { scale: 1.08, opacity: 0.58, duration: 1.0, ease: "power2.out" }, 0);
      const topbar = document.querySelector('[data-composition-id="${cid}"] .football-lineup-topbar');
      if (topbar) tl.fromTo(topbar, { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" }, 0.10);
      const title = document.querySelector('[data-composition-id="${cid}"] #${s}-title');
      if (title) tl.fromTo(title, { y: 34, opacity: 0, filter: "blur(8px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.70, ease: "power3.out" }, 0.22);
      const teamHome = document.querySelector('[data-composition-id="${cid}"] #${s}-team-home');
      if (teamHome) tl.fromTo(teamHome, { y: 22, opacity: 0, filter: "blur(10px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.55, ease: "power3.out" }, 0.34);
      const pitchShell = document.querySelector('[data-composition-id="${cid}"] #${s}-lineup-pitch');
      if (pitchShell) tl.fromTo(pitchShell, { y: 42, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.70, ease: "power3.out" }, 0.40);
      const players = document.querySelectorAll('[data-composition-id="${cid}"] .football-lineup-player');
      if (players.length) tl.fromTo(players, { y: 18, scale: 0.80, opacity: 0, filter: \"blur(10px)\" }, { y: 0, scale: 1, opacity: 1, filter: \"blur(0px)\", duration: 0.52, stagger: 0.06, ease: \"back.out(1.7)\" }, 0.74);
      const teamAway = document.querySelector('[data-composition-id="${cid}"] #${s}-team-away');
      if (teamAway) tl.fromTo(teamAway, { y: 22, opacity: 0, filter: \"blur(10px)\" }, { y: 0, opacity: 1, filter: \"blur(0px)\", duration: 0.55, ease: \"power3.out\" }, 1.22);`,

    // ── AI-news animations ───────────────────────────────────────────────────
    "reveal-stagger": () => `
      const tl = gsap.timeline({ paused: true });
      const items = document.querySelectorAll('[data-composition-id="${cid}"] .ai-step, [data-composition-id="${cid}"] .ai-row-card, [data-composition-id="${cid}"] .ai-stat-card');
      if (items.length) {
        tl.set(items, { opacity: 0, y: 26 }, 0);
        tl.to(items, { opacity: 1, y: 0, duration: 0.92, stagger: 0.38, ease: "power3.out" }, 0.30);

        // Count-up numbers (e.g. 1k+ -> 175k+) inside stats cards
        tl.add(() => {
          const els = document.querySelectorAll('[data-composition-id="${cid}"] .ai-countup');
          const parseCompact = (raw) => {
            const s = String(raw || "").trim().replace(/,/g, "");
            const m = s.match(/^(\\d+(?:\\.\\d+)?)(\\s*[kKmMbB])?(\\+)?$/);
            if (!m) return null;
            const num = Number(m[1]);
            if (!Number.isFinite(num)) return null;
            const unit = (m[2] || "").trim().toLowerCase();
            const plus = Boolean(m[3]);
            const mult = unit === "k" ? 1e3 : unit === "m" ? 1e6 : unit === "b" ? 1e9 : 1;
            return { target: Math.round(num * mult), unit, plus, mult };
          };
          const formatCompact = (value, unit, plus) => {
            const p = plus ? "+" : "";
            if (unit === "k") return String(Math.max(0, Math.round(value / 1e3))) + "k" + p;
            if (unit === "m") return String(Math.max(0, Math.round(value / 1e6))) + "m" + p;
            if (unit === "b") return String(Math.max(0, Math.round(value / 1e9))) + "b" + p;
            return String(Math.max(0, Math.round(value))) + p;
          };

          els.forEach((el) => {
            const finalRaw = el.getAttribute("data-final") || el.textContent || "";
            const parsed = parseCompact(finalRaw);
            if (!parsed) return;

            const start = parsed.unit ? parsed.mult : 1;
            const end = Math.max(start, parsed.target);
            el.textContent = formatCompact(start, parsed.unit, parsed.plus);

            gsap.fromTo(
              { v: start },
              { v: end },
              {
                duration: 1.35,
                ease: "power2.out",
                onUpdate() {
                  const v = this.targets()[0].v;
                  el.textContent = formatCompact(v, parsed.unit, parsed.plus);
                },
              }
            );
          });
        }, 0.55);
      }`,

    "card-slide-in-right": () => `
      const tl = gsap.timeline({ paused: true });
      const cards = document.querySelectorAll('[data-composition-id="${cid}"] .ai-card');
      if (cards[0]) tl.fromTo(cards[0], { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.80, ease: "power3.out" }, 0.15);
      if (cards[1]) tl.fromTo(cards[1], { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.75, ease: "power3.out" }, 0.80);
      if (cards[2]) tl.fromTo(cards[2], { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.75, ease: "power3.out" }, 1.05);`,

    "quote-fade": () => `
      const tl = gsap.timeline({ paused: true });
      const els = document.querySelectorAll('[data-composition-id="${cid}"] .ai-title, [data-composition-id="${cid}"] .ai-label, [data-composition-id="${cid}"] .ai-muted, [data-composition-id="${cid}"] .quote-text, [data-composition-id="${cid}"] .ai-comment');
      tl.fromTo(els, { opacity: 0, filter: "blur(10px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.95, stagger: 0.16, ease: "power2.out" }, 0.10);`,

    "kinetic-slam": () => `
      const tl = gsap.timeline({ paused: true });
      const faint = document.querySelector('[data-composition-id="${cid}"] .ai-kinetic-faint');
      const main = document.querySelector('[data-composition-id="${cid}"] .ai-kinetic-main');
      if (faint) tl.fromTo(faint, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: "power3.out" }, 0.10);
      if (main) tl.fromTo(main, { y: 110, scale: 0.95, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.90, ease: "power3.out" }, 0.35);`,
  };

  const animKey = scene.animation || "fade-cascade";

  const forceAnimMap = {
    "infographic-chart": "infographic-chart",
    "stats-grid": "stats-grid",
    "terminal": "terminal",
    "callout": "callout",
    "comparison": "comparison",
    "code-diff": "code-diff",
    "countdown": "pulse-glow",
    "feng-shui-card": "image-card-rise",
    "cta-card": "particle-burst",
    "football-match-card": "football-broadcast",
    "football-scoreboard": "football-broadcast",
    "football-player-stat": "football-broadcast",
    "football-odds-h2h": "football-broadcast",
    "football-lineup": "football-lineup",
    "football-bracket-flow": "football-broadcast",
    "football-timeline": "football-broadcast",
    "football-upcoming-schedule": "football-broadcast",
    "football-standings-table": "football-broadcast",

    // AI-news compositions
    "hook-question": "quote-fade",
    "ui-cards": "card-slide-in-right",
    "process-steps": "reveal-stagger",
    "quote-attrib": "quote-fade",
    "stats-cards-grid": "reveal-stagger",
    "kinetic-title": "kinetic-slam",
    "context-bars": "reveal-stagger",
    "promo-card": "particle-burst"
  };

  const forcedAnim = forceAnimMap[scene.composition];
  const finalAnim = scene.animation ? scene.animation : (forcedAnim || animKey);
  const animBody = (animFns[finalAnim] || animFns[animKey] || animFns["fade-cascade"])();

  return `
    ${animBody}
    tl.to({}, { duration: 0 }, ${dur});
    window.__timelines = window.__timelines || {};
    window.__timelines["${cid}"] = tl;
  `;
}

// ── Global Karaoke Subtitle Initialization ───────────────────────────────────
// Phần này sẽ được nhúng vào mỗi scene

function initKaraokeSubtitle(sceneId, duration, voiceText) {
  if (!voiceText || voiceText.trim() === '') return;

  const container = document.getElementById(`karaoke-subtitle-${sceneId}`);
  if (!container) return;

  const words = voiceText.trim().split(/\s+/);
  const durationPerWord = duration / words.length;

  // Tạo HTML cho từng từ
  container.innerHTML = words.map((word, idx) =>
    `<span class="karaoke-word" data-index="${idx}">${escapeHtmlForKaraoke(word)}</span>`
  ).join(' ');

  const wordSpans = container.querySelectorAll('.karaoke-word');
  let currentIndex = 0;

  const interval = setInterval(() => {
    if (currentIndex < wordSpans.length) {
      // Remove active class from all
      wordSpans.forEach(w => w.classList.remove('active'));
      // Add active class to current word
      wordSpans[currentIndex].classList.add('active');
      currentIndex++;
    } else {
      clearInterval(interval);
      // Highlight all words at the end
      wordSpans.forEach(w => w.classList.add('active'));
    }
  }, durationPerWord * 1000);
}

function escapeHtmlForKaraoke(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Note: The initKaraokeSubtitle function needs to be available globally
// It will be added to the script section of each scene

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeFootballTeams(scene) {
  const raw = Array.isArray(scene.teams) && scene.teams.length >= 2
    ? scene.teams
    : [
        { name: scene.homeTeam || "Home XI", code: scene.homeCode || "HOME", form: ["W", "D", "W"] },
        { name: scene.awayTeam || "Away XI", code: scene.awayCode || "AWAY", form: ["W", "L", "W"] },
      ];

  return raw.slice(0, 2).map((team, i) => {
    if (typeof team === "string") {
      return {
        name: team,
        code: team.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || (i === 0 ? "HOME" : "AWAY"),
        form: i === 0 ? ["W", "D", "W"] : ["W", "L", "W"],
      };
    }

    const name = team?.name || team?.title || (i === 0 ? "Home XI" : "Away XI");
    const badge = normalizeFootballTeamBadge(team, scene);
    return {
      name,
      code: team?.code || name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || (i === 0 ? "HOME" : "AWAY"),
      form: Array.isArray(team?.form) ? team.form.slice(0, 5) : (i === 0 ? ["W", "D", "W"] : ["W", "L", "W"]),
      ...badge,
    };
  });
}

function normalizeFootballOddsTable(scene, teams) {
  const raw = scene.oddsTable || scene.odds || scene.market || scene.keo || null;
  const defaultHeaders = ["Đội bóng", "Tỷ số", "1x2", "HDP", "Tài xỉu", "HT HDP"];

  const coerceRow = (row) => {
    if (!row || typeof row !== "object") return null;
    const teamName = row.teamName || row.name || row.label || row.team || "";
    const scoreText = row.scoreText ?? row.score ?? "";
    const minute = row.minute ?? row.time ?? "";
    const x12 = row.x12 || row["1x2"] || row.oneXtwo || row.one_x_two || null;
    const hdp = row.hdp || row.handicap || null;
    const ou = row.ou || row.overUnder || row.taiXiu || null;
    const htHdp = row.htHdp || row.ht_handicap || row.halfTimeHandicap || null;
    return { teamName, scoreText, minute, x12, hdp, ou, htHdp, ...row };
  };

  if (raw && typeof raw === "object") {
    const headers = Array.isArray(raw.headers) ? raw.headers : (Array.isArray(raw.header) ? raw.header : defaultHeaders);
    const rowsRaw = Array.isArray(raw.rows) ? raw.rows : (Array.isArray(raw.items) ? raw.items : null);
    if (rowsRaw && rowsRaw.length) {
      const rows = rowsRaw.map(coerceRow).filter(Boolean);
      if (rows.length) return { headers, rows };
    }
  }

  // Fallback: build a minimal table from common odds shapes.
  const oneXtwo = raw?.oneXtwo || raw?.x12 || raw?.["1x2"] || scene.oneXtwo || scene.x12 || null;
  const handicap = raw?.handicap || raw?.hdp || scene.hdp || null;
  const overUnder = raw?.overUnder || raw?.ou || raw?.taiXiu || scene.ou || scene.taiXiu || null;
  const htHandicap = raw?.htHandicap || raw?.htHdp || scene.htHdp || null;

  const safeNum = (v, fallback) => (v === 0 || v) ? String(v) : fallback;
  const rows = [
    {
      teamName: teams?.[0]?.name || "Đội 1",
      scoreText: safeNum(scene?.score?.[0], safeNum(scene?.homeScore, "")),
      minute: scene?.minute || "",
      x12: oneXtwo ? { main: safeNum(oneXtwo.home, safeNum(oneXtwo.a, "")), tone: "red" } : { main: "", sub: "" },
      hdp: handicap ? { main: safeNum(handicap.line || handicap.k, handicap.main || ""), sub: safeNum(handicap.home || handicap.a, handicap.sub || ""), tone: "red" } : { main: "", sub: "" },
      ou: overUnder ? { main: safeNum(overUnder.line || overUnder.k, overUnder.main || ""), sub: safeNum(overUnder.over || overUnder.o, overUnder.sub || ""), tone: "orange" } : { main: "", sub: "" },
      htHdp: htHandicap ? { main: safeNum(htHandicap.line || htHandicap.k, htHandicap.main || ""), sub: safeNum(htHandicap.home || htHandicap.a, htHandicap.sub || ""), tone: "blue" } : { main: "", sub: "" },
    },
    {
      teamName: teams?.[1]?.name || "Đội 2",
      scoreText: safeNum(scene?.score?.[1], safeNum(scene?.awayScore, "")),
      minute: "",
      x12: oneXtwo ? { main: safeNum(oneXtwo.away, safeNum(oneXtwo.b, "")), sub: safeNum(oneXtwo.draw, safeNum(oneXtwo.x, "")), tone: "red" } : { main: "", sub: "" },
      hdp: handicap ? { main: "", sub: safeNum(handicap.away || handicap.b, ""), tone: "" } : { main: "", sub: "" },
      ou: overUnder ? { main: "", sub: safeNum(overUnder.under || overUnder.u, ""), tone: "" } : { main: "", sub: "" },
      htHdp: htHandicap ? { main: "", sub: safeNum(htHandicap.away || htHandicap.b, ""), tone: "" } : { main: "", sub: "" },
    },
    {
      teamName: "Hòa",
      scoreText: "",
      minute: "",
      x12: oneXtwo ? { main: safeNum(oneXtwo.draw, safeNum(oneXtwo.x, "")), tone: "red" } : { main: "", sub: "" },
      hdp: { main: "", sub: "" },
      ou: { main: "", sub: "" },
      htHdp: { main: "", sub: "" },
    },
  ];

  return { headers: defaultHeaders, rows };
}

function normalizeFootballH2HMatches(scene, teams) {
  const raw =
    scene.h2hMatches
    || scene.h2h
    || scene.headToHead
    || scene.h2hHistory
    || scene.matches
    || null;

  const list = Array.isArray(raw) ? raw : (raw && typeof raw === "object" && Array.isArray(raw.items) ? raw.items : []);
  const toMatch = (m) => {
    if (!m || typeof m !== "object") return null;
    if (typeof m === "string") return { score: m };
    const home = m.home || m.teamA || m.left || m.homeTeam || "";
    const away = m.away || m.teamB || m.right || m.awayTeam || "";
    const homeScore = Number.isFinite(Number(m.homeScore)) ? Number(m.homeScore) : (Number.isFinite(Number(m.a)) ? Number(m.a) : undefined);
    const awayScore = Number.isFinite(Number(m.awayScore)) ? Number(m.awayScore) : (Number.isFinite(Number(m.b)) ? Number(m.b) : undefined);
    const score = m.score || (Number.isFinite(homeScore) && Number.isFinite(awayScore) ? `${homeScore}-${awayScore}` : "");
    return {
      date: m.date || m.kickoff || m.time || m.day || "",
      competition: m.competition || m.league || m.tournament || m.comp || "",
      home,
      away,
      homeScore,
      awayScore,
      score,
      note: m.note || m.stage || m.round || "",
    };
  };

  const normalized = list.map(toMatch).filter(Boolean);
  if (normalized.length) return normalized.slice(0, 3);

  const t0 = teams?.[0]?.name || "Đội 1";
  const t1 = teams?.[1]?.name || "Đội 2";
  return [
    { date: "Gần đây", competition: "Friendly", home: t0, away: t1, score: "1-1" },
    { date: "Trước đó", competition: "League", home: t1, away: t0, score: "2-0" },
    { date: "Trước nữa", competition: "Cup", home: t0, away: t1, score: "0-1" },
  ];
}

function normalizeFootballLineups(scene, teams) {
  const defaultPlayers = (teamName, seed) =>
    Array.from({ length: 11 }).map((_, i) => ({
      number: i === 0 ? 1 : i + seed,
      name: `Player ${i + 1}`,
      role: i === 0 ? "GK" : undefined,
      team: teamName,
    }));

  const raw = scene.lineups || scene.lineup || scene.squads || scene.teamsLineup || null;

  const coerceSide = (value, fallbackTeam, seed) => {
    if (!value) {
      return {
        formation: fallbackTeam?.formation || fallbackTeam?.scheme || fallbackTeam?.form || "4-3-3",
        players: defaultPlayers(fallbackTeam?.name || "", seed),
      };
    }

    const formation = value.formation || value.form || value.scheme || fallbackTeam?.formation || "4-3-3";
    const playersRaw =
      value.players ||
      value.xi ||
      value.starting ||
      value.startingXI ||
      value.starting11 ||
      value.startingXl ||
      value.lineup ||
      value.items ||
      [];

    const players = normalizeFootballPlayers(playersRaw, fallbackTeam?.name || "", seed);
    return { formation: String(formation || "4-3-3"), players };
  };

  if (Array.isArray(raw)) {
    return {
      home: coerceSide(raw[0], teams?.[0], 10),
      away: coerceSide(raw[1], teams?.[1], 30),
    };
  }

  if (raw && typeof raw === "object") {
    return {
      home: coerceSide(raw.home || raw.team1 || raw.left || raw.a, teams?.[0], 10),
      away: coerceSide(raw.away || raw.team2 || raw.right || raw.b, teams?.[1], 30),
    };
  }

  // Fallback: try to read from teams[] directly if present
  return {
    home: coerceSide(teams?.[0], teams?.[0], 10),
    away: coerceSide(teams?.[1], teams?.[1], 30),
  };
}

function normalizeFootballPlayers(playersRaw, teamName, seed) {
  const list = Array.isArray(playersRaw) ? playersRaw : [];
  if (!list.length) return Array.from({ length: 11 }).map((_, i) => ({
    number: i === 0 ? 1 : i + seed,
    name: `Player ${i + 1}`,
    role: i === 0 ? "GK" : undefined,
    team: teamName,
  }));

  return list.slice(0, 23).map((p, i) => {
    if (typeof p === "string") {
      const s = p.trim();
      const m = s.match(/^#?(\\d{1,3})\\s+(.+)$/);
      if (m) return { number: Number(m[1]), name: m[2].trim(), team: teamName };
      return { number: i === 0 ? 1 : i + seed, name: s, team: teamName };
    }

    const number = Number.isFinite(Number(p?.number))
      ? Number(p.number)
      : (Number.isFinite(Number(p?.no)) ? Number(p.no) : (i === 0 ? 1 : i + seed));
    const name = String(p?.name || p?.player || p?.title || `Player ${i + 1}`);
    const role = p?.role || p?.pos || p?.position || (i === 0 ? "GK" : undefined);
    return {
      number,
      name,
      role,
      x: Number.isFinite(Number(p?.x)) ? Number(p.x) : undefined,
      y: Number.isFinite(Number(p?.y)) ? Number(p.y) : undefined,
      team: teamName,
    };
  });
}

function buildFootballLineupPlayersHtml({ side, formation, players }) {
  const layout = computeFootballFormationLayout(formation, side, players);
  return layout.map((pl, idx) => {
    const left = `${(pl.x * 100).toFixed(2)}%`;
    const top = `${(pl.y * 100).toFixed(2)}%`;
    const delay = (0.10 + idx * 0.06).toFixed(2);
    const number = escapeHtml(String(pl.number ?? ""));
    const name = escapeHtml(String(pl.name ?? ""));
    const role = escapeHtml(String(pl.role ?? ""));
    return `
        <div class="football-lineup-player ${side}" style="left:${left}; top:${top}; --stagger:${delay}s;" data-role="${role}">
          <div class="football-lineup-badge">${number}</div>
          <div class="football-lineup-name">${name}</div>
        </div>`;
  }).join("");
}

function computeFootballFormationLayout(formation, side, players) {
  const normalizeFormationKey = (f) => String(f || "").trim().replace(/\s+/g, "").replace(/_/g, "-");
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const formationStr = normalizeFormationKey(formation);
  const nums = formationStr
    .split(/[^0-9]+/g)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  const lines = nums.length ? nums : [4, 3, 3];
  const sum = lines.reduce((a, b) => a + b, 0);
  if (sum !== 10) {
    const delta = 10 - sum;
    if (delta > 0) {
      lines[lines.length - 1] += delta;
    } else if (delta < 0) {
      let remaining = -delta;
      for (let i = lines.length - 1; i >= 0 && remaining > 0; i--) {
        const take = Math.min(remaining, Math.max(0, lines[i] - 1));
        lines[i] -= take;
        remaining -= take;
      }
    }
  }

  const byRole = (arr, role) => arr.filter((p) => String(p.role || "").toUpperCase() === role);
  const byNumber = (arr, number) => arr.filter((p) => Number(p?.number) === number);
  const used = new Set();
  const pickOne = (arr) => {
    const p = arr.find((x) => x && !used.has(x));
    if (p) used.add(p);
    return p;
  };

  let list = Array.isArray(players) ? players.filter(Boolean) : [];
  // Heuristic: some sources list players in "away(bottom)" order (ATT...DEF...GK with GK last, often #1).
  // For the home(top) team, reverse that order so it becomes GK...DEF...ATT.
  const hasExplicitGkRole = list.some((p) => String(p?.role || "").toUpperCase() === "GK");
  if (!hasExplicitGkRole) {
    const jerseyOneIndex = list.findIndex((p) => Number(p?.number) === 1);
    const looksLikeGkLast = jerseyOneIndex === list.length - 1 && list.length >= 11;
    if (side === "home" && looksLikeGkLast) list = [...list].reverse();
  }
  const explicitGk = pickOne(byRole(list, "GK"));
  const jerseyOne = !explicitGk && byNumber(list, 1).length === 1 ? pickOne(byNumber(list, 1)) : null;
  const fallbackGk = !explicitGk && !jerseyOne
    ? (
      (list.length && Number(list[list.length - 1]?.number) === 1) ? list[list.length - 1]
        : (list.length && Number(list[0]?.number) === 1) ? list[0]
          : list?.[0]
    )
    : null;
  const gk = explicitGk || jerseyOne || fallbackGk || { number: 1, name: "GK", role: "GK" };
  used.add(gk);

  const pool = list.filter((p) => p && !used.has(p)).slice(0, 10);
  const outfield = [];
  while (outfield.length < 10 && pool.length) outfield.push(pool.shift());

  const midY = 0.50;
  const region = side === "home"
    ? { x0: 0.10, x1: 0.90, y0: 0.08, y1: midY - 0.02 }
    : { x0: 0.10, x1: 0.90, y0: midY + 0.02, y1: 0.92 };

  const yForLine = (i, total) => {
    if (total <= 1) return (region.y0 + region.y1) / 2;
    // Formation numbers are "back -> front" (DEF -> MID -> ATT).
    // For vertical layout (top->bottom):
    // - Home (top): GK -> DEF -> ... -> ATT (towards center line)
    // - Away (bottom): ATT -> ... -> DEF -> GK (towards bottom goal)
    const idx = side === "home" ? i : (total - 1 - i);
    const t = idx / (total - 1);
    return region.y0 + t * (region.y1 - region.y0);
  };

  const mkRow = (xs, y) => xs.map((t) => ({ x: region.x0 + t * (region.x1 - region.x0), y }));
  const placeRowDefault = (count, y) => Array.from({ length: count }).map((_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = region.x0 + t * (region.x1 - region.x0);
    return { x, y };
  });

  const formationTemplates = {
    "4-4-2": [
      [0.08, 0.36, 0.64, 0.92],
      [0.08, 0.36, 0.64, 0.92],
      [0.42, 0.58],
    ],
    "4-3-3": [
      [0.08, 0.36, 0.64, 0.92],
      [0.26, 0.50, 0.74],
      [0.12, 0.50, 0.88],
    ],
    "4-2-3-1": [
      [0.08, 0.36, 0.64, 0.92],
      [0.38, 0.62],
      [0.26, 0.50, 0.74],
      [0.50],
    ],
    "4-1-4-1": [
      [0.08, 0.36, 0.64, 0.92],
      [0.50],
      [0.08, 0.36, 0.64, 0.92],
      [0.50],
    ],
    "3-5-2": [
      [0.20, 0.50, 0.80],
      [0.08, 0.32, 0.50, 0.68, 0.92],
      [0.42, 0.58],
    ],
    "3-5-1-1": [
      [0.20, 0.50, 0.80],
      [0.08, 0.32, 0.50, 0.68, 0.92],
      [0.50],
      [0.50],
    ],
  };
  const template = formationTemplates[formationStr] || null;
  const placeRow = (count, y, lineIndex) => {
    if (!template) return placeRowDefault(count, y);
    const xs = template[lineIndex];
    if (!xs || xs.length !== count) return placeRowDefault(count, y);
    return mkRow(xs, y);
  };

  const positioned = [];
  // GK should be the first row for home (top) and the last row for away (bottom)
  const gkY = side === "home" ? (region.y0 + 0.05) : (region.y1 - 0.05);
  positioned.push({
    ...gk,
    x: clamp01(gk.x ?? 0.50),
    y: clamp01(gk.y ?? gkY),
    role: gk.role || "GK",
  });

  let cursor = 0;
  lines.forEach((count, idx) => {
    const y = yForLine(idx, lines.length);
    placeRow(count, y, idx).forEach((pt) => {
      const p = outfield[cursor++] || { number: "", name: "", role: "" };
      positioned.push({
        ...p,
        x: clamp01(p.x ?? pt.x),
        y: clamp01(p.y ?? pt.y),
      });
    });
  });

  return positioned.slice(0, 11);
}

function normalizeFootballTeamBadge(team, scene) {
  const rawType = team?.teamType || team?.type || team?.kind || scene?.teamType || scene?.teamKind;
  const t = String(rawType || "").toLowerCase().trim();

  const isNational = Boolean(team?.isNationalTeam || team?.nationalTeam || team?.country || team?.nation)
    || ["national", "nation", "country", "nt"].includes(t);
  const badgeType = isNational ? "national" : (t ? "club" : null);

  const logo = team?.logo || team?.logoUrl || team?.logoSrc;
  const flag = team?.flag || team?.flagUrl || team?.flagSrc;
  const badge = team?.badge || team?.badgeUrl || team?.badgeSrc;

  // Priority: explicit field for each type; fallback to generic badge
  const badgeSrc = isNational
    ? (flag || badge || null)
    : (logo || badge || null);

  return {
    badgeType,
    badgeSrc: badgeSrc ? String(badgeSrc) : null,
  };
}

function normalizeFootballScore(scene) {
  if (Array.isArray(scene.score) && scene.score.length >= 2) return scene.score.slice(0, 2);
  if (scene.score && typeof scene.score === "object") return [scene.score.home ?? 0, scene.score.away ?? 0];
  if (typeof scene.score === "string") {
    const m = scene.score.match(/(\d+)\D+(\d+)/);
    if (m) return [m[1], m[2]];
  }
  return [0, 0];
}

function normalizeFootballStats(scene) {
  if (Array.isArray(scene.stats) && scene.stats.length) return scene.stats;
  if (Array.isArray(scene.statsCards) && scene.statsCards.length) {
    return scene.statsCards.map((s) => ({ label: s.label || s.title, value: s.value || s.big, unit: s.unit || "" }));
  }
  return [
    { label: "Goals", value: scene.goals || "2" },
    { label: "Shots", value: "14" },
    { label: "Possession", value: "58", unit: "%" },
    { label: "xG", value: "1.9" },
  ];
}

function normalizeFootballStages(scene) {
  const fromEvents = Array.isArray(scene.events) ? scene.events : [];
  const fromRows = Array.isArray(scene.rows) ? scene.rows : [];
  const raw = Array.isArray(scene.stages) && scene.stages.length
    ? scene.stages
    : (fromEvents.length ? fromEvents : fromRows);

  const fallback = [
    { stage: "Group", title: "Solid start" },
    { stage: "Round of 16", title: "Knockout test" },
    { stage: "Semi", title: "Big moment" },
    { stage: "Final", title: "One match left" },
  ];

  return (raw.length ? raw : fallback).slice(0, 4).map((x, i) => {
    if (typeof x === "string") return { stage: `Stage ${i + 1}`, title: x };
    return x || fallback[i] || { stage: `Stage ${i + 1}`, title: "" };
  });
}

function normalizeFootballEvents(scene) {
  const raw = Array.isArray(scene.events) && scene.events.length
    ? scene.events
    : [
        { minute: "12'", title: "Early pressure", desc: "High press creates the first big chance" },
        { minute: "45+2'", title: "Momentum swing", desc: "A set-piece changes the rhythm" },
        { minute: "67'", title: "Key substitution", desc: "Fresh legs attack the half-space" },
        { minute: "90'", title: "Final push", desc: "The match is decided by one detail" },
      ];

  return raw.map((x, i) => {
    if (typeof x === "string") return { minute: `${i * 15 + 12}'`, title: x, desc: "" };
    return x || {};
  });
}

function normalizeFootballFixtures(scene) {
  const raw = Array.isArray(scene.fixtures) && scene.fixtures.length
    ? scene.fixtures
    : (Array.isArray(scene.matches) && scene.matches.length ? scene.matches : []);

  const fallback = [
    {
      group: "Bảng A",
      date: "12/6",
      time: "02:00",
      home: { name: "Mexico", code: "MEX", teamType: "national", flag: "assets/football/flags/mexico.svg" },
      away: { name: "Nam Phi", code: "RSA", teamType: "national", flag: "assets/football/flags/south-africa.svg" },
    },
    {
      group: "Bảng A",
      date: "12/6",
      time: "09:00",
      home: { name: "Hàn Quốc", code: "KOR", teamType: "national", flag: "assets/football/flags/korea-republic.svg" },
      away: { name: "Séc", code: "CZE", teamType: "national" },
    },
    {
      group: "Bảng B",
      date: "13/6",
      time: "02:00",
      home: { name: "Canada", code: "CAN", teamType: "national", flag: "assets/football/flags/canada.svg" },
      away: { name: "Bosnia", code: "BIH", teamType: "national" },
    },
    {
      group: "Bảng D",
      date: "13/6",
      time: "08:00",
      home: { name: "Hoa Kỳ", code: "USA", teamType: "national", flag: "assets/football/flags/united-states.svg" },
      away: { name: "Paraguay", code: "PAR", teamType: "national" },
    },
    {
      group: "Bảng B",
      date: "14/6",
      time: "02:00",
      home: { name: "Qatar", code: "QAT", teamType: "national", flag: "assets/football/flags/qatar.svg" },
      away: { name: "Thụy Sĩ", code: "SUI", teamType: "national" },
    },
    {
      group: "Bảng C",
      date: "14/6",
      time: "05:00",
      home: { name: "Brasil", code: "BRA", teamType: "national", flag: "assets/football/flags/brazil.svg" },
      away: { name: "Maroc", code: "MAR", teamType: "national", flag: "assets/football/flags/morocco.svg" },
    },
  ];

  const source = raw.length ? raw : fallback;

  const normalizeTeam = (team, fallbackName) => {
    if (!team) return { name: fallbackName || "", code: "", badgeType: null, badgeSrc: null };
    if (typeof team === "string") {
      const name = team;
      return { name, code: name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase(), badgeType: null, badgeSrc: null };
    }
    const name = team.name || team.title || fallbackName || "";
    const badge = normalizeFootballTeamBadge(team, scene);
    const explicitFlag = team.flag || team.flagUrl || team.flagSrc;
    const explicitLogo = team.logo || team.logoUrl || team.logoSrc;
    const badgeSrc = explicitFlag || explicitLogo || team.badge || team.badgeUrl || team.badgeSrc || badge.badgeSrc || null;
    const badgeType = badge.badgeType || (explicitFlag ? "national" : null);
    return {
      name,
      code: team.code || name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase(),
      badgeType,
      badgeSrc: badgeSrc ? String(badgeSrc) : null,
    };
  };

  return source.slice(0, 6).map((m, i) => {
    if (typeof m === "string") {
      return {
        group: `Bảng ${String.fromCharCode(65 + (i % 8))}`,
        date: "",
        time: "",
        home: normalizeTeam("", "Đội A"),
        away: normalizeTeam("", "Đội B"),
      };
    }
    const group = m.group || m.table || m.pool || m.stage || m.round || `Bảng ${String.fromCharCode(65 + (i % 8))}`;
    const date = m.date || m.day || m.matchDate || m.kickoffDate || "";
    const time = m.time || m.kickoff || m.kickoffTime || m.hour || "";
    const home = normalizeTeam(m.home || m.team1 || m.left || m.a, "Đội A");
    const away = normalizeTeam(m.away || m.team2 || m.right || m.b, "Đội B");
    return { group, date, time, home, away };
  });
}

function normalizeFootballStandings(scene) {
  const raw = Array.isArray(scene.standings) && scene.standings.length
    ? scene.standings
    : (Array.isArray(scene.table) && scene.table.length ? scene.table : []);

  const fallbackWorldCup = [
    {
      rank: 1,
      team: { name: "Mexico", code: "MEX", teamType: "national", flag: "assets/football/flags/mexico.svg" },
      played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0,
    },
    {
      rank: 2,
      team: { name: "Nam Phi", code: "RSA", teamType: "national", flag: "assets/football/flags/south-africa.svg" },
      played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0,
    },
    {
      rank: 3,
      team: { name: "Hàn Quốc", code: "KOR", teamType: "national", flag: "assets/football/flags/korea-republic.svg" },
      played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0,
    },
    {
      rank: 4,
      team: { name: "Séc", code: "CZE", teamType: "national" },
      played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, pts: 0,
    },
  ];

  const fallbackClub = [
    { rank: 1, team: { name: "Arsenal", code: "ARS", teamType: "club" }, played: 36, wins: 24, draws: 7, losses: 5, gf: 68, ga: 26, gd: 42, pts: 79, last5: ["L", "L", "W", "W", "W"] },
    { rank: 2, team: { name: "Man City", code: "MCI", teamType: "club" }, played: 36, wins: 23, draws: 8, losses: 5, gf: 75, ga: 32, gd: 43, pts: 77, last5: ["W", "W", "D", "W", "W"] },
    { rank: 3, team: { name: "Man United", code: "MUN", teamType: "club" }, played: 36, wins: 18, draws: 11, losses: 7, gf: 63, ga: 48, gd: 15, pts: 65, last5: ["L", "W", "W", "W", "D"] },
    { rank: 4, team: { name: "Liverpool", code: "LIV", teamType: "club" }, played: 36, wins: 17, draws: 8, losses: 11, gf: 60, ga: 48, gd: 12, pts: 59, last5: ["W", "W", "W", "L", "D"] },
    { rank: 5, team: { name: "Aston Villa", code: "AVL", teamType: "club" }, played: 36, wins: 17, draws: 8, losses: 11, gf: 50, ga: 46, gd: 4, pts: 59, last5: ["D", "W", "L", "L", "D"] },
  ];

  const normalizeTeam = (team, fallbackName) => {
    if (!team) return { name: fallbackName || "", code: "", badgeType: null, badgeSrc: null };
    if (typeof team === "string") {
      const name = team;
      return { name, code: name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase(), badgeType: null, badgeSrc: null };
    }
    const name = team.name || team.title || fallbackName || "";
    const badge = normalizeFootballTeamBadge(team, scene);
    const explicitFlag = team.flag || team.flagUrl || team.flagSrc;
    const explicitLogo = team.logo || team.logoUrl || team.logoSrc;
    const badgeSrc = explicitFlag || explicitLogo || team.badge || team.badgeUrl || team.badgeSrc || badge.badgeSrc || null;
    const badgeType = badge.badgeType || (explicitFlag ? "national" : null);
    return {
      name,
      code: team.code || name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase(),
      badgeType,
      badgeSrc: badgeSrc ? String(badgeSrc) : null,
    };
  };

  const rowsPre = raw.map((r, i) => {
    const team = r.team ?? r.club ?? r.nationalTeam ?? r.name ?? r.title;
    const played = r.played ?? r.mp ?? r.matchesPlayed ?? r.P ?? r.MP;
    const wins = r.wins ?? r.w ?? r.W;
    const draws = r.draws ?? r.d ?? r.D;
    const losses = r.losses ?? r.l ?? r.L;
    const gf = r.gf ?? r.goalsFor ?? r.GF;
    const ga = r.ga ?? r.goalsAgainst ?? r.GA;
    const gd = r.gd ?? r.goalDiff ?? r.GD;
    const pts = r.pts ?? r.points ?? r.Pts;
    return {
      rank: r.rank ?? r.pos ?? r.position ?? (i + 1),
      team: normalizeTeam(team, r.teamName || ""),
      played,
      wins,
      draws,
      losses,
      gf,
      ga,
      gd,
      pts,
      last5: r.last5 ?? r.form ?? r.last ?? r.recent,
    };
  });

  const explicitVariant = String(scene.standingsVariant ?? scene.variant ?? scene.tableVariant ?? "").toLowerCase();
  const inferredVariant = (() => {
    if (explicitVariant.includes("world") || explicitVariant.includes("group") || explicitVariant.includes("wc")) return "world-cup-group";
    if (explicitVariant.includes("club") || explicitVariant.includes("league")) return "club-league";
    const anyNational = rowsPre.some((x) => x.team?.badgeType === "national");
    return anyNational ? "world-cup-group" : "club-league";
  })();

  const rows = rowsPre.length
    ? rowsPre
    : (inferredVariant === "club-league" ? fallbackClub : fallbackWorldCup).map((r) => ({
        ...r,
        team: normalizeTeam(r.team, r.team?.name),
      }));

  return {
    variant: inferredVariant,
    season: scene.season || scene.seasonLabel || scene.year || "2025–26",
    group: scene.group || scene.groupName || "Bảng A",
    subtitle: scene.subtitle || "",
    rows: rows.slice(0, inferredVariant === "club-league" ? 12 : 8),
  };
}

function footballBg(scene) {
  return `linear-gradient(160deg, ${scene.bgColor || "#08111F"} 0%, #0b1f17 48%, #08111F 100%)`;
}

function footballPitchBackdrop(scene) {
  const line = hexToRgba(scene.accentColor || "#F7C948", 0.46);
  return `
    <div class="football-pitch-bg" data-layout-allow-overflow>
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <rect x="94" y="124" width="${width - 188}" height="${height - 248}" rx="34" fill="none" stroke="rgba(255,255,255,0.44)" stroke-width="8"/>
        <line x1="94" y1="${height / 2}" x2="${width - 94}" y2="${height / 2}" stroke="rgba(255,255,255,0.36)" stroke-width="7"/>
        <circle cx="${width / 2}" cy="${height / 2}" r="166" fill="none" stroke="${line}" stroke-width="7"/>
        <rect x="250" y="124" width="${width - 500}" height="244" rx="20" fill="none" stroke="rgba(255,255,255,0.34)" stroke-width="7"/>
        <rect x="250" y="${height - 368}" width="${width - 500}" height="244" rx="20" fill="none" stroke="rgba(255,255,255,0.34)" stroke-width="7"/>
      </svg>
    </div>`;
}

function footballTeamCard(team, accent, side) {
  const dots = (team.form || []).slice(0, 5).map((result) => {
    const color = String(result).toUpperCase().startsWith("W")
      ? "#34D399"
      : String(result).toUpperCase().startsWith("D")
        ? "#F7C948"
        : "#EF4444";
    return `<span class="football-form-dot" style="background:${color};"></span>`;
  }).join("");

  const badgeClass = team.badgeType === "national" ? "football-team-badge-flag" : "football-team-badge-logo";
  const badgeHtml = team.badgeSrc
    ? `<img class="football-team-badge ${badgeClass}" src="${escapeHtmlAttr(team.badgeSrc)}" alt="${escapeHtmlAttr(team.name)}" />`
    : "";

  return `
    <div class="football-team-card football-team-${side}" style="border-color:${hexToRgba(accent || "#F7C948", 0.34)};">
      <div class="football-team-head">
        ${badgeHtml}
        <div class="football-team-code">${escapeHtml(team.code)}</div>
      </div>
      <div>
        <div class="football-team-name">${escapeHtml(team.name)}</div>
        <div class="football-team-form">${dots}</div>
      </div>
    </div>`;
}

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeHtmlAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

function formatHookTitleHtml(title, highlightWords) {
  const raw = String(title || "").trim();
  if (!raw) return "";

  const words = raw.split(/\s+/);
  const highlights = Array.isArray(highlightWords) && highlightWords.length
    ? new Set(highlightWords.map((w) => String(w).toLowerCase()))
    : null;

  // Default: underline the last 1–2 meaningful words
  const auto = new Set();
  if (!highlights) {
    const meaningful = words
      .map((w) => w.replace(/[^\p{L}\p{N}]+/gu, ""))
      .filter(Boolean);
    const last = meaningful[meaningful.length - 1];
    const prev = meaningful[meaningful.length - 2];
    if (last) auto.add(last.toLowerCase());
    if (prev && prev.length <= 4) auto.add(prev.toLowerCase());
  }

  return words.map((w) => {
    const key = w.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    const should = highlights ? highlights.has(key) : auto.has(key);
    const safe = escapeHtml(w);
    return should ? `<span class="ai-underline">${safe}</span>` : safe;
  }).join(" ");
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lighten(hex) {
  const h = hex.replace("#", "");
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + 20);
  const g = Math.min(255, parseInt(h.slice(2, 4), 16) + 20);
  const b = Math.min(255, parseInt(h.slice(4, 6), 16) + 20);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function splitIntoBullets(text, count) {
  const sentences = text.split(/[.!?。]/g)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  if (sentences.length >= 2) {
    return sentences.slice(0, 6);
  }

  const parts = text.split(/[,，]/g)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  if (parts.length >= 2) {
    return parts.slice(0, Math.max(count, parts.length)).slice(0, 6);
  }

  const chunkSize = Math.ceil(text.length / count);
  const result = [];
  for (let i = 0; i < count; i++) {
    const start = i * chunkSize;
    let end = (i + 1) * chunkSize;
    if (i < count - 1) {
      const nextSpace = text.indexOf(" ", end);
      if (nextSpace !== -1 && nextSpace - end < 10) {
        end = nextSpace;
      }
    } else {
      end = text.length;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) result.push(chunk);
  }
  return result;
}

function splitInTwo(text) {
  if (text.length < 20) return [text, ""];
  const mid = Math.floor(text.length / 2);
  const spaceBefore = text.lastIndexOf(" ", mid);
  const spaceAfter = text.indexOf(" ", mid);

  let splitAt = mid;
  if (spaceBefore !== -1 && (mid - spaceBefore < spaceAfter - mid || spaceAfter === -1)) {
    splitAt = spaceBefore;
  } else if (spaceAfter !== -1) {
    splitAt = spaceAfter;
  }

  return [text.slice(0, splitAt).trim(), text.slice(splitAt).trim()];
}

function extractStat(text) {
  const match = text.match(/\d[\d,.%x]+/);
  return match ? match[0] : null;
}
