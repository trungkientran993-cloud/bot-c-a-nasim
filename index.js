const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} = require('discord.js');

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
} = require('@discordjs/voice');

const ytdl = require('ytdl-core');
const yts = require('yt-search');
const ffmpegStatic = require('ffmpeg-static');

// ─── Constants ────────────────────────────────────────────────────────────────

const CHOICES = {
  rock:     { label: '✊ Búa',   emoji: '✊' },
  paper:    { label: '✋ Bao',   emoji: '✋' },
  scissors: { label: '✌️ Kéo',  emoji: '✌️' },
};

const CHOICE_KEYS = Object.keys(CHOICES);

// Per-guild music queues: Map<guildId, { queue: [], player, connection, playing }>
const musicQueues = new Map();

// Per-channel PvP sessions: Map<channelId, { hostId, hostChoice, message }>
const pvpSessions = new Map();

// ─── Slash command definitions ────────────────────────────────────────────────

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

// ─── Client setup ─────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// ─── Auto-register commands on ready ─────────────────────────────────────────

client.once('ready', async () => {
  console.log(`✅ Bot đã online: ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('🔄 Đang đăng ký slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    console.log('✅ Slash commands đã được đăng ký toàn cục.');
  } catch (err) {
    console.error('❌ Lỗi đăng ký commands:', err);
  }
});

// ─── Interaction handler ──────────────────────────────────────────────────────

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'ott') return handleOtt(interaction);
      if (interaction.commandName === 'music') return handleMusic(interaction);
    }

    if (interaction.isButton()) {
      const [ns, ...parts] = interaction.customId.split(':');
      if (ns === 'ott') return handleOttButton(interaction, parts);
      if (ns === 'pvp') return handlePvpButton(interaction, parts);
    }
  } catch (err) {
    console.error('❌ Lỗi xử lý interaction:', err);
    const msg = { content: '❌ Đã xảy ra lỗi. Vui lòng thử lại.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OTT — Mode selection
// ═══════════════════════════════════════════════════════════════════════════════

async function handleOtt(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ott:mode:bot')
      .setLabel('🤖 Chơi với Bot')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ott:mode:pvp')
      .setLabel('👥 Chơi với Người')
      .setStyle(ButtonStyle.Success),
  );

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('✊✋✌️ Oẳn Tù Tì')
        .setDescription('Chọn chế độ chơi:'),
    ],
    components: [row],
  });
}

// ─── OTT button router ────────────────────────────────────────────────────────

async function handleOttButton(interaction, parts) {
  const [action, ...rest] = parts;

  if (action === 'mode') {
    const mode = rest[0]; // 'bot' | 'pvp'
    if (mode === 'bot') return startBotGame(interaction);
    if (mode === 'pvp') return startPvpGame(interaction);
  }

  if (action === 'pick') {
    // ott:pick:bot:<choice>
    const [submode, choice] = rest;
    if (submode === 'bot') return resolveBotGame(interaction, choice);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OTT — Bot mode
// ═══════════════════════════════════════════════════════════════════════════════

function buildChoiceRow(prefix) {
  return new ActionRowBuilder().addComponents(
    CHOICE_KEYS.map(key =>
      new ButtonBuilder()
        .setCustomId(`${prefix}:${key}`)
        .setLabel(CHOICES[key].label)
        .setStyle(ButtonStyle.Secondary),
    ),
  );
}

async function startBotGame(interaction) {
  const row = buildChoiceRow('ott:pick:bot');

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🤖 Chơi với Bot')
        .setDescription('Chọn: **Búa**, **Bao** hoặc **Kéo**!'),
    ],
    components: [row],
  });
}

async function resolveBotGame(interaction, playerChoice) {
  const botChoice = CHOICE_KEYS[Math.floor(Math.random() * 3)];
  const result = getResult(playerChoice, botChoice);

  const resultText = {
    win:  '🎉 Bạn **thắng**!',
    lose: '😢 Bạn **thua**!',
    draw: '🤝 **Hòa**!',
  }[result];

  const color = { win: 0x57F287, lose: 0xED4245, draw: 0xFEE75C }[result];

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(color)
        .setTitle('✊✋✌️ Kết quả')
        .addFields(
          { name: '👤 Bạn chọn',  value: CHOICES[playerChoice].label, inline: true },
          { name: '🤖 Bot chọn',  value: CHOICES[botChoice].label,    inline: true },
          { name: '🏆 Kết quả',   value: resultText,                  inline: false },
        ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ott:mode:bot')
          .setLabel('🔄 Chơi lại')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ott:mode:pvp')
          .setLabel('👥 Đổi sang Chơi với Người')
          .setStyle(ButtonStyle.Success),
      ),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// OTT — PvP mode
// ═══════════════════════════════════════════════════════════════════════════════

async function startPvpGame(interaction) {
  // Clean up any existing session in this channel
  pvpSessions.delete(interaction.channelId);

  const row = buildChoiceRow('pvp:pick');

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle('👥 Chơi với Người')
    .setDescription(
      `**${interaction.user.displayName}** đã bắt đầu ván đấu!\n\n` +
      `Người chơi 1 (${interaction.user}): Hãy chọn bí mật bên dưới.\n` +
      `Người chơi 2: Chờ người chơi 1 chọn xong rồi chọn của bạn.`,
    )
    .setFooter({ text: 'Lựa chọn sẽ được ẩn cho đến khi cả hai đã chọn.' });

  await interaction.update({ embeds: [embed], components: [row] });

  // Store session
  pvpSessions.set(interaction.channelId, {
    hostId: interaction.user.id,
    hostChoice: null,
    messageId: interaction.message.id,
  });
}

async function handlePvpButton(interaction, parts) {
  const [action, choice] = parts;
  if (action !== 'pick') return;

  const session = pvpSessions.get(interaction.channelId);
  if (!session) {
    return interaction.reply({ content: '❌ Không tìm thấy phiên chơi. Hãy dùng `/ott` để bắt đầu lại.', ephemeral: true });
  }

  const userId = interaction.user.id;

  // ── Player 1 (host) picks ──────────────────────────────────────────────────
  if (userId === session.hostId && session.hostChoice === null) {
    session.hostChoice = choice;

    await interaction.reply({
      content: `✅ Bạn đã chọn **${CHOICES[choice].label}** (bí mật). Chờ người chơi 2 chọn!`,
      ephemeral: true,
    });

    // Update public message to show P1 has locked in
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('👥 Chơi với Người')
      .setDescription(
        `**Người chơi 1** (${interaction.user}) đã chọn xong ✅\n\n` +
        `**Người chơi 2**: Đến lượt bạn! Hãy chọn bên dưới.`,
      )
      .setFooter({ text: 'Lựa chọn sẽ được tiết lộ sau khi cả hai đã chọn.' });

    await interaction.message.edit({ embeds: [embed] });
    return;
  }

  // ── Player 1 tries to pick again ──────────────────────────────────────────
  if (userId === session.hostId && session.hostChoice !== null) {
    return interaction.reply({ content: '⚠️ Bạn đã chọn rồi! Chờ người chơi 2.', ephemeral: true });
  }

  // ── Player 2 tries to pick before P1 ──────────────────────────────────────
  if (session.hostChoice === null) {
    return interaction.reply({ content: '⏳ Người chơi 1 chưa chọn xong. Hãy chờ!', ephemeral: true });
  }

  // ── Player 2 picks (must be different user) ────────────────────────────────
  const p1Choice = session.hostChoice;
  const p2Choice = choice;
  const result = getResult(p1Choice, p2Choice); // from P1's perspective

  const p1User = await interaction.client.users.fetch(session.hostId).catch(() => null);
  const p1Name = p1User ? p1User.displayName ?? p1User.username : 'Người chơi 1';
  const p2Name = interaction.user.displayName ?? interaction.user.username;

  const resultLine = {
    win:  `🏆 **${p1Name}** thắng!`,
    lose: `🏆 **${p2Name}** thắng!`,
    draw: `🤝 **Hòa!**`,
  }[result];

  const color = { win: 0x57F287, lose: 0xED4245, draw: 0xFEE75C }[result];

  pvpSessions.delete(interaction.channelId);

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(color)
        .setTitle('✊✋✌️ Kết quả PvP')
        .addFields(
          { name: `👤 ${p1Name}`, value: CHOICES[p1Choice].label, inline: true },
          { name: `👤 ${p2Name}`, value: CHOICES[p2Choice].label, inline: true },
          { name: '🏆 Kết quả',   value: resultLine,              inline: false },
        ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ott:mode:pvp')
          .setLabel('🔄 Chơi lại')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('ott:mode:bot')
          .setLabel('🤖 Chơi với Bot')
          .setStyle(ButtonStyle.Primary),
      ),
    ],
  });
}

// ─── Game logic helper ────────────────────────────────────────────────────────

function getResult(a, b) {
  if (a === b) return 'draw';
  if (
    (a === 'rock'     && b === 'scissors') ||
    (a === 'scissors' && b === 'paper')    ||
    (a === 'paper'    && b === 'rock')
  ) return 'win';
  return 'lose';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC
// ═══════════════════════════════════════════════════════════════════════════════

function getQueue(guildId) {
  if (!musicQueues.has(guildId)) {
    musicQueues.set(guildId, { tracks: [], player: null, connection: null });
  }
  return musicQueues.get(guildId);
}

async function handleMusic(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'play')  return musicPlay(interaction);
  if (sub === 'skip')  return musicSkip(interaction);
  if (sub === 'stop')  return musicStop(interaction);
  if (sub === 'queue') return musicQueue(interaction);
}

// ── /music play ───────────────────────────────────────────────────────────────

async function musicPlay(interaction) {
  const voiceChannel = interaction.member?.voice?.channel;
  if (!voiceChannel) {
    return interaction.reply({ content: '🔇 Bạn cần vào kênh thoại trước!', ephemeral: true });
  }

  await interaction.deferReply();

  const query = interaction.options.getString('query');

  let videoUrl;
  let title;
  let duration;
  let thumbnail;

  try {
    if (ytdl.validateURL(query)) {
      // Direct YouTube URL
      const info = await ytdl.getBasicInfo(query);
      videoUrl  = query;
      title     = info.videoDetails.title;
      duration  = formatDuration(parseInt(info.videoDetails.lengthSeconds, 10));
      thumbnail = info.videoDetails.thumbnails.at(-1)?.url;
    } else {
      // Search YouTube
      const results = await yts(query);
      const video = results.videos[0];
      if (!video) {
        return interaction.editReply('❌ Không tìm thấy bài hát nào.');
      }
      videoUrl  = video.url;
      title     = video.title;
      duration  = video.timestamp;
      thumbnail = video.thumbnail;
    }
  } catch (err) {
    console.error('❌ Lỗi tìm kiếm nhạc:', err);
    return interaction.editReply('❌ Không thể tải thông tin bài hát. Vui lòng thử lại.');
  }

  const track = { url: videoUrl, title, duration, thumbnail, requestedBy: interaction.user.tag };
  const queue = getQueue(interaction.guildId);
  queue.tracks.push(track);

  // If already playing, just add to queue
  if (queue.player && queue.player.state.status !== AudioPlayerStatus.Idle) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📋 Đã thêm vào hàng chờ')
          .setDescription(`**[${title}](${videoUrl})**`)
          .addFields(
            { name: '⏱️ Thời lượng', value: duration || 'N/A', inline: true },
            { name: '📍 Vị trí',     value: `#${queue.tracks.length}`,  inline: true },
          )
          .setThumbnail(thumbnail || null),
      ],
    });
  }

  // Connect and start playing
  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId:   interaction.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    queue.connection = connection;

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling,  5_000),
          entersState(connection, VoiceConnectionStatus.Connecting,  5_000),
        ]);
      } catch {
        connection.destroy();
        musicQueues.delete(interaction.guildId);
      }
    });

    await playNext(interaction.guildId, interaction);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('▶️ Đang phát')
          .setDescription(`**[${title}](${videoUrl})**`)
          .addFields(
            { name: '⏱️ Thời lượng', value: duration || 'N/A', inline: true },
            { name: '🎤 Yêu cầu bởi', value: interaction.user.tag, inline: true },
          )
          .setThumbnail(thumbnail || null),
      ],
    });
  } catch (err) {
    console.error('❌ Lỗi kết nối voice:', err);
    queue.tracks.pop();
    return interaction.editReply('❌ Không thể kết nối kênh thoại. Vui lòng thử lại.');
  }
}

// ── Internal: play next track ─────────────────────────────────────────────────

async function playNext(guildId, interaction) {
  const queue = getQueue(guildId);
  if (!queue.tracks.length) {
    // Nothing left — disconnect after a short delay
    setTimeout(() => {
      const q = musicQueues.get(guildId);
      if (q?.connection) {
        q.connection.destroy();
        musicQueues.delete(guildId);
      }
    }, 30_000);
    return;
  }

  const track = queue.tracks[0];

  const stream = ytdl(track.url, {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
  });

  const resource = createAudioResource(stream);

  if (!queue.player) {
    queue.player = createAudioPlayer();
    queue.connection.subscribe(queue.player);

    queue.player.on(AudioPlayerStatus.Idle, () => {
      queue.tracks.shift();
      playNext(guildId, interaction).catch(console.error);
    });

    queue.player.on('error', err => {
      console.error('❌ Audio player error:', err);
      queue.tracks.shift();
      playNext(guildId, interaction).catch(console.error);
    });
  }

  queue.player.play(resource);
}

// ── /music skip ───────────────────────────────────────────────────────────────

async function musicSkip(interaction) {
  const queue = getQueue(interaction.guildId);
  if (!queue.player || !queue.tracks.length) {
    return interaction.reply({ content: '❌ Không có bài nào đang phát.', ephemeral: true });
  }

  const skipped = queue.tracks[0].title;
  queue.player.stop(); // triggers Idle → playNext

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('⏭️ Đã bỏ qua')
        .setDescription(`**${skipped}**`)
        .setFooter({ text: queue.tracks.length > 1 ? `Còn ${queue.tracks.length - 1} bài trong hàng chờ.` : 'Hàng chờ trống.' }),
    ],
  });
}

// ── /music stop ───────────────────────────────────────────────────────────────

async function musicStop(interaction) {
  const queue = getQueue(interaction.guildId);
  if (!queue.connection) {
    return interaction.reply({ content: '❌ Bot không đang ở trong kênh thoại nào.', ephemeral: true });
  }

  queue.tracks = [];
  queue.player?.stop();
  queue.connection.destroy();
  musicQueues.delete(interaction.guildId);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⏹️ Đã dừng nhạc')
        .setDescription('Bot đã rời kênh thoại và xóa hàng chờ.'),
    ],
  });
}

// ── /music queue ──────────────────────────────────────────────────────────────

async function musicQueue(interaction) {
  const queue = getQueue(interaction.guildId);
  if (!queue.tracks.length) {
    return interaction.reply({ content: '📋 Hàng chờ trống.', ephemeral: true });
  }

  const lines = queue.tracks.map((t, i) => {
    const prefix = i === 0 ? '▶️' : `${i + 1}.`;
    return `${prefix} **${t.title}** \`${t.duration || '?'}\` — ${t.requestedBy}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 Hàng chờ nhạc')
    .setDescription(lines.slice(0, 20).join('\n'))
    .setFooter({ text: `Tổng: ${queue.tracks.length} bài` });

  await interaction.reply({ embeds: [embed] });
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Login ────────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN);

