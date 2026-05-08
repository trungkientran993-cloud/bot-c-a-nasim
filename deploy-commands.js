/**
 * deploy-commands.js
 *
 * Standalone script to register slash commands globally.
 * Run with: node deploy-commands.js
 *
 * Requires env vars: DISCORD_TOKEN, CLIENT_ID
 * (CLIENT_ID is your bot's application/client ID from the Discord Developer Portal)
 *
 * Note: The bot also auto-registers commands on startup via the 'ready' event,
 * so this script is only needed for manual/forced re-registration.
 */

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('ott')
    .setDescription('Chơi Oẳn Tù Tì (Búa Bao Kéo)'),

  new SlashCommandBuilder()
    .setName('music')
    .setDescription('Phát nhạc từ YouTube hoặc URL')
    .addSubcommand(sub =>
      sub.setName('play')
        .setDescription('Phát nhạc')
        .addStringOption(opt =>
          opt.setName('query')
            .setDescription('Tên bài hát hoặc URL YouTube')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('skip')
        .setDescription('Bỏ qua bài hiện tại'))
    .addSubcommand(sub =>
      sub.setName('stop')
        .setDescription('Dừng nhạc và rời kênh thoại'))
    .addSubcommand(sub =>
      sub.setName('queue')
        .setDescription('Xem danh sách hàng chờ nhạc')),
].map(cmd => cmd.toJSON());

const token    = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ Thiếu DISCORD_TOKEN hoặc CLIENT_ID trong biến môi trường.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 Đang đăng ký slash commands toàn cục...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Đăng ký thành công!');
  } catch (err) {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  }
})();
