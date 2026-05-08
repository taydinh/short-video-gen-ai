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
 *       id: number,          // 1-8
 *       type: string,        // "intro" | "content" | "outro"
 *       composition: string, // HyperFrames composition style
 *       title: string,       // Headline for the scene
 *       voiceText: string,   // TTS text (Vietnamese)
 *       duration: number,    // Seconds (will be adjusted after TTS)
 *       startTime: number,
 *       bgColor: string,
 *       accentColor: string,
 *       textColor: string,
 *       animation: string,   // Animation style hint
 *       emoji: string,       // Optional decorative emoji
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
- Scene 8: CTA kêu gọi thả tim ❤️ và follow kênh TikTok

Mỗi scene cần:
- title: Tiêu đề ngắn gọn (tối đa 8 từ)
- voiceText: Lời thoại TTS ngắn gọn, tự nhiên như người nói chuyện (15-40 từ)
- composition: Chọn 1 trong ["hero-title", "bullet-points", "quote-card", "stat-highlight", "split-screen", "countdown", "cta-card"]
- animation: Chọn 1 trong ["slide-up", "zoom-in", "fade-cascade", "bounce-in", "typewriter", "particle-burst", "pulse-glow"]
- emoji: 1-2 emoji phù hợp nội dung
- bgColor: màu hex tối (ví dụ: "#0d0d1a")
- accentColor: màu hex nổi bật (ví dụ: "#7c3aed")

TRẢ VỀ CHỈ JSON THUẦN TÚY (không có markdown, không có backtick):
{
  "title": "Tên video",
  "slug": "ten-video-slug",
  "scenes": [
    {
      "id": 1,
      "type": "intro",
      "composition": "hero-title",
      "title": "Tiêu đề scene",
      "voiceText": "Lời thoại TTS...",
      "duration": 4,
      "bgColor": "#0d0d1a",
      "accentColor": "#7c3aed",
      "textColor": "#ffffff",
      "animation": "zoom-in",
      "emoji": "🔥"
    }
  ]
}`;

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
      bgColor: scene.bgColor || config.video.themes[i % config.video.themes.length].bg,
      accentColor: scene.accentColor || config.video.themes[i % config.video.themes.length].accent,
      textColor: scene.textColor || "#ffffff",
      animation: scene.animation || "slide-up",
      emoji: scene.emoji || "",
    };
    cursor += s.duration;
    return s;
  });

  storyboard.totalDuration = cursor;
  storyboard.slug = storyboard.slug || slugify(title);

  // Save storyboard
  const outPath = path.join(outputDir, "storyboard.json");
  writeFileSync(outPath, JSON.stringify(storyboard, null, 2), "utf-8");
  logger.info(`💾 Storyboard saved: ${outPath}`);

  return storyboard;
}

// ── LMStudio API call ────────────────────────────────────────────────────────

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

  // Parse JSON from response
  return parseJsonFromLLM(text);
}

function parseJsonFromLLM(text) {
  // Strip markdown code blocks if present
  let clean = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Find JSON object boundaries
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    clean = clean.slice(start, end + 1);
  }

  return JSON.parse(clean);
}

// ── Fallback: generate without LLM ─────────────────────────────────────────

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
        composition: "hero-title",
        animation: "zoom-in",
        emoji: "🔥",
        bgColor: "#0d0d1a",
        accentColor: "#7c3aed",
      },
      ...chunks.map((chunk, i) => ({
        title: `Điểm ${i + 1}`,
        voiceText: chunk.slice(0, 150),
        composition: ["bullet-points", "quote-card", "stat-highlight", "split-screen", "bullet-points", "quote-card"][i],
        animation: ["slide-up", "fade-cascade", "bounce-in", "typewriter", "slide-up", "fade-cascade"][i],
        emoji: ["💡", "✨", "🚀", "💯", "⚡", "🎯"][i],
        bgColor: config.video.themes[i % config.video.themes.length].bg,
        accentColor: config.video.themes[i % config.video.themes.length].accent,
      })),
      {
        title: "Thả Tim & Follow Ngay!",
        voiceText: "Nếu video này hữu ích, hãy thả tim ❤️ và follow kênh để không bỏ lỡ nội dung hay nhé! Cảm ơn các bạn!",
        composition: "cta-card",
        animation: "particle-burst",
        emoji: "❤️",
        bgColor: "#1a0d2e",
        accentColor: "#ec4899",
      },
    ],
  };
}

function ensureEightScenes(storyboard, title) {
  const scenes = storyboard.scenes || [];
  while (scenes.length < 8) {
    scenes.push({
      title: `Nội dung ${scenes.length + 1}`,
      voiceText: `Đây là nội dung thú vị thứ ${scenes.length + 1}.`,
      composition: "bullet-points",
      animation: "slide-up",
      emoji: "💡",
      bgColor: "#0d0d1a",
      accentColor: "#7c3aed",
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