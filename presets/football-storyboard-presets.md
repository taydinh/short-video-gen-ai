# Football Storyboard Presets

Tài liệu này lưu cấu trúc preset khi tạo storyboard JSON cho video bóng đá.

Nguồn mẫu:

- Preview: `storyboards\19-05-2026\bournemouth-vs-man-city-epl-preview-2026-05-20.json`
- Result: `storyboards\20-05-2026\bournemouth-1-1-man-city-epl-result-2026-05-20.json`

## Ghi Chú Chung

### Quy Đổi Múi Giờ Lịch Thi Đấu

- Toàn bộ lịch thi đấu trong storyboard phải quy đổi sang múi giờ Việt Nam (`UTC+7`) trước khi ghi vào JSON, bao gồm `voiceText`, `date`, `time`, `ctaLabel`, `subtext`, `fixtures` và mọi field hiển thị thời gian khác.
- Khi nguồn dùng múi giờ khác như BST, CET, CEST, GMT, ET hoặc giờ địa phương của sân, phải tính lại ngày giờ theo Việt Nam. Nếu sau quy đổi bị sang ngày hôm sau, phải ghi đúng ngày mới trong cả lời đọc và field lịch thi đấu.
- Trong `voiceText`, không đọc theo giờ nước ngoài nếu nội dung hướng tới khán giả Việt Nam. Ví dụ: `20:00 BST ngày 30/05` phải đổi thành `hai giờ sáng, ngày ba mươi mốt tháng năm theo giờ Việt Nam`.

### Composition `football-standings-table`

- Khi dùng composition `football-standings-table`, bảng xếp hạng phải lấy ít nhất 7 đội xung quanh 2 đội bóng đang được nói tới. Nếu bối cảnh cần nhìn rộng hơn, có thể lấy từ vị trí số 1 đến vị trí thấp nhất của đội liên quan, hoặc lấy thêm các đội trong cùng cuộc đua.
- Nếu scene dùng `football-standings-table` để hiển thị nhánh đấu / cặp đấu liên quan và không khai báo `standings` hoặc `standingsGroups`, renderer không được tự động thêm bảng xếp hạng mặc định; chỉ hiển thị các phần dữ liệu được khai báo như `h2hMatches`.

### Quan Hệ Giữa `voiceText` Và `subtitle`

- `voiceText` và `subtitle` phải là cùng một nội dung/kịch bản của scene: cùng ý chính, cùng thứ tự thông tin, không thêm dữ kiện mới ở một field mà field còn lại không có.
- `voiceText` là bản chỉnh riêng để tạo audio TTS: được Việt hóa, phiên âm tên riêng, viết số thành chữ, thêm dấu phẩy ngắt nhịp, hoặc dùng cách đọc tối ưu để giọng đọc ổn định.
- `subtitle` là bản hiển thị ngoài video cho người xem đọc: giữ tên chính thức/bản gốc, dùng ký hiệu và số liệu gọn như `2026`, `3-1`, `32'`, `75%`, `World Cup`, `PSG`, `Real Madrid`; không đưa phiên âm TTS vào subtitle.
- Hai field có thể nhìn không giống hệt từng chữ, nhưng phải kể cùng một kịch bản. Ví dụ `voiceText` đọc `World Cup hai không hai sáu` thì `subtitle` hiển thị `World Cup 2026`; `voiceText` đọc `Pi S Ji` thì `subtitle` hiển thị `PSG`.

### Cách Đọc Và Viết Tắt Tên Đội Bóng

- Manchester United có thể ghi tắt và đọc tắt là `Man U` hoặc `MU` (đọc là `Mờ U`), nhưng không được ghi hoặc đọc chỉ là `United`.
- Manchester City có thể ghi tắt và đọc tắt là `Man City` hoặc `MC` (đọc là `Mờ C`), nhưng không được ghi hoặc đọc chỉ là `City`.
- Trong `voiceText`, các tên đội sau phải viết theo phiên âm để TTS đọc ổn định. Quy tắc này chỉ áp dụng cho `voiceText`; các field hiển thị trên video như `subtitle`, `title`, `subtext`, `teams`, `promo`, `sources` phải giữ tên chính thức/bản gốc để người xem đọc đúng thương hiệu:
  - `Arsenal` viết là `a se nồ`.
  - `Paris Saint Germain` viết là `pa rís sen ger mình`.
  - `PSG` viết là `Pi S Ji`.
  - `Man U` viết là `mờ u`.
  - `Liverpool` viết là `li vơ pun`.
  - `Portugal` viết là `Bồ Đào Nha`.
  - `Croatia` viết là `cờ rót ti a`.
- Trong `voiceText`, tên đội tuyển/quốc gia `Uzbekistan` phải viết là `Uz bê kits tan` để TTS đọc ổn định. Các field hiển thị trên video như `subtitle`, `title`, `subtext`, `teams`, `fixtures`, `sources` vẫn giữ tên chính thức/bản gốc.
- Trong `voiceText`, tên cầu thủ `Kevin De Bruyne` phải viết là `Kê Vin Đờ Broai Nơ` để TTS đọc ổn định. Các field hiển thị trên video như `subtitle`, `title`, `subtext`, `player`, `cards`, `sources` vẫn giữ tên chính thức/bản gốc.

### Hiển Thị Logo Và Cấu Hình Flag Đội Bóng

- Khi hiển thị logo của đội bóng Tottenham Hotspur / Tottenham / Spurs, phải dùng `badgeBackgroundColor` màu trắng (`#ffffff`) trong object team để logo nổi rõ, bao gồm các scene dùng `football-match-card`, `football-scoreboard`, `football-lineup`, `football-odds-h2h`, `football-stat-bars` và `football-standings-table`.
- Với scene `football-odds-h2h`, nếu Tottenham Hotspur / Tottenham / Spurs xuất hiện trong `h2hMatches`, phải truyền thêm metadata logo cho đúng bên của trận đấu, ví dụ `homeBadgeSrc` hoặc `awayBadgeSrc` trỏ tới logo Tottenham và `homeBadgeBackgroundColor` hoặc `awayBadgeBackgroundColor` là `#ffffff`. Nên thêm `homeBadgePadding` / `awayBadgePadding` khoảng `6` và `homeBadgeBorderRadius` / `awayBadgeBorderRadius` là `999` để logo nổi rõ trên nền tối.
- **Tra Cứu Logo/Flag Có Sẵn Trước Khi Ghi Storyboard**:
  - Trước khi tự tìm logo bên ngoài, luôn kiểm tra `assets/football/index.json` để lấy logo câu lạc bộ và flag đội tuyển quốc gia đã có sẵn trong repo.
  - Tìm bản ghi theo `name`, `aliases`, `codes.short`, `competition` hoặc `id`. Với câu lạc bộ, ưu tiên bản ghi có `kind: "club"` và đúng giải đấu ở `competition` như `epl`, `bundesliga`, `ligue-1`, `v-league-1`, `saudi-pro-league`. Với đội tuyển quốc gia, ưu tiên `kind: "national"`; các đội tuyển World Cup thường có `competition: "wc2026"`.
  - Đường dẫn cần dùng trong storyboard nằm tại `badge.path`. Nếu `badge.type` là `logo`, dùng giá trị này cho `logoSrc` và/hoặc `badgeSrc`. Nếu `badge.type` là `flag`, dùng giá trị này cho `flagSrc` và/hoặc `badgeSrc`.
  - Không tự đoán sai thư mục hoặc phần mở rộng file. Luôn copy chính xác `badge.path` từ index, ví dụ `assets/football/clubs/ligue-1/paris-saint-germain.svg` hoặc `assets/football/flags/uzbekistan.svg`.
  - Nếu nhiều bản ghi cùng tên, chọn bản ghi khớp bối cảnh trận đấu nhất theo `competition`, `kind`, `aliases` và `codes.short`; ví dụ `Paris Saint-Germain (PSG)` phải dùng bản ghi club của `ligue-1`, còn `France` phải dùng bản ghi national.
  - Kiểm tra `badge.path` không được là `null` trước khi đưa vào JSON. Nếu bản ghi có `badge.path: null`, coi như chưa có asset render được; cần tìm/tải asset mới hoặc để trống và báo lại cho người dùng.
  - Khi cần ghi nguồn hoặc kiểm tra license, đọc `assets/football/ATTRIBUTION.md` và/hoặc các field trong index: `badge.sourceUrl`, `badge.licenseName`, `badge.licenseUrl`, `badge.sourceSvgUrl`, `badge.sourcePngUrl`. Với logo có license editorial, chỉ dùng cho ngữ cảnh minh họa/editorial trong video bóng đá.
  - Nếu thêm hoặc thay thế logo/flag thủ công, phải cập nhật cả `assets/football/index.json` và `assets/football/ATTRIBUTION.md` để lần sau có thể tra cứu lại đúng asset và attribution.
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
- Scene cuối của tất cả storyboard phải dùng `composition: "promo-card"` theo mẫu scene cuối trong `storyboards\21-05-2026\robert-lewandowski-chia-tay-barcelona.json`.
- Scene cuối nên có object `promo` gồm các field chính: `badge`, `button`, `url`, `commentPrompt`, `logoSrc`, `logos`.
- `promo.button` mặc định dùng `FOLLOW KÊNH`, `promo.url` mặc định dùng `@meothichbl`, `promo.logoSrc` mặc định dùng `assets/logos/logo.png`.
- Visual scene cuối nên dùng mảng `visuals` với `football-confetti`, ví dụ `particleCount` khoảng 80-90 và `duration` khoảng 4.6-5.2 giây.

### Tổng Hợp VoiceText Sau Khi Tạo Storyboard

- Tạo storyboard JSON và lưu vào thư mục `/storyboards` với thư mục con có tên theo ngày hôm nay. Nếu thư mục ngày hôm nay chưa có thì tạo thư mục mới trước khi lưu file.
- Sau khi tạo storyboard JSON, phải tổng hợp toàn bộ `voiceText` trong JSON theo thứ tự scene và gửi lại cho người dùng xem.
- Khi tạo `voiceText`, nếu một câu quá dài thì phải thêm dấu phẩy `,` vào các điểm ngắt tự nhiên để tạo nhịp đọc, tránh để câu liền mạch quá dài làm TTS tạo voice bị lỗi.

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
- Trong `voiceText`, `cúp FA` phải viết/đọc là `cúp ép a`; không để nguyên `FA` trong lời đọc.
- Trong `voiceText`, `bảng K` phải viết/đọc là `bảng Ka`; `Ka` là phiên âm tiếng Việt cho chữ `K`.
- Trong `voiceText`, tên sân `Bernabéu` phải viết là `Bernabeu` để TTS đọc ổn định; không dùng ký tự `é` trong lời đọc.

### Cách Đọc Tên Cầu Thủ / HLV Trong VoiceText

- Trong `voiceText`, tên cầu thủ `Harry Maguire` phải viết là `ha ri mác gai` để TTS đọc ổn định. Các field hiển thị trên video vẫn giữ tên chính thức/bản gốc.
- Trong `voiceText`, tên HLV `Thomas Tuchel` phải viết là `thôm mát tu cồ` để TTS đọc ổn định. Các field hiển thị trên video vẫn giữ tên chính thức/bản gốc.
- Trong `voiceText`, tên cầu thủ `Mbappé` phải viết là `em pa bê` để TTS đọc ổn định. Các field hiển thị trên video vẫn giữ tên chính thức/bản gốc.
- Trong `voiceText`, tên cầu thủ `Dembélé` phải viết là `đem bê lê` để TTS đọc ổn định. Các field hiển thị trên video vẫn giữ tên chính thức/bản gốc.
- Trong `voiceText`, tên cầu thủ `Havertz` phải viết là `ha vớt` để TTS đọc ổn định. Các field hiển thị trên video vẫn giữ tên chính thức/bản gốc.
- Trong `voiceText`, tên cầu thủ `Van Dijk` phải viết là `Van Đai` để TTS đọc ổn định. Các field hiển thị trên video vẫn giữ tên chính thức/bản gốc.

### Cách Đọc Sơ Đồ Đội Hình Trong VoiceText

- Trong `voiceText`, khi nói về số `4` trong sơ đồ đội hình (ví dụ `4-3-3`, `4-2-3-1`, `5-4-1`), phải viết là `bốn` chứ không được viết là `tư`. Ví dụ: `sơ đồ bốn ba ba`, `sơ đồ năm bốn một` thay vì `sơ đồ năm tư một`.

### Ghi Chú Thêm

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
| 7 | `outro` | `promo-card` | 6s | Kết video bằng câu hỏi dự đoán / CTA bình luận và follow. |

### Thứ Tự Composition

```text
football-match-card
football-tournament-intro
football-lineup
football-odds-h2h
quote-attrib
football-standings-table
promo-card
```

### Ghi Chú Riêng Cho Preset Preview

- Scene 1 và scene 2 không dùng visual `channel-watermark`.
- Scene 1 nên có thông tin trận đấu đầy đủ: competitionLabel, stage, venue, date, time, teams, form.
- Scene 2 nên dùng `competitionLabel` kiểu preview, ví dụ `Matchweek 37 Preview`.
- `voiceText` của scene 2 nên ngắn gọn, chỉ giới thiệu nhanh bối cảnh/giải đấu, tránh diễn giải dài.
- Scene 3 dùng đội hình dự kiến, title có thể là `Đội hình dự kiến`.
- Scene 4 tập trung vào H2H, lịch sử đối đầu, phong độ, tỷ lệ hoặc thông tin đối đầu nổi bật.
- Scene 5 nên chọn một điểm nóng trước trận: cầu thủ đáng chú ý, HLV, áp lực vô địch, derby, vé châu Âu, trụ hạng. Với scene 5 dùng `quote-attrib`, thuộc tính `imageUrl` nên được đặt mặc định là `"assets/images/meo-bl-wc-room.png"`.
- Scene 6 nên đặt trận đấu vào bối cảnh BXH hoặc cuộc đua liên quan.
- Scene 7 nên đặt câu hỏi dự đoán tỉ số để kéo bình luận, đồng thời thêm lời kêu gọi follow vào `voiceText` theo rule chung.

## Preset Football Result

Dùng cho storyboard result / tổng kết kết quả sau trận.

- Tổng số scene: 8
- Tổng thời lượng mẫu: 52 giây
- Slug mẫu: `south-africa-0-1-canada-world-cup-result-2026-06-29`

| Scene | Type | Composition | Thời lượng mẫu | Vai trò nội dung |
| --- | --- | --- | ---: | --- |
| 1 | `intro` | `football-scoreboard` | 6s | Mở đầu bằng bảng tỉ số full-time, hook kết quả chính, cặp đấu, bối cảnh, cầu thủ ghi bàn và tác động lớn nhất. |
| 2 | `intro` | `football-tournament-intro` | 3s | Giới thiệu giải đấu / nhận diện đây là video kết quả, có logo tournament và transition. |
| 3 | `content` | `football-lineup` | 8s | Đội hình chính thức, formation và danh sách cầu thủ xuất phát. |
| 4 | `content` | `football-player-stat` | 7s | Cầu thủ nổi bật / người tạo bước ngoặt, kèm stats cá nhân. |
| 5 | `content` | `football-timeline` | 9s | Timeline diễn biến trận đấu theo phút và các sự kiện quan trọng. |
| 6 | `content` | `football-scoreboard` | 7s | Thống kê trận đấu bằng scoreboard kết hợp stat bars. |
| 7 | `content` | `football-standings-table` | 7s | Tác động sau trận: BXH, nhánh đấu, vòng tiếp theo hoặc các cặp đấu liên quan. |
| 8 | `outro` | `promo-card` | 5s | Kết video bằng câu hỏi cảm nghĩ / CTA bình luận và follow. |

### Thứ Tự Composition

```text
football-scoreboard
football-tournament-intro
football-lineup
football-player-stat
football-timeline
football-scoreboard
football-standings-table
promo-card
```

### Ghi Chú Riêng Cho Preset Result

- Scene 1 và scene 2 không dùng visual `channel-watermark`.
- Scene 1 dùng `composition: "football-scoreboard"` và đóng vai trò gộp hook mở đầu với bảng tỉ số full-time. Scene này phải có `minute: "FT"`, `score`, `teams`, `competitionLabel`, có thể thêm `stage`, `venue`, `date`, `time`, và visual `football-scorebug` nếu cần.
- Scene 1 nên nói rõ tỉ số, sân đấu, cầu thủ ghi bàn, phút ghi bàn, mô tả ngắn pha ghi bàn và tác động lớn nhất của kết quả. Không dùng visual `video` hoặc `video-clip-card` trong scene này vì `football-scoreboard` không hỗ trợ video trực tiếp theo catalog.
- Scene 2 nên dùng `competitionLabel` kiểu result, ví dụ `Match Result`.
- `voiceText` của scene 2 nên ngắn gọn, chỉ chuyển nhịp sang phần kết quả/giải đấu, tránh diễn giải dài.
- Scene 3 dùng đội hình chính thức, title có thể là `Đội hình chính thức`.
- Scene 4 chọn một cầu thủ nổi bật hoặc khoảnh khắc bước ngoặt để làm player stat.
- Với composition `football-player-stat`, phải tìm kiếm hình ảnh của cầu thủ được nói tới. Nếu không tìm được hình ảnh phù hợp, để `playerImageUrl` trống và báo lại cho người dùng biết để người dùng tự tìm và thêm vào.
- Scene 5 cần có các mốc phút quan trọng: bàn thắng, thẻ phạt, thay người, cứu thua, cơ hội lớn, full-time. Không dùng visual `video` hoặc `video-clip-card` trong scene `football-timeline`.
- Scene 6 tập trung vào match stats: kiểm soát bóng, chỉ số bàn thắng kỳ vọng, cú sút, sút trúng đích, cơ hội lớn, phạt góc.
- Scene 7 cập nhật tác động sau trận. Nếu còn ở vòng bảng/giải league thì dùng `standings`. Nếu đã vào vòng loại trực tiếp thì có thể bỏ `standings` và dùng `h2hMatches` để hiển thị các cặp đấu liên quan, nhánh tiếp theo hoặc trận diễn ra hôm nay/ngày mai.
- Scene 8 nên hỏi cảm nghĩ về kết quả / cầu thủ / bước ngoặt / nhánh đấu tiếp theo để kéo bình luận, đồng thời thêm lời kêu gọi follow vào `voiceText` theo rule chung.

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
      "username": "@meothichbl",
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
