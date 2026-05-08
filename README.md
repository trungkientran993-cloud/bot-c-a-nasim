# Discord Bot

Discord bot chạy trên Railway với tính năng chơi game và phát nhạc.

## Tính năng

### 🎮 Oẳn Tù Tì — `/ott`
Chạy lệnh `/ott` để bắt đầu. Bot sẽ hiển thị 2 nút chọn chế độ:

| Chế độ | Mô tả |
|--------|-------|
| 🤖 Chơi với Bot | Chọn Búa/Bao/Kéo, bot tự động chọn ngẫu nhiên và hiện kết quả |
| 👥 Chơi với Người | Người chơi 1 chọn bí mật → Người chơi 2 chọn → Hiện kết quả |

**Luồng PvP:**
1. Người chơi 1 dùng `/ott` → chọn "Chơi với Người"
2. Người chơi 1 nhấn nút chọn (Búa/Bao/Kéo) — lựa chọn được ẩn (ephemeral)
3. Người chơi 2 nhấn nút chọn của mình
4. Kết quả hiện ra công khai

---

### 🎵 Nhạc — `/music`

| Lệnh | Mô tả |
|------|-------|
| `/music play <tên bài / URL>` | Phát nhạc từ YouTube (tìm kiếm hoặc URL trực tiếp) |
| `/music skip` | Bỏ qua bài đang phát |
| `/music stop` | Dừng nhạc, xóa hàng chờ, rời kênh thoại |
| `/music queue` | Xem danh sách hàng chờ |

> **Lưu ý:** Bạn phải đang ở trong một kênh thoại (Voice Channel) trước khi dùng `/music play`.

---

## Cài đặt & Chạy

### Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DISCORD_TOKEN` | ✅ | Token bot từ Discord Developer Portal |
| `CLIENT_ID` | Chỉ cần cho `deploy-commands.js` | Application ID của bot |

### Chạy trên Railway
Bot tự động đăng ký slash commands khi khởi động. Chỉ cần set `DISCORD_TOKEN` là đủ.

```bash
npm start
```

### Đăng ký commands thủ công (tùy chọn)
```bash
CLIENT_ID=your_client_id DISCORD_TOKEN=your_token node deploy-commands.js
```

---

## Yêu cầu hệ thống

- Node.js 18+
- FFmpeg (được cài tự động qua `ffmpeg-static`)
- `@discordjs/opus` (cần build tools: `python`, `make`, `g++`)

### Trên Railway
Railway tự động cài build tools. Không cần cấu hình thêm.

---

## Dependencies

- `discord.js` v14 — Discord API
- `@discordjs/voice` — Voice/audio support
- `@discordjs/opus` — Audio encoding
- `ytdl-core` — YouTube audio streaming
- `yt-search` — YouTube search
- `ffmpeg-static` — FFmpeg binary
- `sodium-native` — Encryption cho voice
