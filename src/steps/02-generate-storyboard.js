/**
 * Step 2: Generate storyboard.json from content using LMStudio (local LLM)
 *
 * Output storyboard structure:
 * {
 *   title: string,
 *   slug: string,
 *   totalDuration: number,
 *   scenes: [
 *     {
 *       id: number,
 *       type: string,
 *       composition: string,
 *       title: string,
 *       voiceText: string,   // Dùng cho TTS
 *       subtext: string,     // Hiển thị trên màn hình (karaoke)
 *       karaokeStyle: string,// "highlight" | "underline" | "none"
 *       duration: number,
 *       startTime: number,
 *       bgColor: string,
 *       accentColor: string,
 *       textColor: string,
 *       animation: string,
 *       emoji: string,
 *       visuals: object
 *     }
 *   ]
 * }
 */

import { writeFileSync } from "fs";
import path from "path";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const SYSTEM_PROMPT = `Bạn là chuyên gia sản xuất nội dung video short-form cho TikTok.
Nhiệm vụ: Tạo storyboard cho video dọc 9:16 gồm ĐÚNG 8 scene bằng tiếng Việt.

QUY TẮC QUAN TRỌNG:
- Scene 1: BẮT BUỘC dùng composition "hook-question". Mở đầu hấp dẫn, tiêu đề gây tò mò, hook người xem trong 2 giây đầu. BẮT BUỘC có hình ảnh (visuals.type="image"). Ưu tiên hình minh họa do LLM gợi ý/thiết kế (tối thiểu: tạo query/prompt hình ảnh thật cụ thể).
- Scene 2-7: Nội dung chính, mỗi scene một ý tưởng/điểm thú vị. Chú trọng LIÊN KẾT mạch nội dung giữa các scene; ưu tiên mở đầu voiceText bằng các từ ngữ chuyển cảnh như: "theo đó", "tuy nhiên", "tiếp theo", "cùng với", "và", "hơn thế nữa", "bên cạnh đó", "mặc dù vậy",...
- Scene 2-7: CÓ THỂ research thêm hình ảnh liên quan (visuals.type="image" + source:"search") để trực quan hơn.
- Scene 8: Đưa ra nhận định chủ quan NGẮN GỌN, hỏi ý kiến người xem và CTA kêu gọi thả tim ❤️ và follow kênh.

Các loại composition có sẵn:
1. "hook-question": Hook dạng câu hỏi + underline highlight ("label", optional "highlightWords")
2. "ui-cards": Demo dạng card UI (cần "cards": [{title, subtitle, icon}])
3. "process-steps": Timeline các bước (cần "steps": [{title, desc, state, icon}])
4. "quote-attrib": Quote + tác giả (cần "quote", "quoteAuthor", "quoteRole")
5. "stats-cards-grid": Lưới card thống kê 2x2 (cần "statsCards": [{icon, value, label}])
6. "kinetic-title": Typography cực lớn (cần "words": [string])
7. "context-bars": Các thanh context xếp chồng (cần "rows": [{icon, label, value}])
8. "promo-card": Promo/CTA (cần "promo": {badge, button, url, commentPrompt, logos[]})

Ngoài ra vẫn dùng được các composition cũ (nếu cần):
- "hero-title", "bullet-points", "quote-card", "stat-highlight", "infographic-chart", "stats-grid", "terminal", "callout", "cta-card", "comparison", "code-diff"

GỢI Ý (KHÔNG CỨNG NHẮC) để đa dạng hóa video:
- Scene 1: ƯU TIÊN "hook-question" (bắt buộc theo quy tắc ở trên)
- Scene 2–7: Tự chọn composition phù hợp nội dung, ưu tiên xoay vòng để không nhàm chán. Khuyến khích dùng thường xuyên:
  - "infographic-chart": khi có số liệu/tỉ lệ/so sánh đơn giản
  - "comparison": khi có đối chiếu “A vs B”, “trước vs sau”, “hiểu đúng vs hiểu sai”
  - "code-diff": khi có “đổi trước/sau”, “bản cũ/bản mới”, hoặc minh họa thay đổi rõ ràng theo 2 cột
  - "ui-cards", "process-steps", "stats-cards-grid", "quote-attrib", "context-bars" (tùy ý)
  - "kinetic-title": chỉ dùng khi có 1 cụm từ khóa mạnh (không bắt buộc phải có ở Scene 6)
- Scene 8: ƯU TIÊN "promo-card" hoặc "cta-card" (CTA + hỏi ý kiến người xem)

QUY TẮC RIÊNG CHO "kinetic-title" (Scene 6):
- Không được để scene bị "ít nội dung": ngoài "words", hãy thêm một khối nội dung phụ để người xem có thêm thông tin khi chữ kinetic đang slam.
- Cách làm khuyến nghị: thêm "terminalTitle" và "terminalLines" (3–6 dòng) để tạo hiệu ứng kinetic-title + terminal (log/command/metrics ngắn, đúng ngữ cảnh scene).
- "terminalLines": mỗi dòng có { "type": "prompt" | "output", "text": string }. Ưu tiên 1 dòng prompt + 2–5 dòng output.

⚠️ PHÂN BIỆT voiceText VÀ subtext:
- voiceText: Lời thoại TTS (ƯU TIÊN < 200 từ/scene để tránh giới hạn TTS; có thể vượt 200 nếu thật cần thiết) - TỰ NHIÊN, ĐỌC TOÀN BỘ NỘI DUNG
- subtext: Văn bản hiển thị trên màn hình (5-15 từ) - NGẮN GỌN, SÚC TÍCH, DỄ NHÌN
- karaokeStyle: "highlight" (tô màu từ đang đọc) | "underline" (gạch chân) | "none"

Ví dụ đúng:
{
  "voiceText": "Trí tuệ nhân tạo đang thay đổi cách chúng ta làm việc và sinh sống mỗi ngày. Đây là cuộc cách mạng công nghệ lớn nhất thế kỷ 21.",
  "subtext": "AI: Cuộc cách mạng công nghệ",
  "karaokeStyle": "highlight"
}

QUY TẮC VỀ HÌNH ẢNH & ANIMATION (visuals):
- Mỗi scene CÓ THỂ có "visuals" để minh họa nội dung
- "visuals" có thể là 1 object HOẶC 1 mảng nhiều lớp (để chồng image + animation)
- visuals.type: "image" | "animation" | "diagram" | "motion"
- visuals.position: "background" | "foreground" | "side"
- visuals.opacity: 0.1 đến 0.5 (cho background), 0.6 đến 1.0 (cho foreground)

Visuals image có thể thêm animation nhẹ (khuyến nghị cho Scene 1 để hook bắt mắt):
- visuals.motionType: "ken-burns" (zoom/pan chậm)
- visuals.motionDuration: 4–7 (giây)
- visuals.motionScaleFrom / visuals.motionScaleTo: 1.0–1.2
- visuals.motionTranslateFrom / visuals.motionTranslateTo: "x, y" (vd: "-12px, -8px")

QUY TẮC BẮT BUỘC VỀ imageUrl (ONLINE):
- Scene 1–7: nếu có visuals.type="image" thì PHẢI dùng ảnh online:
  - Cách 1 (khuyến nghị): { type:"image", source:"search", query:"...", position:"background", opacity:... }
    (Hệ thống sẽ tự fetch và điền "imageUrl" online từ query)
  - Cách 2: điền thẳng "imageUrl" là URL online hợp lệ (https://...)
- Scene 8: CHỈ dùng logo local (vd: "assets/logos/logo.png") nếu cần; không bắt buộc có visuals image.
- KHÔNG dùng đường dẫn local cho imageUrl ở Scene 1–7 (trừ khi được yêu cầu riêng).

Các loại animation:
- "floating-particles": Hạt bay lơ lửng
- "wave-lines": Sóng chạy ngang
- "glow-orbits": Vòng tròn sáng quay
- "fireflies": Đom đóm nhấp nháy

Các loại motion:
- "float": Lơ lửng lên xuống
- "pulse": Phập phồng
- "rotate": Xoay tròn
- "bounce": Nảy lên
- "shake": Rung lắc

⚠️ visuals là bổ sung để tăng tính trực quan:
- Scene 1: BẮT BUỘC có visuals.type="image" (ưu tiên source:"search" với query mô tả rõ phong cách/hình ảnh).
- Scene 2–7: thêm visuals khi thật sự cần, nhưng đảm bảo CÓ ÍT NHẤT 1 scene nữa có visuals (tổng tối thiểu 2 scene có visuals).

Mỗi scene cần đầy đủ:
- title: Tiêu đề (tối đa 8 từ)
- voiceText: Lời thoại TTS (ưu tiên < 200 từ/scene)
- subtext: Text hiển thị trên màn hình (5-15 từ)
- karaokeStyle: "highlight" hoặc "underline"
- composition: Chọn từ danh sách trên
- animation: "slide-up" | "zoom-in" | "fade-cascade" | "bounce-in" | "typewriter" | "particle-burst" | "pulse-glow"
- emoji: 1-2 emoji phù hợp
- bgColor: màu hex tối
- accentColor: màu hex nổi bật
- visuals: (optional) theo hướng dẫn

TRẢ VỀ CHỈ JSON THUẦN TÚY, không giải thích thêm.`;

export async function generateStoryboard(content, title, outputDir) {
  const userPrompt = `Tạo storyboard video TikTok cho nội dung sau:\n\nTiêu đề: ${title}\n\n${content}`;

  logger.info(`🤖 Calling LMStudio at ${config.lmstudio.baseUrl}...`);

  let storyboard;
  try {
    storyboard = await callLMStudio(userPrompt);
  } catch (err) {
    logger.warn(`LMStudio call failed: ${err.message}`);
    logger.warn(`Using fallback storyboard generator...`);
    storyboard = generateFallbackStoryboard(title, content);
  }

  // Validate and fix scene count
  if (!storyboard.scenes || storyboard.scenes.length !== 8) {
    logger.warn(`LLM returned ${storyboard.scenes?.length || 0} scenes, fixing...`);
    storyboard = ensureEightScenes(storyboard, title);
  }

  // Add sequential IDs and start times
  let cursor = 0;
  storyboard.scenes = storyboard.scenes.map((scene, i) => {
    const s = {
      id: i + 1,
      startTime: cursor,
      duration: scene.duration || 4,
      type: i === 0 ? "intro" : i === 7 ? "outro" : "content",
      composition: scene.composition || getDefaultComposition(i),
      title: scene.title || `Scene ${i + 1}`,
      voiceText: scene.voiceText || scene.title || "",
      subtext: scene.subtext || generateSubtext(scene.title, scene.voiceText),
      karaokeStyle: scene.karaokeStyle || "underline",
      bgColor: scene.bgColor || config.video.themes[i % config.video.themes.length].bg,
      accentColor: scene.accentColor || config.video.themes[i % config.video.themes.length].accent,
      textColor: scene.textColor || "#ffffff",
      animation: scene.animation || "slide-up",
      emoji: scene.emoji || "",
      visuals: scene.visuals || null,
      // Additional fields for specific compositions
      label: scene.label || null,
      highlightWords: scene.highlightWords || null,
      kicker: scene.kicker || null,
      cards: scene.cards || null,
      primaryCard: scene.primaryCard || null,
      secondaryCard: scene.secondaryCard || null,
      tertiaryCard: scene.tertiaryCard || null,
      steps: scene.steps || null,
      quote: scene.quote || null,
      quoteAuthor: scene.quoteAuthor || null,
      quoteRole: scene.quoteRole || null,
      statsCards: scene.statsCards || null,
      words: scene.words || null,
      faintWords: scene.faintWords || null,
      rows: scene.rows || null,
      promo: scene.promo || null,
      points: scene.points || null,
      chartType: scene.chartType || null,
      data: scene.data || null,
      stats: scene.stats || null,
      terminalTitle: scene.terminalTitle || null,
      terminalLines: scene.terminalLines || null,
      calloutTag: scene.calloutTag || null,
      calloutStatement: scene.calloutStatement || null,
      left: scene.left || null,
      right: scene.right || null,
      bad: scene.bad || null,
      good: scene.good || null,
      badLabel: scene.badLabel || null,
      goodLabel: scene.goodLabel || null
    };
    cursor += s.duration;
    return s;
  });

  storyboard.totalDuration = cursor;
  storyboard.slug = storyboard.slug || slugify(title);

  // Fetch images for scenes that need them
  storyboard = await fetchImagesForScenes(storyboard);

  // Save storyboard
  const outPath = path.join(outputDir, "storyboard.json");
  writeFileSync(outPath, JSON.stringify(storyboard, null, 2), "utf-8");
  logger.info(`💾 Storyboard saved: ${outPath}`);

  return storyboard;
}

// Helper: generate subtext from title/voiceText
function generateSubtext(title, voiceText) {
  if (title && title.length < 30) return title;
  if (voiceText) {
    const shortText = voiceText.slice(0, 50);
    const lastSpace = shortText.lastIndexOf(" ");
    return lastSpace > 10 ? shortText.slice(0, lastSpace) + "..." : shortText;
  }
  return "Nội dung thú vị";
}

// Fetch images for scenes
async function fetchImagesForScenes(storyboard) {
  for (const scene of storyboard.scenes) {
    const visualsList = Array.isArray(scene.visuals) ? scene.visuals : (scene.visuals ? [scene.visuals] : []);

    for (const visuals of visualsList) {
      if (visuals?.type !== 'image') continue;

      // Scene 8 is allowed to keep local logo imageUrl
      const isScene8 = scene.id === 8;

      // If LLM provides a search query, fill an online URL
      if (visuals.source === 'search') {
        try {
          const imageUrl = await searchImage(visuals.query);
          visuals.imageUrl = imageUrl;
          logger.info(`  📷 Fetched image for scene ${scene.id}: "${visuals.query}"`);
        } catch (err) {
          logger.warn(`  Could not fetch image for scene ${scene.id}: ${err.message}`);
          visuals.imageUrl = `https://placehold.co/1080x1920/1a1a2e/ffffff?text=${encodeURIComponent(visuals.query || 'Image')}`;
        }
      }

      // Enforce "online imageUrl" for scenes 1–7 (best-effort). If imageUrl is missing or looks like a local path,
      // replace it with an online URL derived from query/title.
      // Allow explicitly-requested local assets (e.g. user-provided SVGs) for any scene.
      const url = String(visuals.imageUrl || '').trim();
      const allowLocal =
        visuals.source === 'local' ||
        visuals.source === 'asset' ||
        visuals.allowLocal === true ||
        /^assets\//i.test(url);

      if (!isScene8 && !allowLocal) {
        const looksLocal = url !== '' && !/^https?:\/\//i.test(url);
        if (!url || looksLocal) {
          const fallbackQuery = visuals.query || scene.title || storyboard.title || 'AI technology';
          visuals.source = visuals.source || 'search';
          visuals.query = visuals.query || fallbackQuery;
          try {
            visuals.imageUrl = await searchImage(visuals.query);
          } catch {
            visuals.imageUrl = `https://placehold.co/1080x1920/1a1a2e/ffffff?text=${encodeURIComponent(visuals.query || 'Image')}`;
          }
        }
      }
    }
  }
  return storyboard;
}

async function searchImage(query) {
  // No-key online image source: Unsplash Source (returns a real image URL response)
  const q = encodeURIComponent(String(query || 'AI').trim().replace(/\s+/g, ','));
  return `https://source.unsplash.com/featured/1080x1920/?${q}`;
}

// LMStudio API call
async function callLMStudio(userPrompt) {
  const { default: fetch } = await import("node-fetch");
  const url = `${config.lmstudio.baseUrl}/chat/completions`;

  const body = {
    model: config.lmstudio.model,
    temperature: config.lmstudio.temperature,
    max_tokens: config.lmstudio.maxTokens,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.lmstudio.timeout),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LMStudio HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseJsonFromLLM(text);
}

function parseJsonFromLLM(text) {
  let clean = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    clean = clean.slice(start, end + 1);
  }

  return JSON.parse(clean);
}

// Fallback storyboard
function generateFallbackStoryboard(title, content) {
  const words = content ? content.split(/\s+/).slice(0, 200) : [];
  const chunks = [];
  for (let i = 0; i < 6; i++) {
    chunks.push(words.slice(i * 25, (i + 1) * 25).join(" ") || `Điểm thú vị ${i + 1}`);
  }

  return {
    title,
    slug: slugify(title),
    scenes: [
      {
        title: `Khi ai đó nói về ${title}, ai sẽ biết?`,
        voiceText: `Câu hỏi gây tranh cãi: khi ai đó chia sẻ điều nhạy cảm về ${title}, liệu có ai khác được thông báo không? Đây là góc nhìn nhanh để bạn hiểu cơ chế và giới hạn.`,
        subtext: title,
        karaokeStyle: "underline",
        composition: "hook-question",
        label: "VẤN ĐỀ THẬT",
        highlightWords: ["ai", "biết?"],
        animation: "quote-fade",
        emoji: "❓",
        bgColor: "#0d0d1a",
        accentColor: "#8dd3ff",
        visuals: [
          {
            type: "image",
            source: "search",
            query: `ảnh minh họa cinematic về chủ đề ${title}, ánh sáng neon, bí ẩn, bố cục dọc 9:16`,
            position: "background",
            opacity: 0.28,
            overlayColor: "linear-gradient(0deg, rgba(0,0,0,0.72), rgba(0,0,0,0.18))",
            motionType: "ken-burns",
            motionDuration: 5.5,
            motionScaleFrom: 1.02,
            motionScaleTo: 1.12,
            motionTranslateFrom: "0px, 10px",
            motionTranslateTo: "-18px, -10px"
          },
          {
            type: "animation",
            animationType: "wave-lines",
            position: "background",
            opacity: 0.35,
            colors: ["#8dd3ff", "#a78bfa", "#22d3ee", "#fbbf24"]
          }
        ]
      },
      {
        id: 2,
        title: "Trusted Contact",
        voiceText: chunks[0].slice(0, 150),
        subtext: "Demo dạng card UI",
        karaokeStyle: "underline",
        composition: "ui-cards",
        cards: [
          { title: "7 / 05", subtitle: "Ngày ra mắt", icon: "📅" },
          { title: "Người thân", subtitle: "Vai trò liên hệ", icon: "💛" },
          { title: "Người trên 18", subtitle: "Đối tượng", icon: "🔞" }
        ],
        animation: "card-slide-in-right",
        emoji: "🧩",
        bgColor: "#0d0d1a",
        accentColor: "#8dd3ff",
        visuals: {
          type: "image",
          source: "search",
          query: `minh họa biểu tượng, infographic, chủ đề ${title}, nền tối, dễ đọc`,
          position: "background",
          opacity: 0.18,
          overlayColor: "linear-gradient(0deg, rgba(0,0,0,0.70), rgba(0,0,0,0.25))",
          motionType: "ken-burns",
          motionDuration: 5.5,
          motionScaleFrom: 1.0,
          motionScaleTo: 1.08,
          motionTranslateFrom: "0px, 0px",
          motionTranslateTo: "-10px, -6px"
        }
      },
      {
        id: 3,
        title: "Quy Trình 4 Bước",
        voiceText: chunks[1].slice(0, 150),
        subtext: "Từng bước hoạt động",
        karaokeStyle: "underline",
        composition: "process-steps",
        steps: [
          { title: "Thêm liên hệ", desc: "Chọn 1 người thân trong cài đặt", state: "done", icon: "✓" },
          { title: "Chờ chấp nhận", desc: "Người được chọn đồng ý", state: "done", icon: "✓" },
          { title: "AI phát hiện dấu hiệu", desc: "Hệ thống đo nguy cơ", state: "done", icon: "✓" },
          { title: "Con người kiểm tra", desc: "Duyệt trong thời gian ngắn", state: "active", icon: "👤" }
        ],
        animation: "reveal-stagger",
        emoji: "🧾",
        bgColor: "#0d0d1a",
        accentColor: "#8dd3ff",
        visuals: null
      },
      {
        id: 4,
        title: "Một câu đáng nhớ",
        voiceText: chunks[2].slice(0, 150),
        subtext: "Trích dẫn",
        karaokeStyle: "underline",
        composition: "quote-attrib",
        quote: "“Kết nối xã hội là yếu tố bảo vệ mạnh nhất trong những giai đoạn khủng hoảng cảm xúc.”",
        quoteAuthor: "Tiến sĩ Arthur Evans",
        quoteRole: "Tổng Giám Đốc Hiệp Hội Tâm Lý Học Hoa Kỳ",
        animation: "quote-fade",
        emoji: "💬",
        bgColor: "#0d0d1a",
        accentColor: "#8dd3ff",
        visuals: null
      },
      {
        id: 5,
        title: "Đứng Sau Tính Năng",
        voiceText: chunks[3].slice(0, 150),
        subtext: "Số liệu",
        karaokeStyle: "underline",
        composition: "stats-cards-grid",
        statsCards: [
          { icon: "🩺", value: "260+", label: "Bác sĩ tham gia" },
          { icon: "🌍", value: "60", label: "Quốc gia" },
          { icon: "🧠", value: "170+", label: "Chuyên gia tâm lý" },
          { icon: "🔒", value: "Không", label: "Nội dung chia sẻ" }
        ],
        animation: "reveal-stagger",
        emoji: "📊",
        bgColor: "#0d0d1a",
        accentColor: "#8dd3ff",
        visuals: null
      },
      {
        id: 6,
        title: "KHÔNG NGƯỜI PHÁN ĐOÁN",
        voiceText: chunks[4].slice(0, 150),
        subtext: "Kinetic typography",
        karaokeStyle: "underline",
        composition: "kinetic-title",
        words: ["KHÔNG", "NGƯỜI", "PHÁN", "ĐOÁN"],
        animation: "kinetic-slam",
        emoji: "🧠",
        bgColor: "#0d0d1a",
        accentColor: "#8dd3ff",
        visuals: null
      },
      {
        id: 7,
        title: "Bối Cảnh Phía Sau",
        voiceText: chunks[5].slice(0, 150),
        subtext: "Context",
        karaokeStyle: "underline",
        composition: "context-bars",
        rows: [
          { icon: "📅", label: "Thời điểm", value: "11 / 2025" },
          { icon: "⚖️", label: "Vụ kiện chống OpenAI", value: "7 vụ" },
          { icon: "🚨", label: "Cáo buộc chính", value: "Bỏ qua an toàn" }
        ],
        animation: "reveal-stagger",
        emoji: "🧷",
        bgColor: "#0d0d1a",
        accentColor: "#8dd3ff",
        visuals: null
      },
      {
        id: 8,
        title: "ChatGPT báo người thân khi bạn khủng hoảng – bảo vệ hay vượt giới hạn?",
        voiceText: "Nếu bạn thấy format này hữu ích, hãy thả tim ❤️ và follow để xem thêm các video phân tích công nghệ theo kiểu ngắn gọn như thế này nhé!",
        subtext: "💬 Bình luận góc nhìn của bạn",
        karaokeStyle: "underline",
        composition: "promo-card",
        promo: {
          badge: "Giảm đến 80%",
          button: "MUA NGAY TẠI",
          url: "https://aiinus.net",
          commentPrompt: "Bình luận góc nhìn của bạn",
          logos: ["Claude", "Cursor", "ChatGPT", "Gemini", "Copilot", "Antigravity"]
        },
        animation: "quote-fade",
        emoji: "🎁",
        bgColor: "#0d0d1a",
        accentColor: "#8dd3ff",
        visuals: null
      },
    ],
  };
}

function ensureEightScenes(storyboard, title) {
  const scenes = storyboard.scenes || [];
  while (scenes.length < 8) {
    scenes.push({
      title: `Nội dung ${scenes.length + 1}`,
      voiceText: `Đây là nội dung thú vị thứ ${scenes.length + 1}. Hãy cùng theo dõi để biết thêm chi tiết nhé!`,
      subtext: `Nội dung ${scenes.length + 1}`,
      karaokeStyle: "underline",
      composition: getDefaultComposition(scenes.length),
      animation: "reveal-stagger",
      emoji: "💡",
      bgColor: "#0d0d1a",
      accentColor: "#8dd3ff",
      visuals: null
    });
  }
  storyboard.scenes = scenes.slice(0, 8);
  return storyboard;
}

function getDefaultComposition(index) {
  if (index === 0) return "hook-question";
  if (index === 7) return "promo-card";

  // Scenes 2–7: intentionally varied (favor infographic/comparison/code-diff more often)
  const comps = [
    "ui-cards",
    "infographic-chart",
    "process-steps",
    "comparison",
    "quote-attrib",
    "code-diff"
  ];
  return comps[(index - 1) % comps.length] || "bullet-points";
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}
