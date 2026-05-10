/**
 * Scene Composer
 * Generates HyperFrames-compatible HTML for each scene type & animation style.
 *
 * Composition types:
 *  - hero-title       : Big title + subtitle, full-screen hero
 *  - bullet-points    : 3-4 animated bullet points
 *  - quote-card       : Large centered quote
 *  - stat-highlight   : Number/stat with label
 *  - split-screen     : Two-panel layout
 *  - countdown        : Countdown animation
 *  - cta-card         : Call to action with hearts/effects
 */

import { config } from "../config.js";

const { width, height } = config.hyperframes;

export function buildSceneHtml(scene, audioFile) {
  const composerFn = COMPOSERS[scene.composition] || COMPOSERS["bullet-points"];
  const content = composerFn(scene);
  const animationScript = buildAnimationScript(scene);

  const audioEl = audioFile
    ? `<audio id="scene-${scene.id}-audio" src="assets/${audioFile}" preload="auto"></audio>`
    : "";

  return `<div
    data-composition-id="scene-${scene.id}"
    data-width="${width}"
    data-height="${height}"
    data-duration="${scene.duration}"
  >
    ${content}
    ${audioEl}

    <style>
      ${buildBaseStyles(scene)}
      ${composerStyles(scene)}
    </style>

    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      (function () {
        ${animationScript}
      })();
    </script>
  </div>`;
}

// ── Base Styles ───────────────────────────────────────────────────────────────

function buildBaseStyles(scene) {
  const cid = `scene-${scene.id}`;
  return `
    [data-composition-id="${cid}"] {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: ${scene.bgColor};
      font-family: "Inter", sans-serif;
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
      stroke-width: 4;
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
  "hero-title": (scene) => `
    <div class="canvas">
      <div class="bg-gradient"></div>
      <div class="bg-grid"></div>
      <div class="glow-orb" id="s${scene.id}-orb" style="width:700px;height:700px;top:-100px;left:-100px;"></div>
      <span class="emoji-deco" id="s${scene.id}-emoji">${scene.emoji || "🎯"}</span>
      <div class="accent-bar" id="s${scene.id}-bar"></div>
      <h1 class="scene-title" id="s${scene.id}-title">${escapeHtml(scene.title)}</h1>
      <p class="scene-subtitle" id="s${scene.id}-sub">${escapeHtml(scene.voiceText.slice(0, 80))}</p>
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
      <p class="scene-subtitle" style="margin-top:30px;font-size:36px;" id="s${scene.id}-desc">${escapeHtml(scene.voiceText.slice(0, 100))}</p>
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
    const profileImg = scene.imageSrc || scene.profileImage || "assets/logo.svg";
    return `
    <div class="canvas" style="background:linear-gradient(160deg,${scene.bgColor},${lighten(scene.bgColor)});">
      <div class="bg-gradient"></div>
      <div class="cta-hearts">${hearts}</div>
      <div class="hero-wrap" style="text-align:center; display:flex; flex-direction:column; align-items:center; transform: translateY(-100px);">
        <span class="emoji-deco" id="s${scene.id}-emoji" style="font-size:200px; margin-bottom: 30px;">${scene.emoji || "❤️"}</span>
        <h1 class="cta-title" id="s${scene.id}-title" style="color:#ffffff; margin-bottom:20px;">${escapeHtml(scene.title)}</h1>
        <p class="cta-sub" id="s${scene.id}-sub" style="color:rgba(255,255,255,0.8);">${escapeHtml(scene.voiceText.slice(0, 100))}</p>
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
      const sub = document.querySelector('[data-composition-id="${cid}"] #${s}-sub');
      if (sub) tl.from(sub, { y: 30, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.75);
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
      const sub = document.querySelector('[data-composition-id="${cid}"] .scene-subtitle');
      if (sub) tl.from(sub, { y: 30, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.75);
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
      const sub = document.querySelector('[data-composition-id="${cid}"] #${s}-sub');
      if (sub) tl.from(sub, { y: 30, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.7);
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
  };

  const animKey = scene.animation || "fade-cascade";

  // Compositions that have mandatory specific animations to be visible
  const forceAnimMap = {
    "infographic-chart": "infographic-chart",
    "stats-grid": "stats-grid",
    "terminal": "terminal",
    "callout": "callout",
    "comparison": "comparison",
    "code-diff": "code-diff",
    "countdown": "pulse-glow",
    "cta-card": "particle-burst"
  };

  const finalAnim = forceAnimMap[scene.composition] || animKey;
  const animBody = (animFns[finalAnim] || animFns[animKey] || animFns["fade-cascade"])();

  return `
    ${animBody}
    // Force timeline to last for the entire scene duration to prevent early blanking
    tl.to({}, { duration: 0 }, ${dur});
    window.__timelines = window.__timelines || {};
    window.__timelines["${cid}"] = tl;
  `;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
  // Prioritize splitting by sentences
  const sentences = text.split(/[.!?。]/g)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  // If we have enough sentences to make a list (at least 2), use them
  // This satisfies the user request to have one bullet per sentence.
  if (sentences.length >= 2) {
    return sentences.slice(0, 6); // Cap at 6 to avoid overflowing the screen
  }

  // Fallback: split by comma if we don't have enough sentences
  const parts = text.split(/[,，]/g)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  if (parts.length >= 2) {
    return parts.slice(0, Math.max(count, parts.length)).slice(0, 6);
  }

  // Final fallback: split into chunks by length to satisfy the 'count' requirement
  const chunkSize = Math.ceil(text.length / count);
  const result = [];
  for (let i = 0; i < count; i++) {
    const start = i * chunkSize;
    // Find next space to avoid splitting words if possible
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