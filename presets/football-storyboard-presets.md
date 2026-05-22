# Football Storyboard Presets

Tài liệu này lưu cấu trúc preset khi tạo storyboard JSON cho video bóng đá.

Nguồn mẫu:

- Preview: `storyboards\19-05-2026\bournemouth-vs-man-city-epl-preview-2026-05-20.json`
- Result: `storyboards\20-05-2026\bournemouth-1-1-man-city-epl-result-2026-05-20.json`

## Ghi Chú Chung

### Cách Đọc Và Viết Tắt Tên Đội Bóng

- Manchester United có thể ghi tắt và đọc tắt là `Man U` hoặc `MU` (đọc là `Mờ U`), nhưng không được ghi hoặc đọc chỉ là `United`.
- Manchester City có thể ghi tắt và đọc tắt là `Man City` hoặc `MC` (đọc là `Mờ C`), nhưng không được ghi hoặc đọc chỉ là `City`.

### Hiển Thị Logo Và Cấu Hình Flag Đội Bóng

- Khi hiển thị logo của đội bóng Tottenham Hotspur / Tottenham / Spurs, phải dùng `badgeBackgroundColor` màu trắng (`#ffffff`) trong object team để logo nổi rõ, bao gồm các scene dùng `football-match-card`, `football-scoreboard`, `football-lineup`, `football-stat-bars` và `football-standings-table`.
- **Cơ Chế Tự Động Tìm Kiếm Và Đồng Bộ Logo/Flag (`src/steps/02-generate-storyboard.js`)**:
  - **Dựa vào Asset Index**: Hệ thống tự động tra cứu trong tệp `assets/football/index.json`. Thuật toán so khớp (`findFootballAssetForTeam`) sẽ chuẩn hóa tên đội bóng/mã đội (loại bỏ dấu tiếng Việt, ký tự đặc biệt, đưa về lowercase) và tính điểm để tìm bản ghi phù hợp nhất.
  - **Đội tuyển Quốc gia (National Teams)**: Bản ghi được lưu trữ tại `assets/football/flags/` (Ví dụ: `assets/football/flags/portugal.svg` cho Bồ Đào Nha). Thuộc tính tương ứng được tự động điền là `flagSrc` và `badgeSrc`.
  - **Câu lạc bộ (Clubs)**: Nếu không tìm thấy trong index, hệ thống sẽ cố gắng suy luận giải đấu (như `epl`, `v-league-1`) và tìm kiếm file ảnh cục bộ tại `assets/football/clubs/{competition}/{slug}.{svg|png|webp}`. Thuộc tính tương ứng được điền là `logoSrc` và `badgeSrc`.
  - **Đồng bộ tự động từ Wikimedia**: Nếu cả hai cách trên đều không tìm thấy logo/flag phù hợp, hệ thống sẽ thực hiện gọi script đồng bộ `syncFootballAssets` để tìm kiếm và tải xuống logo/flag thực tế từ Wikimedia Commons một cách tự động, sau đó cập nhật lại index cục bộ.
- **Cú Pháp Khai Báo Trong Storyboard JSON**:
  - Với đội hình (`football-lineup`) hoặc bảng tỉ số (`football-scoreboard`), khi khai báo trực tiếp các đội bóng trong mảng `teams`, các thuộc tính ảnh có thể sử dụng linh hoạt bao gồm: `flag`, `flagUrl`, `flagSrc` (đối với đội tuyển quốc gia) hoặc `logo`, `logoUrl`, `logoSrc` (đối với câu lạc bộ). Nếu các thuộc tính này bị trống hoặc lỗi, hệ thống sẽ chạy cơ chế tự động tìm kiếm trên để điền vào.
  - Với lịch thi đấu (`football-upcoming-schedule`), các đối tượng đội `home` và `away` trong mảng `fixtures` cũng cần khai báo đường dẫn flag/logo chính xác để render đúng giao diện. Tránh ghi sai định dạng tệp hoặc thư mục (ví dụ: dùng nhầm `.png` thay vì `.svg` hoặc để nhầm thư mục `tournaments` thay vì `flags`). Đường dẫn logo giải đấu chung (ví dụ World Cup) nằm ở `assets/football/tournaments/{tên-logo}.svg`.


### VoiceText Scene Cuối

- `voiceText` của scene cuối cùng phải có lời kêu gọi follow: `Tôi là Méo bình luận, đừng quên follow để cập nhật các thông tin bóng đá mới nhất nhé!`

### Tổng Hợp VoiceText Sau Khi Tạo Storyboard

- Tạo storyboard JSON và lưu vào thư mục `/storyboards` với thư mục con có tên theo ngày hôm nay. Nếu thư mục ngày hôm nay chưa có thì tạo thư mục mới trước khi lưu file.
- Sau khi tạo storyboard JSON, phải tổng hợp toàn bộ `voiceText` trong JSON theo thứ tự scene và gửi lại cho người dùng xem.

### Cách Đọc Chỉ Số Thống Kê

- Với visuals có `"type": "football-stat-bars"`, nếu `voiceText` có xuất hiện chữ `xG` thì phải đọc qua tiếng Việt là `chỉ số bàn thắng kỳ vọng`; không để nguyên `xG` trong `voiceText`.
- Ví dụ: thay `Bournemouth đạt xG một phẩy chín chín` bằng `Bournemouth có chỉ số bàn thắng kỳ vọng một phẩy chín chín`.

### Cách Đọc Năm Trong VoiceText

- Với các năm dạng bốn chữ số trong `voiceText`, không đọc kiểu `hai nghìn không trăm hai mươi sáu`.
- Các năm bắt đầu bằng `20` đọc ngắn theo từng cụm số: `2026` đọc là `hai không hai sáu`, `2018` đọc là `hai không mười tám`.
- Nếu sau `20` có thêm số `0`, đọc số `0` đầu là `không` và số `0` thứ hai là `lẻ`; ví dụ `2006` đọc là `hai không lẻ sáu`.
- Các năm bắt đầu bằng `19` đọc từng chữ số; ví dụ `1996` đọc là `một chín chín sáu`.

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
- Ưu tiên dùng URL ảnh thật trong bài viết/nguồn tham khảo.
- Giữ giọng đọc ngắn, rõ, giàu nhịp bình luận bóng đá; mỗi voiceText nên có 1 ý chính.
- Scene 1 bắt buộc dùng `composition: "feng-shui-card"`. Ưu tiên lấy hình ảnh từ URL trực tiếp từ bài báo hoặc tìm kiếm hình ảnh từ các bài báo tương tự. Nếu không có hình ảnh thì để trống (để rỗng `imageSrc` hoặc `imageUrl`), tôi sẽ tự thêm vào sau. Scene 1 không hiển thị visual `channel-watermark`.
- Title của scene 1 phải ngắn gọn, gây tò mò và tạo hứng thú. `voiceText` của scene 1 phải đọc title trước, sau đó mới thêm nội dung dẫn chuyện khác.
- Sử dụng cấu trúc 9 scene khuyến nghị dựa trên storyboard `storyboards\21-05-2026\pep-guardiola-chia-tay-man-city-sau-10-nam.json`.
- Scene 2: `stats-cards-grid` (tổng quan thông số ban đầu).
- Scene 3: `football-bracket-flow` với flowVariant: "linear" (hành trình/cột mốc sự kiện).
- Scene 4: `football-player-stat` (spotlight cầu thủ/HLV/đội bóng).
- Scene 5: `stats-cards-grid` + `secondaryComposition: "infographic-chart"` (bảng vàng thành tích/số liệu chi tiết).
- Scene 6: `context-bars` + visual `highlight-image-card` (ứng cử viên/phân tích chiến thuật/danh sách).
- Scene 7: `football-upcoming-schedule` hoặc linh hoạt (lịch thi đấu/bối cảnh tiếp theo).
- Scene 8: `quote-attrib` (nhận định chủ quan của Méo Bình Luận: `author: "Méo bình luận"`, `role: "Góc nhìn chủ quan"`, `imageUrl: "assets/images/meo-bl-wc-room.png"`).
- Scene 9: `promo-card` (CTA tương tác, hỏi ý kiến khán giả kéo comment và kêu gọi follow).
- Thêm `sources` ở root JSON nếu có dùng nguồn bổ sung.
- Lưu file vào `storyboards/<ngày hôm nay>/<slug>.json`.
```

### Cấu Trúc 9 Scene Khuyến Nghị (Dựa trên `storyboards\21-05-2026\pep-guardiola-chia-tay-man-city-sau-10-nam.json`)

| Scene | Composition | Mục đích | Gợi ý field quan trọng |
|---|---|---|---|
| 1 | `feng-shui-card` | Hook mở đầu, tiêu đề ngắn gây tò mò, ưu tiên lấy ảnh từ url trực tiếp từ bài báo/tin tức tương tự, nếu không có thì để trống | `label`, `imageSrc`, `cardCaption`, `chips`; không dùng `visuals.channel-watermark` |
| 2 | `stats-cards-grid` | Tóm tắt điểm nóng hoặc tổng quan thông số ban đầu | `statsCards`; có thể dùng `football-pitch-lines` ở background |
| 3 | `football-bracket-flow` | Hành trình hoặc các mốc sự kiện quan trọng (`flowVariant: "linear"`) | `stages`, `flowVariant`, `secondaryComposition` (ví dụ `flashcard-gallery`), `cards` |
| 4 | `football-player-stat` | Spotlight cầu thủ/HLV/đội bóng trung tâm | `player`, `team`, `playerImageUrl`, `stats` |
| 5 | `stats-cards-grid` + `secondaryComposition: "infographic-chart"` | Bảng vàng thành tích hoặc thông số tổng hợp chi tiết | `statsCards`, `chartTitle`, `chartType` ("bar"), `data` |
| 6 | `context-bars` + visual `highlight-image-card` | Chi tiết ứng cử viên, phân tích chiều sâu hoặc sơ đồ chiến thuật | `bars`, visuals với type `"highlight-image-card"` |
| 7 | `football-upcoming-schedule` (hoặc linh hoạt) | Lịch thi đấu sắp tới, diễn biến tiếp theo hoặc bối cảnh tiếp diễn | `activeTab`, `tabs`, `fixtures` (home, away, flag, date, time) |
| 8 | `quote-attrib` | Nhận định của Méo Bình Luận | `quote`, `author`: "Méo bình luận", `role`: "Góc nhìn chủ quan", `imageUrl`: "assets/images/meo-bl-wc-room.png" |
| 9 | `promo-card` | CTA comment/follow | `promo.badge`, `promo.button`, `promo.commentPrompt`, `promo.logos` |

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
