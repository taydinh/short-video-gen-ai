# Football Storyboard Presets

Tài liệu này lưu cấu trúc preset khi tạo storyboard JSON cho video bóng đá.

Nguồn mẫu:

- Preview: `storyboards\19-05-2026\bournemouth-vs-man-city-epl-preview-2026-05-20.json`
- Result: `storyboards\20-05-2026\bournemouth-1-1-man-city-epl-result-2026-05-20.json`

## Ghi Chú Chung

### Cách Đọc Và Viết Tắt Tên Đội Bóng

- Manchester United có thể ghi tắt và đọc tắt là `Man U` hoặc `MU` (đọc là `Mờ U`), nhưng không được ghi hoặc đọc chỉ là `United`.
- Manchester City có thể ghi tắt và đọc tắt là `Man City` hoặc `MC` (đọc là `Mờ C`), nhưng không được ghi hoặc đọc chỉ là `City`.

### Hiển Thị Logo Đội Bóng

- Khi hiển thị logo của đội bóng Tottenham Hotspur / Tottenham / Spurs, phải dùng `badgeBackgroundColor` màu trắng (`#ffffff`) trong object team để logo nổi rõ, bao gồm các scene dùng `football-match-card`, `football-scoreboard`, `football-lineup`, `football-stat-bars` và `football-standings-table`.

### VoiceText Scene Cuối

- `voiceText` của scene cuối cùng phải có lời kêu gọi follow: `Tôi là Méo bình luận, đừng quên follow để cập nhật các thông tin bóng đá mới nhất nhé!`

### Tổng Hợp VoiceText Sau Khi Tạo Storyboard

- Tạo storyboard JSON và lưu vào thư mục `/storyboards` với thư mục con có tên theo ngày hôm nay. Nếu thư mục ngày hôm nay chưa có thì tạo thư mục mới trước khi lưu file.
- Sau khi tạo storyboard JSON, phải tổng hợp toàn bộ `voiceText` trong JSON theo thứ tự scene và gửi lại cho người dùng xem.

### Cách Đọc Chỉ Số Thống Kê

- Với visuals có `"type": "football-stat-bars"`, nếu `voiceText` có xuất hiện chữ `xG` thì phải đọc qua tiếng Việt là `chỉ số bàn thắng kỳ vọng`; không để nguyên `xG` trong `voiceText`.
- Ví dụ: thay `Bournemouth đạt xG một phẩy chín chín` bằng `Bournemouth có chỉ số bàn thắng kỳ vọng một phẩy chín chín`.

### Cách Đọc Từ Viết Tắt Trong VoiceText

- Trong `voiceText`, `HLV` là viết tắt của `Huấn luyện viên`, nên phải viết và đọc là `Huấn luyện viên`; không để nguyên `HLV` trong `voiceText`.
- Trong `voiceText`, `bảng K` phải viết/đọc là `bảng Ka`; `Ka` là phiên âm tiếng Việt cho chữ `K`.

### Ghi Chú Thêm

- TODO: Thêm quy tắc đọc tên đội bóng.
- TODO: Thêm quy tắc viết tắt tên giải đấu.
- TODO: Thêm quy tắc đọc tên cầu thủ.
- TODO: Thêm quy tắc viết tỉ số, thời gian, vòng đấu.
- TODO: Thêm các nội dung đặc biệt cần có trong từng scene.

## Preset Football Preview

Dùng cho storyboard preview / nhận định trước trận.

- Tổng số scene: 7
- Tổng thời lượng mẫu: 43 giây
- Slug mẫu: `bournemouth-vs-man-city-epl-preview-2026-05-20`

| Scene | Type | Composition | Thời lượng mẫu | Vai trò nội dung |
| --- | --- | --- | ---: | --- |
| 1 | `intro` | `football-match-card` | 6s | Mở đầu bằng match card: cặp đấu, giải đấu, vòng đấu, sân, ngày giờ, form hai đội. |
| 2 | `intro` | `football-tournament-intro` | 3s | Giới thiệu giải đấu / ngữ cảnh trận đấu, có logo tournament và transition. |
| 3 | `content` | `football-lineup` | 8s | Đội hình dự kiến, formation và danh sách cầu thủ hai đội. |
| 4 | `content` | `football-odds-h2h` | 8s | Lịch sử đối đầu, bảng thông tin H2H và các trận gần nhất. |
| 5 | `content` | `quote-attrib` | 6s | Điểm nóng / câu nói nhận định, có quote, nguồn attribution và hình minh họa. |
| 6 | `content` | `football-standings-table` | 6s | Bối cảnh bảng xếp hạng, highlight các đội liên quan. |
| 7 | `outro` | `cta-card` | 6s | Kết video bằng câu hỏi dự đoán / CTA bình luận và follow. |

### Thứ Tự Composition

```text
football-match-card
football-tournament-intro
football-lineup
football-odds-h2h
quote-attrib
football-standings-table
cta-card
```

### Ghi Chú Riêng Cho Preset Preview

- Scene 1 nên có thông tin trận đấu đầy đủ: competitionLabel, stage, venue, date, time, teams, form.
- Scene 2 nên dùng `competitionLabel` kiểu preview, ví dụ `Matchweek 37 Preview`.
- Scene 3 dùng đội hình dự kiến, title có thể là `Đội hình dự kiến`.
- Scene 4 tập trung vào H2H, lịch sử đối đầu, phong độ, tỷ lệ hoặc thông tin đối đầu nổi bật.
- Scene 5 nên chọn một điểm nóng trước trận: cầu thủ đáng chú ý, HLV, áp lực vô địch, derby, vé châu Âu, trụ hạng.
- Scene 6 nên đặt trận đấu vào bối cảnh BXH hoặc cuộc đua liên quan.
- Scene 7 nên đặt câu hỏi dự đoán tỉ số để kéo bình luận, đồng thời thêm lời kêu gọi follow vào `voiceText` theo rule chung.

## Preset Football Result

Dùng cho storyboard result / tổng kết kết quả sau trận.

- Tổng số scene: 9
- Tổng thời lượng mẫu: 58 giây
- Slug mẫu: `bournemouth-1-1-man-city-epl-result-2026-05-20`

| Scene | Type | Composition | Thời lượng mẫu | Vai trò nội dung |
| --- | --- | --- | ---: | --- |
| 1 | `intro` | `football-match-card` | 6s | Mở đầu bằng kết quả chính, cặp đấu, tỉ số, bối cảnh và tác động lớn nhất. |
| 2 | `intro` | `football-tournament-intro` | 3s | Giới thiệu giải đấu / nhận diện đây là video kết quả, có logo tournament và transition. |
| 3 | `content` | `football-scoreboard` | 6s | Bảng tỉ số full-time, tóm tắt kết quả và câu chuyện chính của trận. |
| 4 | `content` | `football-lineup` | 8s | Đội hình chính thức, formation và danh sách cầu thủ xuất phát. |
| 5 | `content` | `football-player-stat` | 7s | Cầu thủ nổi bật / người tạo bước ngoặt, kèm stats cá nhân. |
| 6 | `content` | `football-timeline` | 9s | Timeline diễn biến trận đấu theo phút và các sự kiện quan trọng. |
| 7 | `content` | `football-scoreboard` | 7s | Thống kê trận đấu bằng scoreboard kết hợp stat bars. |
| 8 | `content` | `football-standings-table` | 7s | Tác động lên BXH sau trận, highlight các đội liên quan. |
| 9 | `outro` | `cta-card` | 5s | Kết video bằng câu hỏi cảm nghĩ / CTA bình luận và follow. |

### Thứ Tự Composition

```text
football-match-card
football-tournament-intro
football-scoreboard
football-lineup
football-player-stat
football-timeline
football-scoreboard
football-standings-table
cta-card
```

### Ghi Chú Riêng Cho Preset Result

- Scene 1 nên nói rõ tỉ số, sân đấu, cầu thủ ghi bàn, phút ghi bàn và tác động lớn nhất của kết quả.
- Scene 2 nên dùng `competitionLabel` kiểu result, ví dụ `Match Result`.
- Scene 3 là scoreboard full-time, có `minute: FT`, `score`, teams và scorebug nếu cần.
- Scene 4 dùng đội hình chính thức, title có thể là `Đội hình chính thức`.
- Scene 5 chọn một cầu thủ nổi bật hoặc khoảnh khắc bước ngoặt để làm player stat.
- Với composition `football-player-stat`, phải tìm kiếm hình ảnh của cầu thủ được nói tới. Nếu không tìm được hình ảnh phù hợp, để `playerImageUrl` trống và báo lại cho người dùng biết để người dùng tự tìm và thêm vào.
- Scene 6 cần có các mốc phút quan trọng: bàn thắng, thẻ phạt, thay người, cứu thua, cơ hội lớn, full-time.
- Scene 7 tập trung vào match stats: kiểm soát bóng, xG, cú sút, sút trúng đích, cơ hội lớn, phạt góc.
- Scene 8 cập nhật BXH sau trận và nêu rõ tác động đến vô địch, top 4, vé châu Âu hoặc trụ hạng.
- Scene 9 nên hỏi cảm nghĩ về kết quả / cầu thủ / bước ngoặt để kéo bình luận, đồng thời thêm lời kêu gọi follow vào `voiceText` theo rule chung.

## Preset `football-news-roundup`

Preset dạng tin tức bóng đá tổng hợp, phù hợp cho video 9 scene về một sự kiện nóng: cầu thủ được triệu tập, danh sách đội tuyển, kết quả trận, lịch thi đấu, kỷ lục, tin chuyển nhượng hoặc nhận định trước/sau trận.

### Prompt Gợi Ý

```text
Từ URL/bài viết bóng đá đã cho, hãy tổng hợp thông tin chính và dựng storyboard JSON 9 scene bằng tiếng Việt.

Yêu cầu:
- Bám nội dung bài viết gốc, có thể bổ sung nguồn tương tự nếu cần kiểm chứng số liệu, lịch, danh sách đội hình hoặc ảnh.
- Ưu tiên dùng URL ảnh thật trong bài viết/nguồn tham khảo. Nếu scene 1 cần hook mạnh, có thể tạo ảnh riêng và lưu vào assets/storyboards/<slug>/scene-1.png.
- Giữ giọng đọc ngắn, rõ, giàu nhịp bình luận bóng đá; mỗi voiceText nên có 1 ý chính.
- Scene 1 bắt buộc dùng `composition: "feng-shui-card"` và dùng ChatGPT tạo hình ảnh theo `title` của storyboard để làm ảnh cho `imageSrc` hoặc `imageUrl`. Lưu ảnh vào `assets/storyboards/<slug>/scene-1.png`. Scene 1 không hiển thị visual `channel-watermark`.
- Title của scene 1 phải ngắn gọn, gây tò mò và tạo hứng thú. `voiceText` của scene 1 phải đọc title trước, sau đó mới thêm nội dung dẫn chuyện khác.
- Scene 2-7 là nội dung chính, không cố định composition. Hãy chọn composition phù hợp nhất với nội dung từng scene: stats, timeline, context, player stat, schedule, bracket, quote, comparison hoặc các composition football/broadcast khác từ presets\composition-catalog.md nếu hợp ngữ cảnh.
- Với scene 2-7, ưu tiên kết hợp 2 composition trong cùng 1 scene khi dữ liệu phù hợp, ví dụ `stats-cards-grid` + `secondaryComposition: "infographic-chart"`, `context-bars` + `visuals.type: "highlight-image-card"`, `football-scoreboard` + `visuals.type: "football-stat-bars"`, hoặc `football-bracket-flow` + ảnh nền/motion.
- Khi có số liệu nổi bật, ưu tiên `stats-cards-grid`; nếu cần biểu đồ trong cùng scene, dùng `secondaryComposition: "infographic-chart"` + `chartType: "bar"` + `data`.
- Khi kể hành trình hoặc mốc thời gian theo chiều dọc, dùng `football-bracket-flow` với `flowVariant: "linear"`. Khi kể nhánh loại trực tiếp/đường vào chung kết, dùng `flowVariant: "branching"`.
- Scene 8 là nhận định chủ quan của chủ kênh, dùng `composition: "quote-attrib"`, `author: "Méo Bình Luận"`, `role: "Góc nhìn chủ quan"`, `imageUrl: "assets/images/meo-bl-wc-room.png"`.
- Scene 9 là CTA, hỏi cảm nghĩ, kêu gọi comment và follow.
- Thêm `sources` ở root JSON nếu có dùng nguồn bổ sung.
- Lưu file vào `storyboards/<ngày hôm nay>/<slug>.json`.
```

### Cấu Trúc 9 Scene Khuyến Nghị

| Scene | Composition | Mục đích | Gợi ý field quan trọng |
|---|---|---|---|
| 1 | `feng-shui-card` | Hook mở đầu, tiêu đề ngắn gây tò mò, ảnh tạo bằng ChatGPT theo title storyboard | `label`, `imageSrc`, `cardCaption`, `chips`; không dùng `visuals.channel-watermark` |
| 2 | Linh hoạt | Tóm tắt điểm nóng của tin | Chọn composition hợp dữ liệu; ưu tiên kết hợp thêm visual hoặc `secondaryComposition` |
| 3 | Linh hoạt | Hành trình/mốc sự kiện hoặc lớp bối cảnh tiếp theo | Có thể dùng `football-bracket-flow` + `flowVariant: "linear"` nếu là timeline thẳng |
| 4 | Linh hoạt | Spotlight cầu thủ/HLV/đội bóng trung tâm | Có thể dùng `football-player-stat`, `quote-attrib`, `comparison`, hoặc `context-bars` |
| 5 | Linh hoạt, ưu tiên scene lai | Scene số liệu tổng hợp hoặc góc phân tích | Ví dụ `stats-cards-grid` + `secondaryComposition: "infographic-chart"` |
| 6 | Linh hoạt, ưu tiên scene lai | Bối cảnh chiến thuật/danh sách/đội hình | Ví dụ `context-bars` + `visuals.type: "highlight-image-card"` |
| 7 | Linh hoạt | Lịch thi đấu, bảng đấu, diễn biến tiếp theo hoặc tác động của tin | Có thể dùng `football-upcoming-schedule`, `football-timeline`, `football-standings-table` |
| 8 | `quote-attrib` | Nhận định của Méo Bình Luận | `quote`, `author`, `role`, `imageUrl` |
| 9 | `promo-card` hoặc `cta-card` | CTA comment/follow | `promo.badge`, `promo.button`, `promo.commentPrompt`, `voiceText` |

### Mẫu Style Mặc Định

```json
{
  "bgColor": "#071A14",
  "accentColor": "#F7C948",
  "secondaryAccentColor": "#C8102E",
  "textColor": "#ffffff",
  "visuals": [
    {
      "type": "channel-watermark",
      "logoSrc": "assets/logos/logo.png",
      "username": "@vibe.bongda",
      "opacity": 0.6,
      "top": "70px",
      "right": "84px",
      "logoSize": 72,
      "fontSize": 23,
      "width": 220,
      "usernameMinWidth": 164,
      "accentColor": "#F7C948"
    }
  ]
}
```
