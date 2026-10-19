# Project Storyboard Creation Rules

- Trong `voiceText` của storyboard, **Bảng I** phải được viết hoặc đọc là **bảng Y** (chữ Y dài là phiên âm tiếng Việt cho chữ I) để giọng đọc TTS (Text-to-Speech) phát âm chuẩn và tự nhiên.
- Các trường hiển thị trên video (như `subtitle`, `title`, `subtext`, `teams`, `fixtures`, `sources`) vẫn giữ nguyên tên chính thức là **Bảng I**.
- Khi sử dụng logo giải đấu World Cup 2026 trong storyboard (như thuộc tính `tournamentLogoSrc` của composition `football-tournament-intro`), luôn sử dụng logo chính xác có đường dẫn: `assets/football/tournaments/tournaments_fifa-world-cup-2026.football-logos.cc.svg` thay vì `assets/football/tournaments/fifa-world-cup-2026.svg`.
- Trong `voiceText`, tên đội tuyển/quốc gia `Uzbekistan` phải viết là `U bê kits tan` (thay vì `Uz bê kits tan`) để TTS đọc ổn định.
- Trong `voiceText`, tên đội tuyển/quốc gia `DR Congo` phải viết và đọc là `Cộng hòa Công gô` để TTS đọc chuẩn tiếng Việt.
- Trong `voiceText`, tên đội tuyển/quốc gia `Croatia` phải viết là `Cờ rốt ti a` để TTS đọc ổn định. Các field hiển thị trên video vẫn giữ nguyên tên chính thức là `Croatia`.
- Trong `voiceText`, tên đội tuyển/quốc gia `Argentina` phải viết là `Ác hen ti na` để TTS đọc chuẩn tiếng Việt. Các field hiển thị trên video vẫn giữ nguyên tên chính thức là `Argentina`.
- Khi tạo storyboard bóng đá, bắt buộc tìm kiếm và cập nhật thông tin đội hình ra sân, danh sách cầu thủ mới nhất hiện tại của giải đấu (ví dụ danh sách triệu tập World Cup 2026 chính thức). Không lấy thông tin từ các mùa giải cũ để tránh sai sót và nhầm lẫn (ví dụ: trường hợp Álvaro Morata không được triệu tập tham dự World Cup 2026 của Tây Ban Nha).
- Trong visual `channel-watermark`, thuộc tính `username` mặc định sử dụng `@meothichbl` thay vì `@vibe.bongda`.
