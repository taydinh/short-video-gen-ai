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
- Scene 1: Mở đầu hấp dẫn, tiêu đề gây tò mò, hook người xem trong 2 giây đầu
- Scene 2-7: Nội dung chính, mỗi scene một ý tưởng/điểm thú vị
- Scene 8: CTA kêu gọi thả tim ❤️ và follow kênh

Các loại composition có sẵn:
1. "hero-title": Tiêu đề lớn + phụ đề
2. "bullet-points": Danh sách các điểm chính (cần "points")
3. "quote-card": Trích dẫn quan trọng
4. "stat-highlight": Một con số thống kê nổi bật
5. "infographic-chart": Biểu đồ (cần "chartType" và "data")
6. "stats-grid": Lưới các con số thống kê (cần "stats")
7. "terminal": Giao diện dòng lệnh (cần "terminalTitle" và "terminalLines")
8. "callout": Thẻ nhấn mạnh (cần "calloutTag" và "calloutStatement")
9. "cta-card": Màn hình kết thúc kêu gọi hành động
10. "comparison": So sánh hai đối tượng (cần "left" và "right")
11. "code-diff": So sánh code cũ và mới (cần "bad" và "good")

⚠️ PHÂN BIỆT voiceText VÀ subtext:
- voiceText: Lời thoại TTS (15-40 từ) - DÀI, TỰ NHIÊN, ĐỌC TOÀN BỘ NỘI DUNG
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
- visuals.type: "image" | "animation" | "diagram" | "motion"
- visuals.position: "background" | "foreground" | "side"
- visuals.opacity: 0.1 đến 0.5 (cho background), 0.6 đến 1.0 (cho foreground)

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

⚠️ CHỈ THÊM visuals KHI THẬT SỰ CẦN THIẾT, không phải scene nào cũng cần! visuals là bổ sung để tăng tính trực quan nhưng đảm bảo có ít nhất 2 scene sử dụng visuals.

Mỗi scene cần đầy đủ:
- title: Tiêu đề (tối đa 8 từ)
- voiceText: Lời thoại TTS (15-40 từ)
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
      karaokeStyle: scene.karaokeStyle || "highlight",
      bgColor: scene.bgColor || config.video.themes[i % config.video.themes.length].bg,
      accentColor: scene.accentColor || config.video.themes[i % config.video.themes.length].accent,
      textColor: scene.textColor || "#ffffff",
      animation: scene.animation || "slide-up",
      emoji: scene.emoji || "",
      visuals: scene.visuals || null,
      // Additional fields for specific compositions
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
    if (scene.visuals?.type === 'image' && scene.visuals.source === 'search') {
      try {
        const imageUrl = await searchImage(scene.visuals.query);
        scene.visuals.imageUrl = imageUrl;
        logger.info(`  📷 Fetched image for scene ${scene.id}: "${scene.visuals.query}"`);
      } catch (err) {
        logger.warn(`  Could not fetch image for scene ${scene.id}: ${err.message}`);
        scene.visuals.imageUrl = `https://placehold.co/1080x1920/1a1a2e/ffffff?text=${encodeURIComponent(scene.visuals.query || 'Image')}`;
      }
    }
  }
  return storyboard;
}

async function searchImage(query) {
  // TODO: Integrate with Unsplash API or Pexels API
  // For now, use random image from picsum
  return `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/1080/1920`;
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
        title: `🔥 ${title}`,
        voiceText: `Bạn có biết về ${title} không? Hôm nay chúng ta cùng khám phá những điều thú vị nhất!`,
        subtext: title,
        karaokeStyle: "highlight",
        composition: "hero-title",
        animation: "zoom-in",
        emoji: "🔥",
        bgColor: "#0d0d1a",
        accentColor: "#7c3aed",
        visuals: {
          type: "animation",
          animationType: "floating-particles",
          position: "background",
          opacity: 0.3,
          colors: ["#7c3aed", "#2dd4bf"]
        }
      },
      ...chunks.map((chunk, i) => ({
        title: `Điểm ${i + 1}`,
        voiceText: chunk.slice(0, 150),
        subtext: chunk.slice(0, 50),
        karaokeStyle: i % 2 === 0 ? "highlight" : "underline",
        composition: ["bullet-points", "quote-card", "stat-highlight", "split-screen", "bullet-points", "quote-card"][i],
        animation: ["slide-up", "fade-cascade", "bounce-in", "typewriter", "slide-up", "fade-cascade"][i],
        emoji: ["💡", "✨", "🚀", "💯", "⚡", "🎯"][i],
        bgColor: config.video.themes[i % config.video.themes.length].bg,
        accentColor: config.video.themes[i % config.video.themes.length].accent,
        visuals: i % 2 === 0 ? {
          type: "image",
          source: "search",
          query: "inspiration motivation technology",
          position: "background",
          opacity: 0.2
        } : null
      })),
      {
        title: "Thả Tim & Follow Ngay!",
        voiceText: "Nếu video này hữu ích, hãy thả tim ❤️ và follow kênh để không bỏ lỡ nội dung hay nhé! Cảm ơn các bạn!",
        subtext: "❤️ Follow để xem thêm",
        karaokeStyle: "highlight",
        composition: "cta-card",
        animation: "particle-burst",
        emoji: "❤️",
        bgColor: "#1a0d2e",
        accentColor: "#ec4899",
        visuals: {
          type: "motion",
          motionType: "pulse",
          position: "foreground",
          content: "❤️✨🎉✨❤️"
        }
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
      karaokeStyle: "highlight",
      composition: "bullet-points",
      animation: "slide-up",
      emoji: "💡",
      bgColor: "#0d0d1a",
      accentColor: "#7c3aed",
      visuals: null
    });
  }
  storyboard.scenes = scenes.slice(0, 8);
  return storyboard;
}

function getDefaultComposition(index) {
  const comps = ["hero-title", "bullet-points", "quote-card", "stat-highlight", "split-screen", "bullet-points", "quote-card", "cta-card"];
  return comps[index] || "bullet-points";
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