/**
 * Visual Generator - Tạo HTML/CSS cho các hiệu ứng hình ảnh động
 * Dùng để minh họa nội dung scene thêm sinh động và trực quan
 */

import { config } from "../config.js";

const { width, height } = config.hyperframes;

export function generateVisualsHTML(scene) {
    if (!scene.visuals) return '';

    const { id } = scene;
    const baseCid = `scene-${id}`;

    // Back-compat: allow a single visuals object OR an array of layered visuals
    const visualsList = Array.isArray(scene.visuals) ? scene.visuals : [scene.visuals];
    return visualsList
        .map((visuals, idx) => generateSingleVisualHTML(visuals, `${baseCid}-v${idx + 1}`))
        .filter(Boolean)
        .join('\n');
}

function generateSingleVisualHTML(visuals, cid) {
    if (!visuals || typeof visuals !== 'object') return '';

    switch (visuals.type) {
        case 'football-pitch-lines':
            return generateFootballPitchLinesHTML(visuals, cid);
        case 'football-ball-motion':
            return generateFootballBallMotionHTML(visuals, cid);
        case 'football-scorebug':
            return generateFootballScorebugHTML(visuals, cid);
        case 'football-stat-bars':
        case 'football-stat-radar':
            return generateFootballStatsHTML(visuals, cid);
        case 'football-confetti':
            return generateFootballConfettiHTML(visuals, cid);
        case 'channel-watermark':
            return generateChannelWatermarkHTML(visuals, cid);
        case 'image':
            return generateImageHTML(visuals, cid);
        case 'animation':
            return generateAnimationHTML(visuals, cid);
        case 'diagram':
            return generateDiagramHTML(visuals, cid);
        case 'motion':
            return generateMotionHTML(visuals, cid);
        default:
            return '';
    }
}

function footballZIndex(visuals, fallback = 0) {
    return visuals.position === 'foreground' ? 3 : fallback;
}

function footballPalette(visuals) {
    return {
        grass: visuals.grassColor || '#137A3A',
        darkGrass: visuals.darkGrassColor || '#0F5E30',
        line: visuals.lineColor || 'rgba(255,255,255,0.72)',
        accent: visuals.accentColor || '#F7C948',
        navy: visuals.navyColor || '#08111F',
        red: visuals.redColor || '#EF4444',
    };
}

function generateFootballPitchLinesHTML(visuals, cid) {
    const p = footballPalette(visuals);
    const opacity = visuals.opacity ?? 0.46;
    const zIndex = footballZIndex(visuals, 0);
    const scanDuration = visuals.duration || 8;
    return `
    <style>
      @keyframes football-pitch-scan-${cid} {
        0% { transform: translate3d(0, -22px, 0) scale(1.02); }
        50% { transform: translate3d(0, 18px, 0) scale(1.055); }
        100% { transform: translate3d(0, -22px, 0) scale(1.02); }
      }
      .football-pitch-${cid} {
        animation: football-pitch-scan-${cid} ${scanDuration}s ease-in-out infinite;
        transform-origin: 50% 50%;
      }
    </style>
    <div class="football-pitch-lines football-pitch-${cid}" data-layout-allow-overflow style="
      position:absolute;
      inset:-70px -44px;
      z-index:${zIndex};
      opacity:${opacity};
      pointer-events:none;
      overflow:hidden;
      background:
        linear-gradient(90deg, ${p.grass} 0 12.5%, ${p.darkGrass} 12.5% 25%, ${p.grass} 25% 37.5%, ${p.darkGrass} 37.5% 50%, ${p.grass} 50% 62.5%, ${p.darkGrass} 62.5% 75%, ${p.grass} 75% 87.5%, ${p.darkGrass} 87.5% 100%);
    ">
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute; inset:0;">
        <defs>
          <filter id="football-line-glow-${cid}">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x="92" y="112" width="${width - 184}" height="${height - 224}" rx="34" fill="none" stroke="${p.line}" stroke-width="8" filter="url(#football-line-glow-${cid})"/>
        <line x1="92" y1="${height / 2}" x2="${width - 92}" y2="${height / 2}" stroke="${p.line}" stroke-width="7"/>
        <circle cx="${width / 2}" cy="${height / 2}" r="164" fill="none" stroke="${p.line}" stroke-width="7"/>
        <circle cx="${width / 2}" cy="${height / 2}" r="12" fill="${p.line}"/>
        <rect x="250" y="112" width="${width - 500}" height="250" rx="20" fill="none" stroke="${p.line}" stroke-width="7"/>
        <rect x="358" y="112" width="${width - 716}" height="104" rx="14" fill="none" stroke="${p.line}" stroke-width="6"/>
        <rect x="250" y="${height - 362}" width="${width - 500}" height="250" rx="20" fill="none" stroke="${p.line}" stroke-width="7"/>
        <rect x="358" y="${height - 216}" width="${width - 716}" height="104" rx="14" fill="none" stroke="${p.line}" stroke-width="6"/>
        <path d="M ${width / 2 - 90} 362 A 118 118 0 0 0 ${width / 2 + 90} 362" fill="none" stroke="${p.line}" stroke-width="6"/>
        <path d="M ${width / 2 - 90} ${height - 362} A 118 118 0 0 1 ${width / 2 + 90} ${height - 362}" fill="none" stroke="${p.line}" stroke-width="6"/>
      </svg>
      <div style="position:absolute; inset:0; background:radial-gradient(circle at 50% 48%, rgba(247,201,72,0.18), transparent 42%), linear-gradient(180deg, rgba(8,17,31,0.12), rgba(8,17,31,0.62));"></div>
    </div>`;
}

function generateFootballBallMotionHTML(visuals, cid) {
    const size = Number.isFinite(visuals.size) ? visuals.size : 112;
    const duration = visuals.duration || 3.4;
    const zIndex = footballZIndex(visuals, 2);
    const top = visuals.top || '58%';
    const fromX = visuals.fromX || '-18vw';
    const toX = visuals.toX || '112vw';
    const arc = visuals.arc || '-90px';
    return `
    <style>
      @keyframes football-ball-flight-${cid} {
        0% { transform: translate(${fromX}, 0) rotate(0deg) scale(0.92); opacity:0; }
        12% { opacity:1; }
        52% { transform: translate(50vw, ${arc}) rotate(520deg) scale(1.02); opacity:1; }
        92% { opacity:1; }
        100% { transform: translate(${toX}, 34px) rotate(1040deg) scale(0.96); opacity:0; }
      }
      .football-ball-${cid} {
        animation: football-ball-flight-${cid} ${duration}s cubic-bezier(.18,.72,.22,1) infinite;
      }
    </style>
    <div class="football-ball-${cid}" data-layout-allow-overflow style="
      position:absolute;
      left:0;
      top:${top};
      z-index:${zIndex};
      width:${size}px;
      height:${size}px;
      border-radius:999px;
      pointer-events:none;
      filter:drop-shadow(0 26px 24px rgba(0,0,0,0.42));
      background:
        radial-gradient(circle at 50% 50%, #111 0 14%, transparent 15%),
        conic-gradient(from 18deg, #111 0 10%, #f8fafc 10% 20%, #111 20% 30%, #f8fafc 30% 42%, #111 42% 54%, #f8fafc 54% 66%, #111 66% 78%, #f8fafc 78% 100%);
      border:5px solid rgba(255,255,255,0.9);
      box-shadow:inset -18px -20px 28px rgba(0,0,0,0.20), inset 16px 12px 20px rgba(255,255,255,0.62);
    "></div>`;
}

function generateFootballScorebugHTML(visuals, cid) {
    const p = footballPalette(visuals);
    const teams = Array.isArray(visuals.teams) && visuals.teams.length >= 2 ? visuals.teams : ['HOME', 'AWAY'];
    const score = Array.isArray(visuals.score) && visuals.score.length >= 2 ? visuals.score : [0, 0];
    const minute = visuals.minute || "00'";
    const label = visuals.label || visuals.competitionLabel || 'MATCH UPDATE';
    const zIndex = footballZIndex(visuals, 3);
    const top = visuals.top || '54px';
    return `
    <div class="football-scorebug" style="
      position:absolute;
      top:${top};
      left:50%;
      transform:translateX(-50%);
      z-index:${zIndex};
      display:flex;
      align-items:center;
      gap:0;
      height:76px;
      pointer-events:none;
      filter:drop-shadow(0 18px 28px rgba(0,0,0,0.38));
      font-family:'Inter', sans-serif;
    ">
      <div style="height:100%; padding:0 22px; display:flex; align-items:center; background:${p.navy}; border:1px solid rgba(255,255,255,0.16); border-radius:22px 0 0 22px; color:#fff; font-size:24px; font-weight:900; letter-spacing:0.04em;">${escapeHtmlForVisuals(teams[0])}</div>
      <div style="height:100%; min-width:144px; padding:0 24px; display:flex; align-items:center; justify-content:center; background:${p.accent}; color:#08111F; font-size:42px; font-weight:950; letter-spacing:0.02em;">${escapeHtmlForVisuals(String(score[0]))} - ${escapeHtmlForVisuals(String(score[1]))}</div>
      <div style="height:100%; padding:0 22px; display:flex; align-items:center; background:${p.navy}; border:1px solid rgba(255,255,255,0.16); border-radius:0 22px 22px 0; color:#fff; font-size:24px; font-weight:900; letter-spacing:0.04em;">${escapeHtmlForVisuals(teams[1])}</div>
      <div style="position:absolute; left:50%; top:86px; transform:translateX(-50%); padding:8px 16px; border-radius:999px; background:rgba(8,17,31,0.78); color:rgba(255,255,255,0.82); border:1px solid rgba(255,255,255,0.16); font-size:16px; font-weight:900; letter-spacing:0.12em; white-space:nowrap;">${escapeHtmlForVisuals(label)} • ${escapeHtmlForVisuals(minute)}</div>
    </div>`;
}

function generateFootballStatsHTML(visuals, cid) {
    const p = footballPalette(visuals);
    const stats = Array.isArray(visuals.stats) && visuals.stats.length
        ? visuals.stats
        : [
            { label: 'Possession', home: 54, away: 46, unit: '%' },
            { label: 'Shots', home: 12, away: 8, unit: '' },
            { label: 'xG', home: 1.8, away: 0.9, unit: '' },
        ];
    const zIndex = footballZIndex(visuals, 2);
    const bottom = visuals.bottom || '178px';
    return `
    <style>
      @keyframes football-stat-fill-in-${cid} {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }
      @keyframes football-stat-row-in-${cid} {
        from { opacity:0; transform: translate3d(0, 8px, 0); }
        to { opacity:1; transform: translate3d(0, 0, 0); }
      }
      .football-stat-bars-${cid} .football-stat-row {
        opacity: 0;
        animation: football-stat-row-in-${cid} 520ms cubic-bezier(.2,.8,.2,1) forwards;
        animation-delay: var(--delay, 0s);
        will-change: transform, opacity;
      }
      .football-stat-bars-${cid} .football-stat-track {
        height:16px;
        border-radius:999px;
        background:rgba(255,255,255,0.12);
        overflow:hidden;
      }
      .football-stat-bars-${cid} .football-stat-fill {
        height:100%;
        width: calc(var(--pct, 50) * 1%);
        border-radius:999px;
        transform: scaleX(0);
        animation: football-stat-fill-in-${cid} 900ms cubic-bezier(.2,.8,.2,1) forwards;
        animation-delay: calc(var(--delay, 0s) + 90ms);
        will-change: transform;
      }
      .football-stat-bars-${cid} .football-stat-fill.home {
        transform-origin: 100% 50%;
        margin-left: auto;
        background: ${p.accent};
      }
      .football-stat-bars-${cid} .football-stat-fill.away {
        transform-origin: 0% 50%;
        background: #ffffff;
      }
    </style>

    <div class="football-stat-bars football-stat-bars-${cid}" style="
      position:absolute;
      left:70px;
      right:70px;
      bottom:${bottom};
      z-index:${zIndex};
      display:flex;
      flex-direction:column;
      gap:14px;
      padding:24px 26px;
      border-radius:28px;
      background:rgba(8,17,31,0.78);
      border:1px solid rgba(255,255,255,0.14);
      backdrop-filter:blur(10px);
      pointer-events:none;
      font-family:'Inter', sans-serif;
    ">
      ${stats.slice(0, 5).map((stat, idx) => {
        const home = Number(stat.home ?? stat.left ?? 50);
        const away = Number(stat.away ?? stat.right ?? Math.max(0, 100 - home));
        const total = Math.max(1, Math.abs(home) + Math.abs(away));
        const homePct = Math.max(8, Math.min(92, (Math.abs(home) / total) * 100));
        const awayPct = Math.max(8, Math.min(92, (Math.abs(away) / total) * 100));
        return `
        <div class="football-stat-row" style="--delay:${(idx * 0.12).toFixed(2)}s; display:grid; grid-template-columns:92px 1fr 184px 1fr 92px; align-items:center; gap:12px; color:#fff;">
          <div style="font-size:24px; font-weight:950; text-align:right;">${escapeHtmlForVisuals(String(home))}${escapeHtmlForVisuals(stat.unit || '')}</div>
          <div class="football-stat-track"><div class="football-stat-fill home" style="--pct:${homePct.toFixed(2)};"></div></div>
          <div style="font-size:18px; font-weight:900; color:rgba(255,255,255,0.72); text-align:center; text-transform:uppercase; letter-spacing:0.08em;">${escapeHtmlForVisuals(stat.label || '')}</div>
          <div class="football-stat-track"><div class="football-stat-fill away" style="--pct:${awayPct.toFixed(2)};"></div></div>
          <div style="font-size:24px; font-weight:950;">${escapeHtmlForVisuals(String(away))}${escapeHtmlForVisuals(stat.unit || '')}</div>
        </div>`;
      }).join('')}
    </div>`;
}

function generateFootballConfettiHTML(visuals, cid) {
    const zIndex = footballZIndex(visuals, 2);
    const particleCount = visuals.particleCount || 90;
    const colors = JSON.stringify(visuals.colors || ['#F7C948', '#ffffff', '#137A3A', '#EF4444']);
    const duration = visuals.duration || 4.8;
    return `
    <canvas id="football-confetti-${cid}" style="position:absolute; inset:0; z-index:${zIndex}; pointer-events:none;"></canvas>
    <script>
      (function() {
        const canvas = document.getElementById('football-confetti-${cid}');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = ${width};
        canvas.height = ${height};
        const colors = ${colors};
        let seed = ${Array.from(cid).reduce((acc, ch) => acc + ch.charCodeAt(0), 1729)};
        function rand() {
          seed |= 0;
          seed = seed + 0x6D2B79F5 | 0;
          let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
          t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
        const pieces = [];
        for (let i = 0; i < ${particleCount}; i++) {
          pieces.push({
            x: rand() * canvas.width,
            y: -80 - rand() * canvas.height * 0.42,
            w: 8 + rand() * 12,
            h: 12 + rand() * 18,
            color: colors[Math.floor(rand() * colors.length)],
            vx: -1.2 + rand() * 2.4,
            vy: 2.2 + rand() * 4.2,
            rot: rand() * Math.PI,
            vr: -0.09 + rand() * 0.18,
            alpha: 0.68 + rand() * 0.32
          });
        }
        let start = null;
        function animate(ts) {
          if (start === null) start = ts;
          const elapsed = (ts - start) / 1000;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          pieces.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            if (p.y > canvas.height + 80) {
              p.y = -80;
              p.x = rand() * canvas.width;
            }
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha * (1 - Math.max(0, elapsed - ${duration - 1.2}) / 1.2));
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
          });
          if (elapsed < ${duration}) requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
      })();
    </script>`;
}

function generateChannelWatermarkHTML(visuals, cid) {
    const logoSrc = visuals.logoSrc || visuals.imageUrl || 'assets/logos/logo.png';
    const username = visuals.username || visuals.handle || '@username';
    const opacity = visuals.opacity ?? 0.6;
    const zIndex = visuals.zIndex || 4;
    const top = visuals.top || '52px';
    const right = visuals.right || '42px';
    const logoSize = Number.isFinite(visuals.logoSize) ? visuals.logoSize : 74;
    const fontSize = Number.isFinite(visuals.fontSize) ? visuals.fontSize : 24;
    const boxWidth = Number.isFinite(visuals.width) ? visuals.width : Math.max(logoSize + 36, 138);
    const usernameMinWidth = Number.isFinite(visuals.usernameMinWidth) ? visuals.usernameMinWidth : Math.max(boxWidth - 34, 0);
    const accent = visuals.accentColor || '#F7C948';

    return `
    <style>
      @keyframes channel-watermark-in-${cid} {
        from { opacity: 0; transform: translate3d(10px, -8px, 0) scale(0.96); }
        to { opacity: ${opacity}; transform: translate3d(0, 0, 0) scale(1); }
      }
      .channel-watermark-${cid} {
        animation: channel-watermark-in-${cid} 420ms cubic-bezier(.2,.8,.2,1) both;
      }
    </style>
    <div class="channel-watermark channel-watermark-${cid}" style="
      position:absolute;
      top:${top};
      right:${right};
      z-index:${zIndex};
      opacity:${opacity};
      pointer-events:none;
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:8px;
      width:${boxWidth}px;
      padding:12px 12px 10px;
      border-radius:22px;
      background:linear-gradient(180deg, rgba(8,17,31,0.58), rgba(8,17,31,0.34));
      border:1px solid rgba(255,255,255,0.18);
      box-shadow:0 14px 34px rgba(0,0,0,0.30), 0 0 0 1px rgba(247,201,72,0.10) inset;
      backdrop-filter:blur(10px);
      font-family:'Inter', sans-serif;
    ">
      <div style="
        width:${logoSize}px;
        height:${logoSize}px;
        border-radius:999px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(255,255,255,0.92);
        border:2px solid ${accent};
        box-shadow:0 8px 18px rgba(0,0,0,0.25), 0 0 18px rgba(247,201,72,0.28);
        overflow:hidden;
      ">
        <img src="${escapeHtmlForVisuals(logoSrc)}" alt="" style="
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        " />
      </div>
      <div style="
        max-width:100%;
        min-width:${usernameMinWidth}px;
        padding:5px 10px 6px;
        border-radius:999px;
        background:rgba(247,201,72,0.92);
        color:#08111F;
        font-size:${fontSize}px;
        line-height:1;
        font-weight:950;
        white-space:nowrap;
        text-align:center;
        letter-spacing:0;
        text-shadow:none;
        box-shadow:0 8px 16px rgba(0,0,0,0.20);
      ">${escapeHtmlForVisuals(username)}</div>
    </div>`;
}

function generateImageHTML(visuals, cid) {
    const imageUrl = visuals.imageUrl || `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/${width}/${height}`;
    const opacity = visuals.opacity || 0.4;
    // Ensure background visuals never cover text/content.
    // - background: behind canvas content
    // - foreground: above content
    // Scene base layers use z-index 0/1 for background. Using -1 makes visuals
    // fall behind the scene background and disappear in preview/render.
    const zIndex = visuals.position === 'foreground' ? 3 : 0;

    const motionType = visuals.motionType || null;
    const motionDuration = Number.isFinite(visuals.motionDuration) ? visuals.motionDuration : 6;
    const scaleFrom = Number.isFinite(visuals.motionScaleFrom) ? visuals.motionScaleFrom : 1.02;
    const scaleTo = Number.isFinite(visuals.motionScaleTo) ? visuals.motionScaleTo : 1.1;
    const translateFrom = (visuals.motionTranslateFrom || "0px, 0px").split(",").map((s) => s.trim());
    const translateTo = (visuals.motionTranslateTo || "-14px, -10px").split(",").map((s) => s.trim());
    const txFrom = translateFrom[0] || "0px";
    const tyFrom = translateFrom[1] || "0px";
    const txTo = translateTo[0] || "-14px";
    const tyTo = translateTo[1] || "-10px";

    const imgClass = motionType ? `visual-image-img motion-${cid}` : `visual-image-img`;
    const motionCss = motionType === 'ken-burns'
        ? `
      @keyframes kenburns-${cid} {
        0% { transform: translate(${txFrom}, ${tyFrom}) scale(${scaleFrom}); }
        100% { transform: translate(${txTo}, ${tyTo}) scale(${scaleTo}); }
      }
      .motion-${cid} {
        will-change: transform;
        transform-origin: 50% 40%;
        animation: kenburns-${cid} ${motionDuration}s ease-in-out infinite alternate;
      }
    `
        : '';

    return `
    ${motionCss ? `<style>${motionCss}</style>` : ''}
    <div class="visual-image" style="
      position: absolute;
      inset: 0;
      z-index: ${zIndex};
      opacity: ${opacity};
      pointer-events: none;
      overflow: hidden;
    ">
      <img src="${imageUrl}" 
           class="${imgClass}"
           style="width: 100%; height: 100%; object-fit: cover;"
           loading="lazy" />
      <div style="
        position: absolute;
        inset: 0;
        background: ${visuals.overlayColor || 'linear-gradient(0deg, rgba(0,0,0,0.6), rgba(0,0,0,0.2))'};
      "></div>
    </div>
  `;
}

function generateAnimationHTML(visuals, cid) {
    const animations = {
        'floating-particles': `
      <canvas id="particles-${cid}" style="position:absolute; inset:0; z-index:${visuals.position === 'foreground' ? 3 : 0};"></canvas>
      <script>
        (function() {
          const canvas = document.getElementById('particles-${cid}');
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          canvas.width = ${width};
          canvas.height = ${height};
          
          const particles = [];
          const colors = ${JSON.stringify(visuals.colors || ['#7c3aed', '#2dd4bf', '#f59e0b'])};
          const particleCount = ${visuals.particleCount || 50};
          
          for(let i = 0; i < particleCount; i++) {
            particles.push({
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              radius: Math.random() * 5 + 2,
              color: colors[Math.floor(Math.random() * colors.length)],
              velocityX: (Math.random() - 0.5) * 0.8,
              velocityY: (Math.random() - 0.5) * 0.5,
              alpha: Math.random() * 0.5 + 0.3
            });
          }
          
          function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
              p.x += p.velocityX;
              p.y += p.velocityY;
              if(p.x < -50) p.x = canvas.width + 50;
              if(p.x > canvas.width + 50) p.x = -50;
              if(p.y < -50) p.y = canvas.height + 50;
              if(p.y > canvas.height + 50) p.y = -50;
              
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.globalAlpha = p.alpha;
              ctx.fill();
            });
            requestAnimationFrame(animate);
          }
          animate();
        })();
      </script>
    `,

        'wave-lines': `
      <svg style="position:absolute; bottom:0; left:0; width:100%; height:100%; z-index:${visuals.position === 'foreground' ? 3 : 0}; opacity:${visuals.opacity || 0.6};">
        <defs>
          <linearGradient id="waveGrad-${cid}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${visuals.colors?.[0] || '#7c3aed'}" />
            <stop offset="50%" style="stop-color:${visuals.colors?.[1] || '#2dd4bf'}" />
            <stop offset="100%" style="stop-color:${visuals.colors?.[2] || '#f59e0b'}" />
          </linearGradient>
        </defs>
        <path d="M0,100 Q100,50 200,100 T400,100 T600,100 T800,100 T1000,100 T1200,100" 
              fill="none" stroke="url(#waveGrad-${cid})" stroke-width="4" opacity="0.8">
          <animate attributeName="d" 
            values="M0,100 Q100,50 200,100 T400,100 T600,100 T800,100 T1000,100 T1200,100;
                    M0,100 Q100,150 200,100 T400,100 T600,100 T800,100 T1000,100 T1200,100;
                    M0,100 Q100,50 200,100 T400,100 T600,100 T800,100 T1000,100 T1200,100"
            dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M0,80 Q100,130 200,80 T400,80 T600,80 T800,80 T1000,80 T1200,80" 
              fill="none" stroke="url(#waveGrad-${cid})" stroke-width="2" opacity="0.4">
          <animate attributeName="d" 
            values="M0,80 Q100,130 200,80 T400,80 T600,80 T800,80 T1000,80 T1200,80;
                    M0,80 Q100,30 200,80 T400,80 T600,80 T800,80 T1000,80 T1200,80;
                    M0,80 Q100,130 200,80 T400,80 T600,80 T800,80 T1000,80 T1200,80"
            dur="4s" repeatCount="indefinite" />
        </path>
      </svg>
    `,

        'glow-orbits': `
      <style>
        @keyframes orbit-${cid} {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-reverse-${cid} {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .orbit-ring-${cid} {
          position: absolute;
          border-radius: 50%;
          border: 2px solid ${visuals.colors?.[0] || '#7c3aed'};
          opacity: ${visuals.opacity || 0.3};
          pointer-events: none;
        }
        .orbit-ring-${cid}:nth-child(1) {
          width: 300px;
          height: 300px;
          top: 20%;
          left: -100px;
          animation: orbit-${cid} ${visuals.duration || 12}s linear infinite;
          border-color: ${visuals.colors?.[0] || '#7c3aed'};
        }
        .orbit-ring-${cid}:nth-child(2) {
          width: 500px;
          height: 500px;
          bottom: -200px;
          right: -200px;
          animation: orbit-reverse-${cid} ${(visuals.duration || 12) + 3}s linear infinite;
          border-color: ${visuals.colors?.[1] || '#2dd4bf'};
        }
        .orbit-ring-${cid}:nth-child(3) {
          width: 400px;
          height: 400px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: orbit-${cid} ${(visuals.duration || 12) + 6}s linear infinite;
          border-color: ${visuals.colors?.[2] || '#f59e0b'};
        }
      </style>
      <div class="orbit-ring-${cid}"></div>
      <div class="orbit-ring-${cid}"></div>
      <div class="orbit-ring-${cid}"></div>
    `,

        'fireflies': `
      <canvas id="fireflies-${cid}" style="position:absolute; inset:0; z-index:${visuals.position === 'foreground' ? 3 : 1};"></canvas>
      <script>
        (function() {
          const canvas = document.getElementById('fireflies-${cid}');
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          canvas.width = ${width};
          canvas.height = ${height};
          
          const fireflies = [];
          const colors = ${JSON.stringify(visuals.colors || ['#fef08a', '#fde047', '#eab308'])};
          
          for(let i = 0; i < 30; i++) {
            fireflies.push({
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              radius: Math.random() * 3 + 1,
              color: colors[Math.floor(Math.random() * colors.length)],
              angle: Math.random() * Math.PI * 2,
              speed: Math.random() * 0.02 + 0.01,
              amplitude: Math.random() * 50 + 20,
              glow: Math.random() * 0.5 + 0.3
            });
          }
          
          let time = 0;
          function animate() {
            time += 0.05;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            fireflies.forEach(f => {
              f.x += Math.sin(time * f.speed) * 0.5;
              f.y += Math.cos(time * f.speed * 0.7) * 0.5;
              f.x = Math.min(Math.max(f.x, 0), canvas.width);
              f.y = Math.min(Math.max(f.y, 0), canvas.height);
              
              ctx.beginPath();
              ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
              ctx.fillStyle = f.color;
              ctx.globalAlpha = 0.5 + Math.sin(time * f.speed * 2) * 0.3;
              ctx.fill();
              
              ctx.shadowBlur = 15;
              ctx.shadowColor = f.color;
              ctx.fill();
              ctx.shadowBlur = 0;
            });
            requestAnimationFrame(animate);
          }
          animate();
        })();
      </script>
    `
    };

    return animations[visuals.animationType] || animations['floating-particles'];
}

function generateDiagramHTML(visuals, cid) {
    if (visuals.diagramType === 'flowchart') {
        const { nodes, connections } = visuals.data;
        const centerX = width / 2;
        const nodeRadius = 60;
        const startY = height * 0.3;
        const stepY = (height * 0.6) / (nodes.length - 1);

        return `
      <svg style="position:absolute; inset:0; z-index:${visuals.position === 'foreground' ? 3 : 1}; opacity:${visuals.opacity || 0.85};">
        <defs>
          <filter id="glow-${cid}">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="lineGrad-${cid}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${visuals.colors?.[0] || '#7c3aed'}" />
            <stop offset="100%" style="stop-color:${visuals.colors?.[1] || '#2dd4bf'}" />
          </linearGradient>
        </defs>
        
        ${connections.map(conn => {
            const y1 = startY + conn[0] * stepY;
            const y2 = startY + conn[1] * stepY;
            return `<line x1="${centerX}" y1="${y1}" 
                        x2="${centerX}" y2="${y2}"
                        stroke="url(#lineGrad-${cid})" stroke-width="3"
                        stroke-dasharray="8,6">
                   <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.8s" repeatCount="indefinite"/>
                 </line>
                 <polygon points="${centerX - 8},${y2 - 15} ${centerX + 8},${y2 - 15} ${centerX},${y2}" 
                          fill="${visuals.colors?.[1] || '#2dd4bf'}" opacity="0.8">
                   <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite"/>
                 </polygon>`;
        }).join('')}
        
        ${nodes.map((node, i) => {
            const y = startY + i * stepY;
            return `
            <g transform="translate(${centerX}, ${y})" filter="url(#glow-${cid})">
              <circle r="${nodeRadius}" fill="${visuals.nodeColor || '#0d0d1a'}" 
                      stroke="${visuals.accentColor || visuals.colors?.[0] || '#7c3aed'}" 
                      stroke-width="3" opacity="0.95"/>
              <circle r="${nodeRadius - 5}" fill="none" 
                      stroke="${visuals.colors?.[1] || '#2dd4bf'}" 
                      stroke-width="1" stroke-dasharray="4,4">
                <animateTransform attributeName="transform" type="rotate" 
                  from="0" to="360" dur="${3 + i * 2}s" repeatCount="indefinite"/>
              </circle>
              <text text-anchor="middle" dy=".35em" fill="#fff" font-size="24" font-weight="bold">
                ${escapeHtmlForVisuals(node)}
              </text>
            </g>`;
        }).join('')}
      </svg>
    `;
    }

    return '';
}

function generateMotionHTML(visuals, cid) {
    const motionStyles = {
        'float': `
      @keyframes float-${cid} {
        0% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(5deg); }
        100% { transform: translateY(0px) rotate(0deg); }
      }
      .motion-${cid} {
        animation: float-${cid} ${visuals.duration || 3}s ease-in-out infinite;
      }
    `,
        'pulse': `
      @keyframes pulse-${cid} {
        0% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); opacity: 0.6; }
      }
      .motion-${cid} {
        animation: pulse-${cid} ${visuals.duration || 2}s ease-in-out infinite;
      }
    `,
        'rotate': `
      @keyframes rotate-${cid} {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .motion-${cid} {
        animation: rotate-${cid} ${visuals.duration || 4}s linear infinite;
      }
    `,
        'bounce': `
      @keyframes bounce-${cid} {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-30px); }
      }
      .motion-${cid} {
        animation: bounce-${cid} ${visuals.duration || 2}s ease-in-out infinite;
      }
    `,
        'shake': `
      @keyframes shake-${cid} {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
      }
      .motion-${cid} {
        animation: shake-${cid} ${visuals.duration || 0.5}s ease-in-out infinite;
      }
    `
    };

    const animationName = visuals.motionType || 'float';
    const style = motionStyles[animationName] || motionStyles['float'];

    let positionStyle = '';
    if (visuals.position === 'center') {
        positionStyle = 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
    } else if (visuals.position === 'top-left') {
        positionStyle = 'top: 20px; left: 20px;';
    } else if (visuals.position === 'top-right') {
        positionStyle = 'top: 20px; right: 20px;';
    } else if (visuals.position === 'bottom-left') {
        positionStyle = 'bottom: 20px; left: 20px;';
    } else if (visuals.position === 'bottom-right') {
        positionStyle = 'bottom: 20px; right: 20px;';
    } else {
        positionStyle = visuals.position || 'bottom: 30px; right: 30px;';
    }

    return `
    <style>${style}</style>
    <div class="motion-${cid}" style="
      position: absolute;
      ${positionStyle}
      z-index: ${visuals.position === 'foreground' ? 3 : 2};
      font-size: ${visuals.fontSize || '80px'};
      filter: drop-shadow(0 0 10px rgba(0,0,0,0.3));
      pointer-events: none;
    ">
      ${escapeHtmlForVisuals(visuals.content) || '✨'}
    </div>
  `;
}

function escapeHtmlForVisuals(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
