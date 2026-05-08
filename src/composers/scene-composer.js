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
    ? `<audio id="scene-${scene.id}-audio" src="../assets/${audioFile}" preload="auto"></audio>`
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
      font-family: "Noto Sans Vietnamese", "Inter", sans-serif;
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
      background: radial-gradient(ellipse at 50% 30%, ${hexToRgba(scene.accentColor, 0.25)} 0%, transparent 60%);
    }
    [data-composition-id="${cid}"] .bg-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(${hexToRgba(scene.accentColor, 0.06)} 1px, transparent 1px),
        linear-gradient(90deg, ${hexToRgba(scene.accentColor, 0.06)} 1px, transparent 1px);
      background-size: 60px 60px;
    }
    [data-composition-id="${cid}"] .accent-bar {
      width: 80px;
      height: 6px;
      background: ${scene.accentColor};
      border-radius: 3px;
      margin-bottom: 32px;
    }
    [data-composition-id="${cid}"] .emoji-deco {
      font-size: 100px;
      line-height: 1;
      margin-bottom: 30px;
      display: block;
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
    const lines = splitIntoBullets(scene.voiceText, 3);
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
    return `
    <div class="canvas" style="background:linear-gradient(160deg,${scene.bgColor},${lighten(scene.bgColor)});">
      <div class="bg-gradient"></div>
      <div class="cta-hearts">${hearts}</div>
      <span class="emoji-deco" id="s${scene.id}-emoji" style="font-size:150px;">${scene.emoji || "❤️"}</span>
      <h1 class="cta-title" id="s${scene.id}-title">${escapeHtml(scene.title)}</h1>
      <p class="cta-sub" id="s${scene.id}-sub">${escapeHtml(scene.voiceText.slice(0, 100))}</p>
    </div>`;
  },
};

// ── Animation Script Generator ────────────────────────────────────────────────

function buildAnimationScript(scene) {
  const cid = `scene-${scene.id}`;
  const s = `s${scene.id}`;
  const dur = scene.duration;

  const animFns = {
    "zoom-in": () => `
      const tl = gsap.timeline({ paused: true });
      tl.fromTo('[data-composition-id="${cid}"] .canvas', { scale: 1.15, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: "power3.out" });
      tl.from('[data-composition-id="${cid}"] .emoji-deco', { scale: 0, rotation: -20, duration: 0.6, ease: "back.out(2)" }, 0.3);
      tl.from('[data-composition-id="${cid}"] #${s}-title', { y: 40, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.5);
      tl.from('[data-composition-id="${cid}"] #${s}-sub', { y: 30, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.75);
      tl.from('[data-composition-id="${cid}"] .accent-bar', { scaleX: 0, duration: 0.5, ease: "power3.out", transformOrigin: "left" }, 0.4);`,

    "slide-up": () => `
      const tl = gsap.timeline({ paused: true });
      tl.from('[data-composition-id="${cid}"] .tag-badge', { y: -40, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, 0);
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
      tl.from('[data-composition-id="${cid}"] .quote-mark', { scale: 0.5, opacity: 0, duration: 0.7, ease: "back.out(1.5)" }, 0);`,

    "bounce-in": () => `
      const tl = gsap.timeline({ paused: true });
      tl.from('[data-composition-id="${cid}"] .stat-number', { scale: 0, opacity: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" }, 0);
      tl.from('[data-composition-id="${cid}"] .stat-label', { y: 40, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.5);
      tl.from('[data-composition-id="${cid}"] .scene-subtitle', { y: 30, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.75);
      tl.from('[data-composition-id="${cid}"] .glow-orb', { scale: 0, opacity: 0, duration: 1, ease: "power2.out" }, 0);`,

    "typewriter": () => `
      const tl = gsap.timeline({ paused: true });
      tl.from('[data-composition-id="${cid}"] #${s}-left', { x: -${width / 2}, opacity: 0, duration: 0.7, ease: "power3.out" }, 0);
      tl.from('[data-composition-id="${cid}"] #${s}-right', { x: ${width / 2}, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.2);`,

    "particle-burst": () => `
      const tl = gsap.timeline({ paused: true });
      tl.from('[data-composition-id="${cid}"] #${s}-emoji', { scale: 0, rotation: -30, duration: 0.8, ease: "elastic.out(1, 0.4)" }, 0);
      tl.from('[data-composition-id="${cid}"] #${s}-title', { y: 50, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.4);
      tl.from('[data-composition-id="${cid}"] #${s}-sub', { y: 30, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.7);
      const hearts = document.querySelectorAll('[data-composition-id="${cid}"] .heart');
      hearts.forEach((h, i) => {
        const delay = 0.6 + i * 0.12;
        tl.to(h, { opacity: 1, y: -80, duration: 0.6, ease: "power2.out" }, delay);
        tl.to(h, { opacity: 0, y: -160, duration: 0.8, ease: "power2.in" }, delay + 0.6);
      });`,

    "pulse-glow": () => `
      const tl = gsap.timeline({ paused: true });
      tl.from('[data-composition-id="${cid}"] .canvas', { opacity: 0, duration: 0.5 }, 0);
      tl.from('[data-composition-id="${cid}"] #${s}-ring', { strokeDashoffset: 565, duration: ${Math.min(dur - 1, 3)}, ease: "power2.inOut" }, 0.3);
      tl.from('[data-composition-id="${cid}"] #${s}-num', { scale: 0, opacity: 0, duration: 0.6, ease: "back.out(2)" }, 0.2);
      tl.from('[data-composition-id="${cid}"] #${s}-title', { y: 40, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.7);`,
  };

  const animKey = scene.animation || "fade-cascade";
  const animBody = (animFns[animKey] || animFns["fade-cascade"])();

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
  const sentences = text.split(/[.!?。]/g).filter((s) => s.trim().length > 5);
  if (sentences.length >= count) return sentences.slice(0, count).map((s) => s.trim());
  // Fallback: split by comma
  const parts = text.split(/[,，]/g).filter((s) => s.trim().length > 3);
  if (parts.length >= count) return parts.slice(0, count).map((s) => s.trim());
  // Fallback: chunk
  const chunkSize = Math.ceil(text.length / count);
  return Array.from({ length: count }, (_, i) => text.slice(i * chunkSize, (i + 1) * chunkSize).trim());
}

function splitInTwo(text) {
  const mid = Math.floor(text.length / 2);
  return [text.slice(0, mid), text.slice(mid)];
}

function extractStat(text) {
  const match = text.match(/\d[\d,.%x]+/);
  return match ? match[0] : null;
}