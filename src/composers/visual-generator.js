/**
 * Visual Generator - Tạo HTML/CSS cho các hiệu ứng hình ảnh động
 * Dùng để minh họa nội dung scene thêm sinh động và trực quan
 */

import { config } from "../config.js";

const { width, height } = config.hyperframes;

export function generateVisualsHTML(scene) {
    if (!scene.visuals) return '';

    const { visuals, id } = scene;
    const cid = `scene-${id}`;

    switch (visuals.type) {
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

function generateImageHTML(visuals, cid) {
    const imageUrl = visuals.imageUrl || `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/${width}/${height}`;
    const opacity = visuals.opacity || 0.4;
    const zIndex = visuals.position === 'foreground' ? 3 : 0;

    return `
    <div class="visual-image" style="
      position: absolute;
      inset: 0;
      z-index: ${zIndex};
      opacity: ${opacity};
      pointer-events: none;
      overflow: hidden;
    ">
      <img src="${imageUrl}" 
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
      <canvas id="particles-${cid}" style="position:absolute; inset:0; z-index:${visuals.position === 'foreground' ? 3 : 1};"></canvas>
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
      <svg style="position:absolute; bottom:0; left:0; width:100%; height:100%; z-index:${visuals.position === 'foreground' ? 3 : 1}; opacity:${visuals.opacity || 0.6};">
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