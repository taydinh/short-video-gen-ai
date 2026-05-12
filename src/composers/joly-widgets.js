/**
 * Joly-inspired video widgets.
 *
 * These are HTML/CSS/GSAP ports inspired by Joly UI components. They avoid
 * React, Tailwind, shadcn, and runtime hydration so HyperFrames can render
 * scenes deterministically.
 */

import { config } from "../config.js";

const { width, height } = config.hyperframes;
const FALLBACK_IMAGE = "assets/logos/logo.png";

export const JOLY_COMPOSITIONS = new Set([
  "joly-typewriter-text",
  "joly-text-morphing",
  "joly-velocity-morph",
  "joly-glitch-text",
  "joly-highlight-text",
  "joly-number-counter",
  "joly-bento-grid",
  "joly-code-block",
  "joly-phone-card",
  "joly-animated-beam",
  "joly-image-comparison",
  "joly-image-sphere",
]);

export function isJolyComposition(composition) {
  return JOLY_COMPOSITIONS.has(composition);
}

export function buildJolySceneHtml(scene) {
  const map = {
    "joly-typewriter-text": buildTypewriterText,
    "joly-text-morphing": buildTextMorphing,
    "joly-velocity-morph": buildVelocityMorph,
    "joly-glitch-text": buildGlitchText,
    "joly-highlight-text": buildHighlightText,
    "joly-number-counter": buildNumberCounter,
    "joly-bento-grid": buildBentoGrid,
    "joly-code-block": buildCodeBlock,
    "joly-phone-card": buildPhoneCard,
    "joly-animated-beam": buildAnimatedBeam,
    "joly-image-comparison": buildImageComparison,
    "joly-image-sphere": buildImageSphere,
  };

  const fn = map[scene.composition] || buildBentoGrid;
  return fn(scene);
}

export function buildJolyStyles(scene) {
  if (!isJolyComposition(scene.composition)) return "";

  const cid = `scene-${scene.id}`;
  const acc = scene.accentColor || "#8dd3ff";
  const text = scene.textColor || "#ffffff";
  const bg = scene.bgColor || "#0d0d1a";

  return `
    [data-composition-id="${cid}"] .joly-canvas {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 108px 76px 178px;
      color: ${text};
      background:
        radial-gradient(circle at 16% 18%, ${hexToRgba(acc, 0.22)}, transparent 34%),
        radial-gradient(circle at 90% 82%, rgba(255,255,255,0.08), transparent 30%),
        ${bg};
    }
    [data-composition-id="${cid}"] .joly-bg-grid {
      position: absolute;
      inset: 0;
      opacity: 0.24;
      background-image:
        linear-gradient(${hexToRgba(acc, 0.13)} 1px, transparent 1px),
        linear-gradient(90deg, ${hexToRgba(acc, 0.13)} 1px, transparent 1px);
      background-size: 64px 64px;
      mask-image: linear-gradient(to bottom, transparent, #000 14%, #000 82%, transparent);
      pointer-events: none;
    }
    [data-composition-id="${cid}"] .joly-stack {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 940px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
      text-align: center;
    }
    [data-composition-id="${cid}"] .joly-kicker {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      max-width: 100%;
      padding: 10px 18px;
      border-radius: 999px;
      color: ${hexToRgba(text, 0.84)};
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.14);
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    [data-composition-id="${cid}"] .joly-title {
      max-width: 940px;
      font-size: 80px;
      line-height: 1.08;
      font-weight: 900;
      letter-spacing: 0;
      color: ${text};
      text-wrap: balance;
      overflow-wrap: anywhere;
      text-shadow: 0 18px 46px rgba(0,0,0,0.38);
    }
    [data-composition-id="${cid}"] .joly-gradient-text {
      background: linear-gradient(90deg, ${acc}, #ffffff 42%, #fbbf24 74%, #22d3ee);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    [data-composition-id="${cid}"] .joly-subtitle {
      max-width: 820px;
      font-size: 30px;
      line-height: 1.35;
      font-weight: 750;
      color: ${hexToRgba(text, 0.72)};
      overflow-wrap: anywhere;
    }
    [data-composition-id="${cid}"] .joly-card {
      background: rgba(10, 13, 26, 0.72);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 24px;
      box-shadow: 0 28px 80px rgba(0,0,0,0.30);
      backdrop-filter: blur(14px);
    }
    [data-composition-id="${cid}"] .joly-text-slot {
      min-height: 106px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: pre-wrap;
    }
    [data-composition-id="${cid}"] .joly-cursor {
      display: inline-block;
      width: 5px;
      height: 0.95em;
      margin-left: 8px;
      border-radius: 999px;
      background: ${acc};
      vertical-align: -0.12em;
      animation: joly-cursor-${scene.id} 0.7s steps(1) infinite;
    }
    @keyframes joly-cursor-${scene.id} {
      0%, 48% { opacity: 1; }
      49%, 100% { opacity: 0; }
    }
    [data-composition-id="${cid}"] .joly-glitch {
      position: relative;
      color: ${text};
      text-shadow:
        3px 0 ${hexToRgba(acc, 0.85)},
        -3px 0 rgba(239,68,68,0.74);
      animation: joly-glitch-shift-${scene.id} 1.05s steps(2) infinite;
    }
    [data-composition-id="${cid}"] .joly-glitch::before,
    [data-composition-id="${cid}"] .joly-glitch::after {
      content: attr(data-text);
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }
    [data-composition-id="${cid}"] .joly-glitch::before {
      color: ${acc};
      clip-path: inset(0 0 54% 0);
      transform: translate(4px, -3px);
      opacity: 0.72;
    }
    [data-composition-id="${cid}"] .joly-glitch::after {
      color: #ef4444;
      clip-path: inset(48% 0 0 0);
      transform: translate(-4px, 3px);
      opacity: 0.64;
    }
    @keyframes joly-glitch-shift-${scene.id} {
      0%, 100% { transform: translate(0,0); filter: none; }
      20% { transform: translate(-2px,1px); filter: hue-rotate(18deg); }
      42% { transform: translate(3px,-1px); }
      68% { transform: translate(-1px,2px); filter: contrast(1.18); }
    }
    [data-composition-id="${cid}"] .joly-highlight-word {
      position: relative;
      display: inline-block;
      padding: 0 0.05em;
      color: ${text};
    }
    [data-composition-id="${cid}"] .joly-highlight-word::after {
      content: "";
      position: absolute;
      left: -0.04em;
      right: -0.04em;
      bottom: 0.04em;
      height: 0.25em;
      border-radius: 999px;
      background: ${hexToRgba(acc, 0.72)};
      z-index: -1;
      transform-origin: left;
      transform: scaleX(0);
    }
    [data-composition-id="${cid}"] .joly-bento {
      width: 100%;
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      grid-auto-rows: 176px;
      gap: 18px;
      text-align: left;
    }
    [data-composition-id="${cid}"] .joly-bento-item {
      position: relative;
      overflow: hidden;
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    [data-composition-id="${cid}"] .joly-bento-item.large {
      grid-row: span 2;
    }
    [data-composition-id="${cid}"] .joly-bento-icon {
      width: 54px;
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      background: ${hexToRgba(acc, 0.16)};
      border: 1px solid ${hexToRgba(acc, 0.28)};
      font-size: 28px;
    }
    [data-composition-id="${cid}"] .joly-bento-value {
      font-size: 46px;
      line-height: 1.05;
      font-weight: 900;
      color: ${text};
      overflow-wrap: anywhere;
    }
    [data-composition-id="${cid}"] .joly-bento-label {
      margin-top: 8px;
      font-size: 22px;
      line-height: 1.25;
      font-weight: 800;
      color: ${hexToRgba(text, 0.66)};
      overflow-wrap: anywhere;
    }
    [data-composition-id="${cid}"] .joly-code {
      width: 100%;
      overflow: hidden;
      text-align: left;
    }
    [data-composition-id="${cid}"] .joly-code-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 58px;
      padding: 0 22px;
      border-bottom: 1px solid rgba(255,255,255,0.11);
      background: rgba(255,255,255,0.04);
    }
    [data-composition-id="${cid}"] .joly-code-dots {
      display: flex;
      gap: 9px;
    }
    [data-composition-id="${cid}"] .joly-code-dot {
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
    }
    [data-composition-id="${cid}"] .joly-code-body {
      padding: 26px 30px 30px;
      font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
      font-size: 25px;
      line-height: 1.48;
      color: #cbd5e1;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      min-height: 420px;
    }
    [data-composition-id="${cid}"] .joly-code-line {
      opacity: 0;
      transform: translateX(-16px);
    }
    [data-composition-id="${cid}"] .joly-code-line.prompt { color: ${acc}; }
    [data-composition-id="${cid}"] .joly-code-line.warn { color: #fbbf24; }
    [data-composition-id="${cid}"] .joly-code-line.ok { color: #34d399; }
    [data-composition-id="${cid}"] .joly-phone {
      width: 414px;
      height: 760px;
      padding: 18px;
      border-radius: 54px;
      background: linear-gradient(145deg, rgba(255,255,255,0.28), rgba(255,255,255,0.04));
      box-shadow: inset 0 0 0 2px rgba(255,255,255,0.18), 0 36px 90px rgba(0,0,0,0.42);
    }
    [data-composition-id="${cid}"] .joly-phone-screen {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 40px;
      background: #090b12;
    }
    [data-composition-id="${cid}"] .joly-phone-notch {
      position: absolute;
      top: 12px;
      left: 50%;
      width: 112px;
      height: 28px;
      transform: translateX(-50%);
      border-radius: 999px;
      background: rgba(0,0,0,0.84);
      z-index: 4;
    }
    [data-composition-id="${cid}"] .joly-phone-media {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.86;
    }
    [data-composition-id="${cid}"] .joly-phone-overlay {
      position: absolute;
      left: 22px;
      right: 22px;
      bottom: 26px;
      z-index: 3;
      text-align: left;
    }
    [data-composition-id="${cid}"] .joly-beam-wrap {
      position: relative;
      width: 900px;
      height: 640px;
    }
    [data-composition-id="${cid}"] .joly-beam-node {
      position: absolute;
      width: 166px;
      min-height: 116px;
      padding: 18px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 9px;
      text-align: center;
    }
    [data-composition-id="${cid}"] .joly-beam-node .icon {
      font-size: 34px;
      line-height: 1;
    }
    [data-composition-id="${cid}"] .joly-beam-node .label {
      font-size: 20px;
      line-height: 1.18;
      font-weight: 900;
      color: ${text};
      overflow-wrap: anywhere;
    }
    [data-composition-id="${cid}"] .joly-beam-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    [data-composition-id="${cid}"] .joly-beam-path {
      fill: none;
      stroke: url(#joly-beam-grad-${scene.id});
      stroke-width: 5;
      stroke-linecap: round;
      stroke-dasharray: 12 18;
      opacity: 0.85;
      animation: joly-beam-dash-${scene.id} 1.1s linear infinite;
    }
    @keyframes joly-beam-dash-${scene.id} {
      to { stroke-dashoffset: -60; }
    }
    [data-composition-id="${cid}"] .joly-compare {
      position: relative;
      width: 820px;
      height: 720px;
      overflow: hidden;
    }
    [data-composition-id="${cid}"] .joly-compare img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    [data-composition-id="${cid}"] .joly-compare-after {
      clip-path: inset(0 0 0 50%);
    }
    [data-composition-id="${cid}"] .joly-compare-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 5px;
      transform: translateX(-50%);
      background: #ffffff;
      box-shadow: 0 0 28px ${hexToRgba(acc, 0.9)};
    }
    [data-composition-id="${cid}"] .joly-compare-handle::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 56px;
      height: 56px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: ${acc};
      box-shadow: 0 0 0 8px rgba(255,255,255,0.18);
    }
    [data-composition-id="${cid}"] .joly-label-row {
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: 18px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      z-index: 3;
    }
    [data-composition-id="${cid}"] .joly-mini-label {
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(0,0,0,0.58);
      border: 1px solid rgba(255,255,255,0.16);
      font-size: 18px;
      font-weight: 900;
      color: #fff;
    }
    [data-composition-id="${cid}"] .joly-sphere {
      position: relative;
      width: 760px;
      height: 760px;
      transform-style: preserve-3d;
      perspective: 1100px;
    }
    [data-composition-id="${cid}"] .joly-sphere-item {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 170px;
      height: 230px;
      margin-left: -85px;
      margin-top: -115px;
      overflow: hidden;
      border-radius: 22px;
      border: 1px solid rgba(255,255,255,0.20);
      box-shadow: 0 18px 50px rgba(0,0,0,0.32);
      background: rgba(255,255,255,0.08);
      transform-style: preserve-3d;
    }
    [data-composition-id="${cid}"] .joly-sphere-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  `;
}

export function buildJolyAnimationScript(scene) {
  if (!isJolyComposition(scene.composition)) return "";

  const cid = `scene-${scene.id}`;
  const dur = Number.isFinite(scene.duration) ? scene.duration : 5;
  const comp = scene.composition;

  if (comp === "joly-typewriter-text") {
    const words = JSON.stringify(getWords(scene).slice(0, 8));
    return `
      const typeEl = document.querySelector('[data-composition-id="${cid}"] .joly-typewriter-value');
      if (typeEl) {
        const words = ${words};
        const state = { p: 0 };
        tl.fromTo('[data-composition-id="${cid}"] .joly-stack', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0);
        tl.to(state, {
          p: 1,
          duration: ${Math.max(1, dur - 0.6).toFixed(3)},
          ease: "none",
          onUpdate() {
            const list = words.length ? words : ["${escapeJs(scene.title || "Video")}"];
            const seg = 1 / list.length;
            const idx = Math.min(list.length - 1, Math.floor(state.p / seg));
            const local = Math.max(0, Math.min(1, (state.p - idx * seg) / seg));
            const word = String(list[idx] || "");
            const hold = local > 0.72 ? 1 : local / 0.72;
            typeEl.textContent = word.slice(0, Math.max(1, Math.round(word.length * hold)));
          },
        }, 0.35);
      }`;
  }

  if (comp === "joly-text-morphing" || comp === "joly-velocity-morph") {
    const words = JSON.stringify(getWords(scene).slice(0, 8));
    const fast = comp === "joly-velocity-morph";
    return `
      const morphEl = document.querySelector('[data-composition-id="${cid}"] .joly-morph-value');
      if (morphEl) {
        const words = ${words};
        const list = words.length ? words : ["${escapeJs(scene.title || "Video")}"];
        tl.fromTo('[data-composition-id="${cid}"] .joly-stack', { opacity: 0, scale: ${fast ? "0.92" : "0.98"} }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" }, 0);
        list.forEach((word, i) => {
          const at = 0.35 + i * ${fast ? "0.44" : "0.72"};
          if (at < ${Math.max(0.8, dur - 0.4).toFixed(3)}) {
            tl.call(() => { morphEl.textContent = String(word || ""); }, [], at);
            tl.fromTo(morphEl, { opacity: 0, y: ${fast ? "70" : "24"}, scale: ${fast ? "0.78" : "0.94"}, filter: "blur(${fast ? "18" : "10"}px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: ${fast ? "0.28" : "0.48"}, ease: "${fast ? "expo.out" : "power3.out"}" }, at);
          }
        });
      }`;
  }

  if (comp === "joly-glitch-text") {
    return `
      tl.fromTo('[data-composition-id="${cid}"] .joly-stack', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 0);
      tl.fromTo('[data-composition-id="${cid}"] .joly-glitch', { letterSpacing: "0.18em", filter: "blur(8px)" }, { letterSpacing: "0em", filter: "blur(0px)", duration: 0.7, ease: "power3.out" }, 0.12);`;
  }

  if (comp === "joly-highlight-text") {
    return `
      tl.fromTo('[data-composition-id="${cid}"] .joly-stack', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0);
      const marks = document.querySelectorAll('[data-composition-id="${cid}"] .joly-highlight-word');
      marks.forEach((m, i) => {
        tl.to(m, { color: "${escapeJs(scene.accentColor || "#8dd3ff")}", duration: 0.2 }, 0.45 + i * 0.22);
        tl.to(m, { "--dummy": 1, duration: 0.01, onStart() { m.classList.add("is-active"); } }, 0.45 + i * 0.22);
      });
      const style = document.createElement("style");
      style.textContent = '[data-composition-id="${cid}"] .joly-highlight-word.is-active::after{transform:scaleX(1);transition:transform .55s cubic-bezier(.2,.8,.2,1)}';
      document.head.appendChild(style);`;
  }

  if (comp === "joly-number-counter") {
    const target = parseNumber(scene.value ?? scene.number ?? extractFirstNumber(scene.title || scene.voiceText) ?? 100);
    const suffix = getNumberSuffix(scene.value ?? scene.number ?? scene.title);
    return `
      const numEl = document.querySelector('[data-composition-id="${cid}"] .joly-number-value');
      if (numEl) {
        const state = { v: 0 };
        tl.fromTo('[data-composition-id="${cid}"] .joly-stack', { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0);
        tl.fromTo(numEl, { scale: 0.72, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.8)" }, 0.18);
        tl.to(state, {
          v: ${target},
          duration: ${Math.min(2.2, Math.max(0.8, dur - 1)).toFixed(3)},
          ease: "power2.out",
          onUpdate() { numEl.textContent = Math.round(state.v).toLocaleString("en-US") + "${escapeJs(suffix)}"; },
          onComplete() { numEl.textContent = (${target}).toLocaleString("en-US") + "${escapeJs(suffix)}"; }
        }, 0.28);
      }`;
  }

  if (comp === "joly-bento-grid") {
    return `
      tl.fromTo('[data-composition-id="${cid}"] .joly-kicker, [data-composition-id="${cid}"] .joly-title', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.12, ease: "power3.out" }, 0);
      tl.fromTo('[data-composition-id="${cid}"] .joly-bento-item', { opacity: 0, y: 36, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.72, stagger: 0.14, ease: "power3.out" }, 0.42);`;
  }

  if (comp === "joly-code-block") {
    return `
      tl.fromTo('[data-composition-id="${cid}"] .joly-code', { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 0.65, ease: "power3.out" }, 0.05);
      const jolyCodeLines = document.querySelectorAll('[data-composition-id="${cid}"] .joly-code-line');
      jolyCodeLines.forEach((line, i) => {
        tl.to(line, { opacity: 1, x: 0, duration: 0.26, ease: "power2.out" }, 0.45 + i * 0.18);
      });`;
  }

  if (comp === "joly-phone-card") {
    return `
      tl.fromTo('[data-composition-id="${cid}"] .joly-phone', { opacity: 0, y: 70, rotate: -4, scale: 0.92 }, { opacity: 1, y: 0, rotate: 0, scale: 1, duration: 0.8, ease: "power3.out" }, 0.05);
      tl.fromTo('[data-composition-id="${cid}"] .joly-phone-overlay > *', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.42, stagger: 0.12, ease: "power3.out" }, 0.7);`;
  }

  if (comp === "joly-animated-beam") {
    return `
      tl.fromTo('[data-composition-id="${cid}"] .joly-beam-node', { opacity: 0, scale: 0.82, y: 28 }, { opacity: 1, scale: 1, y: 0, duration: 0.55, stagger: 0.16, ease: "back.out(1.4)" }, 0.08);
      tl.fromTo('[data-composition-id="${cid}"] .joly-beam-path', { opacity: 0, strokeDashoffset: 140 }, { opacity: 1, strokeDashoffset: 0, duration: 0.9, stagger: 0.12, ease: "power2.out" }, 0.55);`;
  }

  if (comp === "joly-image-comparison") {
    return `
      tl.fromTo('[data-composition-id="${cid}"] .joly-compare', { opacity: 0, y: 42 }, { opacity: 1, y: 0, duration: 0.65, ease: "power3.out" }, 0.05);
      tl.fromTo('[data-composition-id="${cid}"] .joly-compare-after', { clipPath: "inset(0 0 0 82%)" }, { clipPath: "inset(0 0 0 38%)", duration: ${Math.max(1.6, dur - 1.2).toFixed(3)}, ease: "sine.inOut" }, 0.6);
      tl.fromTo('[data-composition-id="${cid}"] .joly-compare-handle', { left: "82%" }, { left: "38%", duration: ${Math.max(1.6, dur - 1.2).toFixed(3)}, ease: "sine.inOut" }, 0.6);`;
  }

  if (comp === "joly-image-sphere") {
    return `
      tl.fromTo('[data-composition-id="${cid}"] .joly-sphere', { opacity: 0, scale: 0.82, rotateY: -26 }, { opacity: 1, scale: 1, rotateY: 0, duration: 0.75, ease: "power3.out" }, 0.05);
      tl.to('[data-composition-id="${cid}"] .joly-sphere', { rotateY: 360, duration: ${Math.max(3, dur).toFixed(3)}, ease: "none" }, 0.3);
      tl.fromTo('[data-composition-id="${cid}"] .joly-sphere-item', { opacity: 0 }, { opacity: 1, duration: 0.45, stagger: 0.07 }, 0.35);`;
  }

  return `
    tl.fromTo('[data-composition-id="${cid}"] .joly-stack', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, 0);`;
}

function buildTypewriterText(scene) {
  const words = getWords(scene);
  return textScene(scene, `
    <div class="joly-title joly-gradient-text joly-text-slot">
      <span class="joly-typewriter-value">${escapeHtml(words[0] || scene.title || "")}</span><span class="joly-cursor"></span>
    </div>
  `);
}

function buildTextMorphing(scene) {
  const words = getWords(scene);
  return textScene(scene, `
    <div class="joly-title joly-gradient-text joly-text-slot">
      <span class="joly-morph-value">${escapeHtml(words[0] || scene.title || "")}</span>
    </div>
  `);
}

function buildVelocityMorph(scene) {
  const words = getWords(scene);
  return textScene(scene, `
    <div class="joly-title joly-gradient-text joly-text-slot" style="font-size:92px; text-transform:uppercase;">
      <span class="joly-morph-value">${escapeHtml(words[0] || scene.title || "")}</span>
    </div>
  `);
}

function buildGlitchText(scene) {
  const text = scene.text || scene.title || "GLITCH";
  return textScene(scene, `
    <div class="joly-title joly-glitch" data-text="${escapeAttr(text)}">${escapeHtml(text)}</div>
  `);
}

function buildHighlightText(scene) {
  const text = scene.text || scene.title || "";
  const highlights = new Set((scene.highlightWords || scene.joly?.highlightWords || [])
    .map((w) => String(w).toLowerCase()));
  const parts = text.split(/(\s+)/);
  const html = parts.map((part) => {
    if (/^\s+$/.test(part)) return part;
    const key = part.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    const should = highlights.size ? highlights.has(key) : part.length >= 5;
    return should
      ? `<span class="joly-highlight-word">${escapeHtml(part)}</span>`
      : escapeHtml(part);
  }).join("");

  return textScene(scene, `<div class="joly-title">${html}</div>`);
}

function buildNumberCounter(scene) {
  const value = scene.value ?? scene.number ?? extractFirstNumber(scene.title || scene.voiceText) ?? "100";
  const suffix = getNumberSuffix(value);
  const target = parseNumber(value);
  return textScene(scene, `
    <div class="joly-title joly-gradient-text" style="font-size:154px;">
      <span class="joly-number-value">${target.toLocaleString("en-US")}${escapeHtml(suffix)}</span>
    </div>
  `);
}

function buildBentoGrid(scene) {
  const items = getItems(scene, [
    { title: "AI Core", value: "99.9%", label: "Do chinh xac", icon: "*" },
    { title: "Latency", value: "14ms", label: "Phan hoi nhanh", icon: ">" },
    { title: "Signals", value: "1.2M", label: "Diem du lieu", icon: "#" },
    { title: "Status", value: "Live", label: "Dang cap nhat", icon: "!" },
  ]).slice(0, 5);

  const cards = items.map((item, i) => `
    <div class="joly-card joly-bento-item ${i === 0 ? "large" : ""}">
      <div class="joly-bento-icon">${escapeHtml(item.icon || String(i + 1))}</div>
      <div>
        <div class="joly-bento-value">${escapeHtml(item.value || item.title || "")}</div>
        <div class="joly-bento-label">${escapeHtml(item.label || item.subtitle || "")}</div>
      </div>
    </div>
  `).join("");

  return baseCanvas(scene, `
    <div class="joly-stack" style="align-items:flex-start; text-align:left;">
      ${kicker(scene)}
      <div class="joly-title joly-gradient-text" style="font-size:56px;">${escapeHtml(scene.title || "Bento Grid")}</div>
      <div class="joly-bento">${cards}</div>
    </div>
  `);
}

function buildCodeBlock(scene) {
  const lines = getCodeLines(scene);
  return baseCanvas(scene, `
    <div class="joly-stack" style="align-items:stretch;">
      ${kicker(scene)}
      <div class="joly-code joly-card">
        <div class="joly-code-head">
          <div class="joly-code-dots">
            <span class="joly-code-dot" style="background:#ef4444"></span>
            <span class="joly-code-dot" style="background:#f59e0b"></span>
            <span class="joly-code-dot" style="background:#22c55e"></span>
          </div>
          <div style="font-size:18px;font-weight:900;color:rgba(255,255,255,0.62);">${escapeHtml(scene.language || scene.codeTitle || "analysis.log")}</div>
        </div>
        <div class="joly-code-body">
          ${lines.map((line) => `<div class="joly-code-line ${escapeAttr(line.type || "")}">${escapeHtml(line.text || line)}</div>`).join("")}
        </div>
      </div>
    </div>
  `);
}

function buildPhoneCard(scene) {
  const phone = scene.phone || scene.joly?.phone || {};
  const image = phone.imageUrl || scene.imageUrl || firstImage(scene) || FALLBACK_IMAGE;
  return baseCanvas(scene, `
    <div class="joly-stack" style="display:grid; grid-template-columns: 440px 1fr; gap:54px; align-items:center; text-align:left;">
      <div class="joly-phone">
        <div class="joly-phone-screen">
          <div class="joly-phone-notch"></div>
          <img class="joly-phone-media" src="${escapeAttr(image)}" />
          <div class="joly-phone-overlay">
            <div class="joly-kicker" style="font-size:14px;">${escapeHtml(phone.badge || scene.label || "Preview")}</div>
            <div style="margin-top:14px;font-size:32px;line-height:1.1;font-weight:900;color:#fff;">${escapeHtml(phone.title || scene.title || "")}</div>
            <div style="margin-top:10px;font-size:18px;line-height:1.35;font-weight:750;color:rgba(255,255,255,0.72);">${escapeHtml(phone.subtitle || scene.subtext || "")}</div>
          </div>
        </div>
      </div>
      <div>
        ${kicker(scene)}
        <div class="joly-title joly-gradient-text" style="font-size:60px;margin-top:22px;">${escapeHtml(scene.title || "")}</div>
        <div class="joly-subtitle" style="margin-top:22px;">${escapeHtml(scene.subtext || scene.voiceText || "")}</div>
      </div>
    </div>
  `);
}

function buildAnimatedBeam(scene) {
  const nodes = getBeamNodes(scene);
  const paths = buildBeamPaths(nodes, scene.id);
  return baseCanvas(scene, `
    <div class="joly-stack">
      ${kicker(scene)}
      <div class="joly-title joly-gradient-text" style="font-size:54px;">${escapeHtml(scene.title || "Flow")}</div>
      <div class="joly-beam-wrap">
        <svg class="joly-beam-svg" viewBox="0 0 900 640">
          <defs>
            <linearGradient id="joly-beam-grad-${scene.id}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="${escapeAttr(scene.accentColor || "#8dd3ff")}" />
              <stop offset="55%" stop-color="#ffffff" />
              <stop offset="100%" stop-color="#fbbf24" />
            </linearGradient>
          </defs>
          ${paths}
        </svg>
        ${nodes.map((node) => `
          <div class="joly-card joly-beam-node" style="left:${node.x - 83}px;top:${node.y - 58}px;">
            <div class="icon">${escapeHtml(node.icon || "*")}</div>
            <div class="label">${escapeHtml(node.label || "")}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `);
}

function buildImageComparison(scene) {
  const before = scene.beforeImage || scene.before?.imageUrl || firstImage(scene) || FALLBACK_IMAGE;
  const after = scene.afterImage || scene.after?.imageUrl || secondImage(scene) || FALLBACK_IMAGE;
  return baseCanvas(scene, `
    <div class="joly-stack">
      ${kicker(scene)}
      <div class="joly-title joly-gradient-text" style="font-size:52px;">${escapeHtml(scene.title || "Before / After")}</div>
      <div class="joly-card joly-compare">
        <img src="${escapeAttr(before)}" />
        <img class="joly-compare-after" src="${escapeAttr(after)}" />
        <div class="joly-compare-handle"></div>
        <div class="joly-label-row">
          <div class="joly-mini-label">${escapeHtml(scene.before?.label || scene.badLabel || "Before")}</div>
          <div class="joly-mini-label">${escapeHtml(scene.after?.label || scene.goodLabel || "After")}</div>
        </div>
      </div>
    </div>
  `);
}

function buildImageSphere(scene) {
  const images = getSphereImages(scene);
  const count = images.length;
  return baseCanvas(scene, `
    <div class="joly-stack">
      ${kicker(scene)}
      <div class="joly-title joly-gradient-text" style="font-size:52px;">${escapeHtml(scene.title || "Image Sphere")}</div>
      <div class="joly-sphere">
        ${images.map((img, i) => {
          const angle = (360 / count) * i;
          const y = i % 2 === 0 ? -78 : 78;
          return `<div class="joly-sphere-item" style="transform: rotateY(${angle}deg) translateZ(330px) translateY(${y}px);">
            <img src="${escapeAttr(img)}" />
          </div>`;
        }).join("")}
      </div>
    </div>
  `);
}

function textScene(scene, inner) {
  return baseCanvas(scene, `
    <div class="joly-stack">
      ${kicker(scene)}
      ${inner}
      <div class="joly-subtitle">${escapeHtml(scene.subtext || "")}</div>
    </div>
  `);
}

function baseCanvas(scene, inner) {
  return `
    <div class="joly-canvas">
      <div class="joly-bg-grid"></div>
      ${inner}
    </div>`;
}

function kicker(scene) {
  const label = scene.label || scene.kicker || scene.joly?.label || "";
  return label ? `<div class="joly-kicker">${escapeHtml(label)}</div>` : "";
}

function getWords(scene) {
  const raw = scene.words || scene.joly?.words || scene.texts || null;
  if (Array.isArray(raw) && raw.length) return raw.map((w) => String(w));
  const title = String(scene.text || scene.title || "").trim();
  if (!title) return ["Video"];
  if (title.includes("|")) return title.split("|").map((s) => s.trim()).filter(Boolean);
  return title.split(/\s+/).length > 4 ? splitTitlePhrases(title) : [title];
}

function splitTitlePhrases(title) {
  const words = title.split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < words.length; i += 2) out.push(words.slice(i, i + 2).join(" "));
  return out.slice(0, 6);
}

function getItems(scene, fallback) {
  const raw = scene.items || scene.cards || scene.statsCards || scene.joly?.items;
  return Array.isArray(raw) && raw.length ? raw : fallback;
}

function getCodeLines(scene) {
  const raw = scene.codeLines || scene.terminalLines || scene.joly?.codeLines;
  if (Array.isArray(raw) && raw.length) {
    return raw.slice(0, 10).map((line) => typeof line === "string" ? { text: line } : line);
  }
  const code = String(scene.code || scene.joly?.code || "").trim();
  if (code) return code.split(/\r?\n/).slice(0, 10).map((text) => ({ text }));
  return [
    { type: "prompt", text: "$ analyze --topic video" },
    { type: "ok", text: "signal: strong hook detected" },
    { type: "warn", text: "risk: viewers drop after 3s" },
    { type: "ok", text: "action: add visual proof" },
  ];
}

function getBeamNodes(scene) {
  const raw = scene.nodes || scene.steps || scene.joly?.nodes;
  const fallback = [
    { label: "Input", icon: "IN" },
    { label: "Model", icon: "AI" },
    { label: "Check", icon: "OK" },
    { label: "Video", icon: "MP4" },
  ];
  const nodes = (Array.isArray(raw) && raw.length ? raw : fallback).slice(0, 6);
  const presets = [
    [120, 320],
    [340, 160],
    [340, 480],
    [580, 320],
    [780, 190],
    [780, 450],
  ];
  return nodes.map((node, i) => ({
    ...node,
    label: node.label || node.title || node.desc || `Node ${i + 1}`,
    x: Number.isFinite(node.x) ? node.x : presets[i][0],
    y: Number.isFinite(node.y) ? node.y : presets[i][1],
  }));
}

function buildBeamPaths(nodes) {
  const pairs = [];
  for (let i = 0; i < nodes.length - 1; i++) pairs.push([nodes[i], nodes[i + 1]]);
  return pairs.map(([a, b]) => {
    const mx = (a.x + b.x) / 2;
    const curve = Math.abs(a.y - b.y) > 100 ? 72 : -44;
    return `<path class="joly-beam-path" d="M ${a.x} ${a.y} C ${mx} ${a.y + curve}, ${mx} ${b.y - curve}, ${b.x} ${b.y}" />`;
  }).join("");
}

function getSphereImages(scene) {
  const raw = scene.images || scene.joly?.images || [];
  const fromRaw = Array.isArray(raw) ? raw.map((x) => typeof x === "string" ? x : x.imageUrl).filter(Boolean) : [];
  const fromVisuals = visualImages(scene);
  const list = [...fromRaw, ...fromVisuals];
  const fallback = [
    FALLBACK_IMAGE,
    FALLBACK_IMAGE,
    FALLBACK_IMAGE,
    FALLBACK_IMAGE,
    FALLBACK_IMAGE,
    FALLBACK_IMAGE,
  ];
  return (list.length ? list : fallback).slice(0, 8);
}

function firstImage(scene) {
  return visualImages(scene)[0] || "";
}

function secondImage(scene) {
  return visualImages(scene)[1] || "";
}

function visualImages(scene) {
  const visuals = Array.isArray(scene.visuals) ? scene.visuals : (scene.visuals ? [scene.visuals] : []);
  return visuals.map((v) => v?.imageUrl).filter(Boolean);
}

function parseNumber(value) {
  const raw = String(value ?? "").replace(/,/g, "");
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 100;
  const base = Number(match[0]);
  if (!Number.isFinite(base)) return 100;
  if (/[kK]/.test(raw)) return Math.round(base * 1000);
  if (/[mM]/.test(raw)) return Math.round(base * 1000000);
  if (/[bB]/.test(raw)) return Math.round(base * 1000000000);
  return Math.round(base);
}

function getNumberSuffix(value) {
  const raw = String(value ?? "");
  const match = raw.match(/(?:\d+(?:\.\d+)?)([kKmMbB%+]+)?/);
  return match?.[1] || "";
}

function extractFirstNumber(text) {
  const match = String(text || "").match(/\d[\d,.]*(?:[kKmMbB%+]+)?/);
  return match ? match[0] : null;
}

function hexToRgba(hex, alpha) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(hex || "") ? hex : "#8dd3ff";
  const h = safe.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

function escapeJs(str) {
  return String(str ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}
