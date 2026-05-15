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
 *       omnivoiceRefPreset?: "neutral"|"hype"|"serious"|"sad", // (optional) cảm xúc giọng (approx bằng ref audio preset)
 *       omnivoiceRefAudioPath?: string, // (optional) override đường dẫn ref audio theo scene
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
import { loadFootballAssetIndex, findFootballAssetForTeam } from "../football/asset-index.js";
import { syncFootballAssets } from "../../scripts/sync-football-assets.js";
import { normalizeVoiceTextForTTS } from "../utils/voice-text.js";

const SYSTEM_PROMPT = `Bạn là chuyên gia sản xuất nội dung video short-form cho TikTok.
Nhiệm vụ: Tạo storyboard cho video dọc 9:16 gồm ĐÚNG 8 scene bằng tiếng Việt.

QUY TẮC QUAN TRỌNG:
- Scene 1: BẮT BUỘC dùng composition "hook-question". Mở đầu hấp dẫn, tiêu đề gây tò mò, hook người xem trong 2 giây đầu. BẮT BUỘC voiceText phải đọc nguyên văn title của Scene 1 ở ngay đầu câu để tạo sự tò mò và thu hút; sau đó nói ngắn gọn, đủ để chuyển nhanh sang Scene 2 đi sâu vào nội dung. BẮT BUỘC có hình ảnh (visuals.type="image"). Ưu tiên hình minh họa do LLM gợi ý/thiết kế (tối thiểu: tạo query/prompt hình ảnh thật cụ thể).
- Scene 2-7: Nội dung chính, mỗi scene một ý tưởng/điểm thú vị. Chú trọng LIÊN KẾT mạch nội dung giữa các scene; ưu tiên mở đầu voiceText bằng các từ ngữ chuyển cảnh như: "theo đó", "tuy nhiên", "tiếp theo", "cùng với", "và", "hơn thế nữa", "bên cạnh đó", "mặc dù vậy",...
- Scene 2-7: CÓ THỂ research thêm hình ảnh liên quan (visuals.type="image" + source:"search") để trực quan hơn.
- Scene 8: Đưa ra nhận định chủ quan NGẮN GỌN, hỏi ý kiến người xem và CTA kêu gọi thả tim ❤️ và follow kênh.
- Quy tắc voiceText (TTS): nếu có mốc thời gian dạng "21:00" thì phải viết thành "21 giờ" (không dùng dấu ":" trong lời thoại).

Các loại composition có sẵn:
1. "hook-question": Hook dạng câu hỏi + underline highlight ("label", optional "highlightWords")
2. "ui-cards": Demo dạng card UI (cần "cards": [{title, subtitle, icon}])
3. "process-steps": Timeline các bước (cần "steps": [{title, desc, state, icon}])
4. "quote-attrib": Quote + tác giả (cần "quote", "quoteAuthor", "quoteRole")
5. "stats-cards-grid": Lưới card thống kê 2x2 (cần "statsCards": [{icon, value, label}])
6. "kinetic-title": Typography cực lớn (cần "words": [string])
7. "context-bars": Các thanh context xếp chồng (cần "rows": [{icon, label, value}])
8. "promo-card": Promo/CTA (cần "promo": {badge, button, url, commentPrompt, logos[]})

Nhóm football/broadcast dùng cho nội dung bóng đá, FIFA, World Cup theo hướng editorial-safe:
1. "football-match-card": poster mở đầu trận/sự kiện (cần "teams": [{name, code, form, optional teamType:'club'|'national', optional logoSrc/flagSrc/badgeSrc}], optional "stage", "competitionLabel", "venue", "minute")
2. "football-scoreboard": bảng tỉ số + đồng hồ trận (cần "teams", "score": [home, away], optional "minute", "competitionLabel")
3. "football-player-stat": spotlight cầu thủ/đội (cần "player" hoặc "playerName", optional "team", "number", "stats": [{label, value, unit}])
4. "football-bracket-flow": hành trình giải đấu/vòng knock-out (cần "stages": [{stage, title}] hoặc "events")
5. "football-timeline": diễn biến trận theo phút (cần "events": [{minute, title, desc}])
6. "football-odds-h2h": bảng kèo (1x2, HDP, tài/xỉu, HT HDP) + lịch sử đối đầu 3 trận gần nhất (optional "oddsTable": {headers[], rows[]}; optional "h2hMatches": [{date, competition, home, away, score}])

Brand safety cho FIFA/World Cup:
- Có thể nhắc "FIFA", "World Cup", "FIFA World Cup" trong title/voiceText/subtext theo ngữ cảnh tin tức, phân tích, lịch sử, nhận định.
- KHÔNG yêu cầu, mô tả, hoặc tạo logo FIFA, emblem World Cup chính thức, hình cúp chính thức, mascot, slogan chính thức, hoặc visual khiến video trông như nội dung official/sponsored.
- Dùng icon bóng đá generic, sân cỏ, bảng tỉ số, bracket, stat overlay, cúp generic nếu thật cần nhưng không mô phỏng trophy chính thức.

Ngoài ra vẫn dùng được các composition cũ (nếu cần):
- "hero-title", "bullet-points", "quote-card", "stat-highlight", "infographic-chart", "stats-grid", "terminal", "callout", "cta-card", "comparison", "code-diff"

Nhóm Joly-inspired HTML components (không dùng React, render ổn trong HyperFrames):
1. "joly-typewriter-text": chữ gõ từng ký tự (cần "words": [string] hoặc "title" chứa cụm ngắn)
2. "joly-text-morphing": đổi cụm chữ mượt (cần "words": [string])
3. "joly-velocity-morph": đổi cụm chữ nhanh, năng lượng cao (cần "words": [string])
4. "joly-glitch-text": chữ glitch/cyberpunk (cần "text" hoặc "title")
5. "joly-highlight-text": highlight từ khóa (cần "text" hoặc "title", optional "highlightWords")
6. "joly-number-counter": bộ đếm số lớn (cần "value" hoặc "number", ví dụ "99%" hoặc "120k+")
7. "joly-bento-grid": lưới card tóm tắt/dashboards (cần "items": [{title, value, label, icon}])
8. "joly-code-block": code/terminal panel (cần "codeLines": [{text, type}] hoặc "code")
9. "joly-phone-card": mockup điện thoại (cần "phone": {title, subtitle, badge, imageUrl})
10. "joly-animated-beam": sơ đồ luồng/attack chain (cần "nodes": [{label, icon}])
11. "joly-image-comparison": trước/sau, đúng/sai (cần "beforeImage", "afterImage" hoặc visuals image)
12. "joly-image-sphere": gallery auto-rotate (cần "images": [url], chỉ dùng khi hình ảnh là trọng tâm)

GỢI Ý (KHÔNG CỨNG NHẮC) để đa dạng hóa video:
- Scene 1: ƯU TIÊN "hook-question" (bắt buộc theo quy tắc ở trên)
- Scene 2–7: Tự chọn composition phù hợp nội dung, ưu tiên xoay vòng để không nhàm chán. Khuyến khích dùng thường xuyên:
  - "infographic-chart": khi có số liệu/tỉ lệ/so sánh đơn giản
  - "comparison": khi có đối chiếu “A vs B”, “trước vs sau”, “hiểu đúng vs hiểu sai”
  - "code-diff": khi có “đổi trước/sau”, “bản cũ/bản mới”, hoặc minh họa thay đổi rõ ràng theo 2 cột
  - Với nội dung bóng đá/FIFA/World Cup: ưu tiên xoay vòng "football-match-card", "football-scoreboard", "football-player-stat", "football-odds-h2h", "football-bracket-flow", "football-timeline"
  - "ui-cards", "process-steps", "stats-cards-grid", "quote-attrib", "context-bars" (tùy ý)
  - Dùng "joly-number-counter" cho số liệu nổi bật; "joly-bento-grid" cho 3-5 ý tóm tắt; "joly-code-block" cho nội dung tech/cybersecurity; "joly-animated-beam" cho luồng dữ liệu/quy trình; "joly-highlight-text", "joly-typewriter-text", "joly-text-morphing", "joly-velocity-morph", "joly-glitch-text" cho hook/từ khóa mạnh; "joly-phone-card" cho demo app; "joly-image-comparison" cho trước/sau.
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

QUY TẮC VỀ imageUrl (ONLINE HOẶC ẢNH GEN LƯU LOCAL):
- Scene 1–7: nếu có visuals.type="image" thì KHÔNG bắt buộc phải là ảnh online. Có 2 hướng:
  - Cách 1 (ảnh online, khuyến nghị): { type:"image", source:"search", query:"...", position:"background", opacity:... }
    (Hệ thống sẽ tự fetch và điền "imageUrl" online từ query)
  - Cách 2 (ảnh local do LLM gen): dùng "imageUrl" trỏ tới file đã lưu tại assets/storyboards/{storyboard-slug}/scene-{x}.png
    (ví dụ: "assets/storyboards/bi-mat-thanh-cong/scene-3.png")
- Scene 8: có thể dùng logo local (vd: "assets/logos/logo.png") nếu cần; không bắt buộc có visuals image.

QUY TẮC VỀ imageSrc (CHỈ DÙNG ĐÚNG LÚC):
- "imageSrc" KHÔNG phải là field chung cho mọi composition. Hiện tại "imageSrc" chỉ được render trực tiếp khi dùng composition "feng-shui-card".
- Khi composition="feng-shui-card": đặt ảnh vào scene.imageSrc (ưu tiên) hoặc scene.imageUrl. Lưu ý: đặt ở ROOT của scene (cùng cấp với title/subtext), KHÔNG đặt trong visuals.
- Với mọi composition khác: KHÔNG dùng scene.imageSrc; nếu cần ảnh thì dùng visuals (source:"search" + query hoặc visuals.imageUrl online như quy tắc ở trên).

Các loại animation:
- "floating-particles": Hạt bay lơ lửng
- "wave-lines": Sóng chạy ngang
- "glow-orbits": Vòng tròn sáng quay
- "fireflies": Đom đóm nhấp nháy
- Football visuals dùng trực tiếp trong visuals.type:
  - "football-pitch-lines": nền sân cỏ + đường kẻ sân, nên dùng position:"background", opacity 0.25-0.55
  - "football-ball-motion": bóng generic bay/lăn qua khung, nên dùng foreground hoặc default
  - "football-scorebug": overlay tỉ số nhỏ ở đầu video, cần teams/score/minute
  - "football-stat-bars": thanh thống kê hai đội, cần stats: [{label, home, away, unit}]
  - "football-confetti": confetti bàn thắng/chung kết, dùng vừa phải để không che subtitle

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
- omnivoiceRefPreset: "neutral" | "hype" | "serious" | "sad" (optional, nếu dùng OmniVoice muốn có cảm xúc theo scene; hook/CTA→hype, phân tích/tin nghiêm túc→serious, tiêu cực/mất mát→sad, còn lại→neutral)
- subtext: Text hiển thị trên màn hình (5-15 từ)
- karaokeStyle: "highlight" hoặc "underline"
- composition: Chọn từ danh sách trên
- animation: "slide-up" | "zoom-in" | "fade-cascade" | "bounce-in" | "typewriter" | "particle-burst" | "pulse-glow"
- emoji: 1-2 emoji phù hợp
- bgColor: màu hex tối
- accentColor: màu hex nổi bật
- visuals: (optional) theo hướng dẫn
- Với composition "joly-*": có thể thêm "items", "codeLines", "code", "phone", "nodes", "images", "beforeImage", "afterImage", "value", "number", "text", "words" tùy component như mô tả ở trên.
- Với composition "football-*": có thể thêm "teams", "score", "minute", "stats", "events", "stages", "stage", "competitionLabel", "venue", "player", "team", "number". Nếu thiếu field, hệ thống có fallback generic.

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
    const voiceText = normalizeVoiceTextForTTS(enforceSceneOneTitleLead(i, scene));
    const s = {
      id: i + 1,
      startTime: cursor,
      duration: scene.duration || 4,
      type: i === 0 ? "intro" : i === 7 ? "outro" : "content",
      composition: scene.composition || getDefaultComposition(i),
      title: scene.title || `Scene ${i + 1}`,
      voiceText,
      subtext: scene.subtext || generateSubtext(scene.title, scene.voiceText),
      karaokeStyle: scene.karaokeStyle || "underline",
      bgColor: scene.bgColor || config.video.themes[i % config.video.themes.length].bg,
      accentColor: scene.accentColor || config.video.themes[i % config.video.themes.length].accent,
      textColor: scene.textColor || "#ffffff",
      animation: scene.animation || "slide-up",
      emoji: scene.emoji || "",
      visuals: scene.visuals || null,
      // OmniVoice per-scene emotion / reference (optional)
      omnivoiceRefPreset: scene.omnivoiceRefPreset || null,
      omnivoiceRefAudioPath: scene.omnivoiceRefAudioPath || null,
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
      goodLabel: scene.goodLabel || null,
      // Football / broadcast composition fields
      teams: scene.teams || null,
      score: scene.score || null,
      minute: scene.minute || null,
      events: scene.events || null,
      stages: scene.stages || null,
      stage: scene.stage || null,
      competitionLabel: scene.competitionLabel || null,
      venue: scene.venue || null,
      player: scene.player || null,
      playerName: scene.playerName || null,
      team: scene.team || null,
      club: scene.club || null,
      jersey: scene.jersey || null,
      // Joly-inspired HTML component fields
      joly: scene.joly || null,
      items: scene.items || null,
      code: scene.code || null,
      codeLines: scene.codeLines || null,
      codeTitle: scene.codeTitle || null,
      language: scene.language || null,
      phone: scene.phone || null,
      nodes: scene.nodes || null,
      images: scene.images || null,
      imageUrl: scene.imageUrl || null,
      before: scene.before || null,
      after: scene.after || null,
      beforeImage: scene.beforeImage || null,
      afterImage: scene.afterImage || null,
      value: scene.value || null,
      number: scene.number || null,
      text: scene.text || null,
      texts: scene.texts || null
    };
    cursor += s.duration;
    return s;
  });

  storyboard.totalDuration = cursor;
  storyboard.slug = storyboard.slug || slugify(title);

  // Auto-enrich football teams with local flag/logo assets (best-effort).
  storyboard = await enrichFootballTeams(storyboard);

  // Fetch images for scenes that need them
  storyboard = await fetchImagesForScenes(storyboard);

  // Save storyboard
  const outPath = path.join(outputDir, "storyboard.json");
  writeFileSync(outPath, JSON.stringify(storyboard, null, 2), "utf-8");
  logger.info(`💾 Storyboard saved: ${outPath}`);

  return storyboard;
}

export async function enrichFootballTeams(storyboard) {
  let index = loadFootballAssetIndex();

  const maybeRefreshIndex = () => {
    index = loadFootballAssetIndex({ indexPath: index.indexPath });
  };

  for (const scene of storyboard.scenes || []) {
    if (!Array.isArray(scene.teams)) continue;

    // Only enrich object teams (string teams are just labels for scoreboards).
    const teams = scene.teams.map((t) => (typeof t === "object" && t ? { ...t } : t));

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      if (!team || typeof team !== "object") continue;
      if (team.flagSrc || team.logoSrc || team.badgeSrc) continue;

      const found = findFootballAssetForTeam(team, index, { teamType: team.teamType || scene.teamType });
      if (found) {
        teams[i] = {
          ...team,
          ...(found.flagSrc ? { flagSrc: found.flagSrc } : {}),
          ...(found.logoSrc ? { logoSrc: found.logoSrc } : {}),
          ...(found.badgeSrc ? { badgeSrc: found.badgeSrc } : {}),
          teamType: team.teamType || found.badgeType,
        };
        continue;
      }

      // On-demand fetch from Wikimedia and update local index/assets (best-effort).
      try {
        const kind = String(team.teamType || "").toLowerCase() === "club" ? "club" : "national";
        const competition = kind === "club" ? "epl" : "wc2026";
        await syncFootballAssets({
          fetchTeam: team.name,
          kind,
          competition,
          code: team.code || "",
        });
        maybeRefreshIndex();

        const refound = findFootballAssetForTeam(team, index, { teamType: kind });
        if (refound) {
          teams[i] = {
            ...team,
            ...(refound.flagSrc ? { flagSrc: refound.flagSrc } : {}),
            ...(refound.logoSrc ? { logoSrc: refound.logoSrc } : {}),
            ...(refound.badgeSrc ? { badgeSrc: refound.badgeSrc } : {}),
            teamType: team.teamType || refound.badgeType,
          };
        }
      } catch (err) {
        logger.warn(`  ⚠️ Could not sync badge for team "${team.name}": ${err.message}`);
      }
    }

    scene.teams = teams;
  }

  return storyboard;
}

function enforceSceneOneTitleLead(index, scene) {
  const title = String(scene.title || `Scene ${index + 1}`).trim();
  const voiceText = String(scene.voiceText || title || "").trim();
  if (index !== 0 || !title) return voiceText;

  if (!voiceText) return title;
  if (voiceText.toLocaleLowerCase("vi-VN").startsWith(title.toLocaleLowerCase("vi-VN"))) {
    return voiceText;
  }

  return `${title} ${voiceText}`;
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
        voiceText: `Khi ai đó nói về ${title}, ai sẽ biết? Đây là câu hỏi gây tò mò nhất. Ngay sau đây là góc nhìn nhanh để hiểu cơ chế và giới hạn.`,
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
        animation: "particle-burst",
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
    "joly-bento-grid",
    "joly-number-counter",
    "process-steps",
    "joly-animated-beam",
    "quote-attrib",
    "joly-code-block"
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
