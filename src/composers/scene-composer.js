/**
 * Scene Composer
 * Generates HyperFrames-compatible HTML for each scene type & animation style.
 */

import { config } from "../config.js";
import { generateVisualsHTML } from "./visual-generator.js";

const { width, height } = config.hyperframes;

export function buildSceneHtml(scene, audioFile) {
  const composerFn = COMPOSERS[scene.composition] || COMPOSERS["bullet-points"];
  let content = composerFn(scene);

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

  const animationScript = buildAnimationScript(scene);

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
  `;
}

// ── Composition HTML Generators ───────────────────────────────────────────────

const COMPOSERS = {
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
    return `
    <div class="canvas" style="align-items:center; justify-content:flex-start; padding-top:220px;">
      <div class="ai-title ai-gradient-text" style="font-size:58px; font-weight:900; text-align:center; max-width: 960px;">
        ${escapeHtml(headline)}
      </div>
      <div class="ai-card ai-card-pop ai-promo" style="margin-top:70px; width: 920px; max-width: 920px;">
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
      <div class="cta-hearts">${hearts}</div>
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
    "cta-card": "particle-burst",

    // AI-news compositions
    "hook-question": "quote-fade",
    "ui-cards": "card-slide-in-right",
    "process-steps": "reveal-stagger",
    "quote-attrib": "quote-fade",
    "stats-cards-grid": "reveal-stagger",
    "kinetic-title": "kinetic-slam",
    "context-bars": "reveal-stagger",
    "promo-card": "quote-fade"
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

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
