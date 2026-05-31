# Danh mục Composition

Tổng hợp các composition, scene animation, visuals animation và motion hiện có trong source.

Nguồn tham chiếu:
- `src/composers/scene-composer.js`
- `src/composers/joly-widgets.js`
- `src/composers/visual-generator.js`
- `compositions/transitions-mechanical.html`

## Quy tắc subtitle

- Mỗi scene trong storyboard nên có field `subtitle` đi cùng `voiceText`, kể cả scene chỉ dùng video nền hoặc scene outro.
- `voiceText` dùng để TTS đọc ổn định nên có thể dùng phiên âm, cách đọc số bằng chữ, hoặc cách đọc rút gọn theo rule riêng.
- `subtitle` dùng để hiển thị cho người xem, vì vậy phải viết theo dạng đọc tự nhiên trên màn hình: giữ tên chính thức như `PSG`, `Paris Saint-Germain`, `Arsenal`, `Dembélé`, `Havertz`; dùng số/ký hiệu gọn như `120 phút`, `4-3`, `75%`, `2026`, `50-50`; không dùng phiên âm TTS như `Pi S Ji`, `a se nồ`, `đem bê lê`.
- Nội dung `subtitle` nên bám sát ý của `voiceText`, nhưng có thể chuẩn hóa tên riêng, số liệu, ký hiệu và dấu câu để dễ đọc hơn.
- Khi scene có `voiceText` dài, `subtitle` vẫn nên là một đoạn hoàn chỉnh theo đúng thứ tự ý chính, tránh thêm thông tin mới không có trong lời đọc.

## Composition chính

| Composition | Chú thích |
|---|---|
| `hook-question` | Hook mở đầu dạng câu hỏi, nhấn mạnh từ khóa bằng underline/highlight. |
| `ui-cards` | Các card UI trình bày 2-3 ý hoặc demo dạng sản phẩm. |
| `process-steps` | Timeline/quy trình theo từng bước. |
| `quote-attrib` | Quote lớn kèm tác giả/vai trò, phong cách broadcast. |
| `stats-cards-grid` | Lưới card thống kê 2x2 hoặc nhiều số liệu. |
| `kinetic-title` | Typography lớn, chữ chuyển động mạnh, dùng cho keyword nổi bật. |
| `context-bars` | Các thanh context xếp chồng, phù hợp để so sánh tín hiệu/ngữ cảnh. |
| `promo-card` | CTA/promo cuối video, hỗ trợ nút follow/comment/url/logos. |
| `hero-title` | Tiêu đề lớn full-screen kèm emoji. |
| `flashcard-gallery` | Bộ sưu tập ảnh (gallery) dạng thẻ xếp chồng 3D, hỗ trợ vuốt chuyển thẻ Tinder-swipe tự động đồng bộ theo từ khóa giọng nói. Hỗ trợ tùy chọn `"layout": "horizontal"` (thẻ ngang 4:3) hoặc `"vertical"` (mặc định, thẻ dọc). |
| `bullet-points` | Danh sách bullet có animation. |
| `quote-card` | Quote đơn giản ở giữa màn hình. |
| `stat-highlight` | Một con số hoặc số liệu lớn nổi bật. |
| `split-screen` | Hai panel song song để so sánh trái/phải. |
| `countdown` | Đếm ngược với vòng tròn. |
| `feng-shui-card` | Card phong thủy/ảnh minh họa, dùng trực tiếp `imageSrc` hoặc `imageUrl`. |
| `cta-card` | CTA cuối video kiểu thả tim/follow. |
| `infographic-chart` | Biểu đồ infographic: bar/donut/value. |
| `stats-grid` | Grid thống kê cũ, hiển thị các card số liệu. |
| `terminal` | Terminal/log output. |
| `callout` | Card nhấn mạnh/cảnh báo/gợi ý. Có khai báo trùng trong source, JS sẽ dùng bản cuối. |
| `comparison` | So sánh A/B, đúng/sai, trước/sau. |
| `code-diff` | Hai cột diff code hoặc nội dung trước-sau. |

## Composition Football/Broadcast

| Composition | Chú thích |
|---|---|
| `football-tournament-intro` | Intro giải đấu với logo tournament, sân cỏ, ring/shine motion. |
| `football-match-card` | Poster trận đấu: 2 đội, VS, phong độ, ngày giờ, sân/giải. |
| `football-scoreboard` | Bảng tỉ số kèm phút thi đấu. |
| `football-player-stat` | Spotlight cầu thủ/đội, số áo, ảnh và thống kê. |
| `football-odds-h2h` | Bảng kèo kèm lịch sử đối đầu gần đây. |
| `football-lineup` | Đội hình ra sân trên pitch theo formation. |
| `football-bracket-flow` | Hành trình giải đấu/knockout/bracket. Hỗ trợ `flowVariant: "branching"` mặc định dạng phân nhánh và `flowVariant: "linear"` dạng thẳng từ trên xuống. |
| `football-timeline` | Diễn biến trận theo mốc phút. |
| `football-upcoming-schedule` | Lịch thi đấu sắp tới/fixtures. |
| `football-standings-table` | Bảng xếp hạng/group table/league table. |

## Composition Joly-inspired

| Composition | Chú thích |
|---|---|
| `joly-typewriter-text` | Chữ gõ từng ký tự. |
| `joly-text-morphing` | Morph đổi cụm chữ mượt. |
| `joly-velocity-morph` | Morph chữ nhanh, năng lượng cao. |
| `joly-glitch-text` | Chữ glitch/cyberpunk. |
| `joly-highlight-text` | Highlight từng từ khóa. |
| `joly-number-counter` | Bộ đếm số lớn. |
| `joly-bento-grid` | Bento dashboard/card tóm tắt. |
| `joly-code-block` | Code/terminal panel. |
| `joly-phone-card` | Mockup điện thoại. |
| `joly-animated-beam` | Sơ đồ luồng/nodes có beam chạy. |
| `joly-image-comparison` | So sánh ảnh trước/sau. |
| `joly-image-sphere` | Gallery ảnh xoay dạng sphere. |

## Standalone composition HTML

| Composition | Chú thích |
|---|---|
| `transitions-mechanical` | File HTML riêng trong `compositions/transitions-mechanical.html`, demo 2 transition cơ khí: shutter close/open và clock wipe. |

## Scene animation styles

| Animation | Chú thích |
|---|---|
| `zoom-in` | Canvas zoom từ lớn về bình thường. |
| `slide-up` | Thành phần trượt lên/hiện dần. |
| `fade-cascade` | Fade-in tuần tự nhiều element. |
| `bounce-in` | Nảy vào kiểu elastic. |
| `typewriter` | Trượt trái/phải, không phải gõ chữ thật. |
| `particle-burst` | Burst/hearts/CTA motion. |
| `pulse-glow` | Vòng sáng/pulse/countdown. |
| `image-card-rise` | Card ảnh nổi lên, dùng cho `feng-shui-card`. |
| `infographic-chart` | Animate chart fill/bar/donut. |
| `stats-grid` | Card thống kê bật vào. |
| `terminal` | Terminal hiện lên, từng dòng log xuất hiện tuần tự. |
| `callout` | Callout card pop in. |
| `comparison` | Hai panel so sánh trượt vào. |
| `code-diff` | Hai pane diff trượt vào. |
| `football-broadcast` | Motion chung cho hầu hết football composition. |
| `football-lineup` | Motion riêng cho đội hình cầu thủ. |
| `football-logo-intro` | Motion riêng cho logo/tournament intro. |
| `reveal-stagger` | Reveal stagger cho AI-news cards/steps. |
| `card-slide-in-right` | Card UI trượt vào từ phải. |
| `quote-fade` | Quote/media fade kèm blur. |
| `kinetic-slam` | Typography slam mạnh. |

## Visuals: animation và motion

| Type/Name | Chú thích |
|---|---|
| `visuals.type: "image"` | Ảnh nền/foreground, hỗ trợ `motionType: "ken-burns"` để zoom/pan chậm. |
| `visuals.type: "highlight-image-card"` | Card ảnh tái sử dụng, có nền UI, border gradient/highlight, nhãn, title/caption và animation rise/glow. |
| `visuals.type: "animation"` + `floating-particles` | Hạt bay lơ lửng trên canvas. |
| `visuals.type: "animation"` + `wave-lines` | Sóng SVG chạy ngang. |
| `visuals.type: "animation"` + `glow-orbits` | Vòng sáng quay. |
| `visuals.type: "animation"` + `fireflies` | Chấm sáng nhấp nháy/di chuyển nhẹ. |
| `visuals.type: "diagram"` + `flowchart` | Sơ đồ node/connection SVG có line dash animation. |
| `visuals.type: "motion"` + `float` | Nội dung/emoji lơ lửng. |
| `visuals.type: "motion"` + `pulse` | Phập phồng scale/opacity. |
| `visuals.type: "motion"` + `rotate` | Xoay tròn. |
| `visuals.type: "motion"` + `bounce` | Nảy lên xuống. |
| `visuals.type: "motion"` + `shake` | Rung lắc ngang. |
| `visuals.type: "video"` / `"video-clip-card"` | Thẻ video clip hoặc ảnh nền video chuyển động. Các field hỗ trợ:<br/>- `videoUrl`: đường dẫn file mp4<br/>- `trim.start`, `trim.end` hoặc `startTime`, `endTime`: thời gian cắt video. **Schema khuyến nghị là số giây** để rõ ràng và ổn định, ví dụ `{"trim":{"start":122,"end":130}}` cho đoạn 2:02-2:10. Code hiện vẫn hỗ trợ string dạng `"MM:SS"`, `"HH:MM:SS"`, `"00:04.500"` hoặc `"122.5"` khi cần đọc thủ công.<br/>- `videoVolume`: âm lượng audio của clip (mặc định 0.5)<br/>- `position`: vị trí hiển thị (`background` - toàn màn hình, `top` - thẻ card nằm ở trên, `bottom` - thẻ card nằm ở dưới)<br/>- `layout`: `horizontal` hoặc `vertical`<br/>- `videoTitle`, `videoDescription`: thông tin hiển thị trên thẻ (chỉ cho card)|
## Football visuals

| Visual Type | Chú thích |
|---|---|
| `football-pitch-lines` | Nền sân cỏ kèm đường pitch scan nhẹ. |
| `football-ball-motion` | Bóng bay/lăn qua khung, có arc/rotate. |
| `football-scorebug` | Overlay tỉ số nhỏ ở đầu video. |
| `football-stat-bars` | Thanh thống kê hai đội, fill-in animated. |
| `football-stat-radar` | Hiện đang map chung sang renderer stat bars. |
| `football-confetti` | Canvas confetti rơi. |
| `channel-watermark` | Logo/handle watermark ở góc màn hình. |
