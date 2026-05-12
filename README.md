# 🎬 Short Video Gen AI

Ứng dụng tạo video short-form (TikTok/Reels) tự động từ nội dung sử dụng:
- **LMStudio** (Local LLM) để tạo kịch bản 8 scene bằng tiếng Việt
- **VieNeu-TTS** để tạo giọng đọc tiếng Việt
- **HyperFrames** (hyperframes.heygen.com) để render video MP4 9:16

---

## 📋 Yêu Cầu Hệ Thống

| Tool | Mục đích | Cài đặt |
|------|----------|---------|
| Node.js 18+ | Runtime | [nodejs.org](https://nodejs.org) |
| npm | Package manager | Đi kèm Node.js |
| ffmpeg | Xử lý audio/video | `brew install ffmpeg` hoặc `apt install ffmpeg` |
| LMStudio | Local LLM | [lmstudio.ai](https://lmstudio.ai) |
| VieNeu-TTS | TTS tiếng Việt | [GitHub VieNeu](https://github.com/) |

---

## 🚀 Cài Đặt

```bash
# Clone hoặc copy thư mục này
cd short-video-gen-ai

# Cài dependencies
npm install

# Cấu hình (xem src/config.js)
# - Chỉnh URL LMStudio: http://localhost:1234/v1
# - Chỉnh URL VieNeu TTS: http://localhost:7860/api/tts
```

---

## ⚙️ Cấu Hình LMStudio

1. Mở **LMStudio** → Load model (ví dụ: Qwen2.5-7B, Llama 3.1, Gemma)
2. Vào tab **Local Server** → Start server (port 1234)
3. Kiểm tra: `curl http://localhost:1234/v1/models`

## ⚙️ Cấu Hình VieNeu TTS

```bash
# Cài VieNeu TTS (ví dụ với Gradio)
pip install gradio
python vieneu_tts_server.py
# Server chạy tại http://localhost:7860
```

Nếu dùng API khác, chỉnh `config.vieneu.apiUrl` trong `src/config.js`.

---

## 🎮 Cách Sử Dụng

### Từ URL
```bash
npm start -- https://vnexpress.net/bai-viet-nao-do
npm start -- https://medium.com/some-article
```

### Từ file Markdown
```bash
npm start -- content.md
npm start -- bai-viet.md
```

### Từ file kịch bản JSON (đã có sẵn)
```bash
npm start -- example-storyboard.json
npm start -- output/05-06-2024-my-video/storyboard.json
```

### Nodejs
```bash
node run.js example-storyboard.json
```

---

## 📁 Cấu Trúc Output

```
output/
└── 08-05-2025-ten-bai-viet/
    ├── ten-bai-viet.mp4          ← Video hoàn chỉnh (với audio)
    ├── video-raw.mp4             ← Video gốc từ HyperFrames (không có audio)
    ├── storyboard.json           ← Kịch bản LLM tạo ra
    ├── storyboard-timed.json     ← Kịch bản sau khi điều chỉnh thời gian
    ├── audio/
    │   ├── scene-1.wav           ← Audio từng scene
    │   ├── scene-2.wav
    │   ├── ...
    │   ├── mixed.wav             ← Track audio tổng hợp
    │   └── silence.wav
    └── hyperframes/              ← Project HyperFrames (có thể sửa tay)
        ├── index.html            ← Root composition
        ├── package.json
        ├── meta.json
        ├── hyperframes.json
        ├── compositions/
        │   ├── scene-1.html      ← HTML từng scene (sửa được)
        │   ├── scene-2.html
        │   └── ...
         └── assets/
             ├── scene-1.wav
             ├── bg-broll.mp4         ← (optional) video nền blur/dim cho template AI-news
             ├── logos/               ← (optional) logo pills cho promo-card
             │   ├── *.png
             │   └── ...
             └── ...
```

---

## 🎨 Sửa Video Thủ Công

Sau khi pipeline chạy xong, bạn có thể:

### Sửa HTML trực tiếp
```bash
# Mở preview trong browser
cd output/08-05-2025-ten-bai-viet/hyperframes
npm run dev

# Sửa compositions/scene-X.html theo ý muốn
# Render lại
npm run render
```

### Re-render từ storyboard đã điều chỉnh
```bash
npm run -- output/08-05-2025-ten-bai-viet/storyboard-timed.json
```

---

## 🏗️ Pipeline

```
Input (URL/MD/JSON)
       ↓
  [Step 1] Đọc nội dung
       ↓
  [Step 2] LMStudio → storyboard.json (8 scenes)
       ↓
  [Step 3] VieNeu TTS → audio WAV từng scene
       ↓
  [Step 4] Điều chỉnh duration khớp với audio
       ↓
  [Step 5] Build HyperFrames HTML project
       ↓
  [Step 6] npx hyperframes render → video-raw.mp4
       ↓
  [Step 7] ffmpeg merge audio → final.mp4
```

---

## 🎭 Composition Types

| Type | Mô tả | Dùng cho |
|------|-------|----------|
| `hero-title` | Tiêu đề lớn + emoji full screen | Scene mở đầu |
| `bullet-points` | 3 bullet points animated | Danh sách nội dung |
| `quote-card` | Quote lớn ở giữa | Câu trích dẫn ấn tượng |
| `stat-highlight` | Số liệu nổi bật | Thống kê, con số |
| `split-screen` | Hai panel song song | So sánh trái/phải |
| `countdown` | Đếm ngược với vòng tròn | Danh sách số |
| `cta-card` | Hearts + CTA | Scene cuối kêu gọi |

## 💫 Animation Styles

| Style | Hiệu ứng |
|-------|---------|
| `zoom-in` | Zoom từ lớn về bình thường |
| `slide-up` | Trượt lên từng phần |
| `fade-cascade` | Fade in tuần tự |
| `bounce-in` | Nảy vào với elastic |
| `typewriter` | Trượt vào từ hai bên |
| `particle-burst` | Burst + hearts bay lên |
| `pulse-glow` | Vòng tròn đếm ngược |

---

## 🔧 Debug

```bash
# Xem log chi tiết
DEBUG=1 npm run -- input.md

# Chỉ test LMStudio
curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"local-model","messages":[{"role":"user","content":"Xin chào"}]}'

# Chỉ test VieNeu TTS
curl -X POST http://localhost:7860/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Xin chào","voice":"female_south"}'
```

---

## 📝 Ví Dụ Storyboard JSON

Xem file `example-storyboard.json` để hiểu format kịch bản.

Bạn có thể tự viết storyboard JSON và chạy:
```bash
npm start -- my-storyboard.json
```

Điều này bỏ qua bước LLM và đi thẳng vào TTS + render.

## Tùy chỉnh

Bạn có thể tắt subtitle embedding bằng cách set trong config.js:
```
video: {
  embedSubtitles: false,  // Không nhúng subtitle vào video
}
```

Hoặc điều chỉnh style subtitle:
```
subtitleStyle: {
  fontSize: 40,
  color: "#FFD700",  // Màu vàng
  backgroundColor: "rgba(0,0,0,0.8)",
}
```

## Storyboard JSON mở rộng
```
├── scenes[].visuals
│   ├── type: "image" | "animation" | "motion" | "chart" | "diagram"
│   ├── source: "search" | "generate" | "builtin"
│   ├── query: string          (từ khóa tìm ảnh)
│   ├── style: string          (phong cách: "3d", "flat", "gradient")
│   ├── animation: object      (hiệu ứng chuyển động)
│   └── elements: array        (các thành phần đồ họa)

```

```
short-video-gen-ai/
├── src/
│   ├── index.js              ← CLI entry point
│   ├── pipeline.js           ← Orchestrator 7 bước
│   ├── config.js             ← Cấu hình LMStudio, VieNeu, HyperFrames
│   ├── composers/
│   │   └── scene-composer.js ← Build HTML cho từng scene type
│   │   └── visual-generator.js
│   ├── steps/
│   │   ├── 01-read-input.js  ← Đọc URL / .md / .json
│   │   ├── 02-generate-storyboard.js ← LMStudio → 8 scenes JSON
│   │   ├── 03-generate-tts.js        ← VieNeu TTS → WAV
│   │   ├── 04-adjust-timings.js      ← Đồng bộ duration với audio
│   │   ├── 05-build-hyperframes.js   ← Build HTML project
│   │   ├── 06-render-video.js        ← npx hyperframes render
│   │   └── 07-merge-audio.js         ← ffmpeg ghép audio
│   └── utils/
│       ├── logger.js
│       ├── fs-helpers.js
│       └── audio-utils.js
│       └── srt-generator.js
├── example-storyboard.json   ← File mẫu để test ngay
├── package.json
└── README.md
```
