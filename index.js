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
} = require('discord.js');

// ─── Constants ────────────────────────────────────────────────────────────────

const CHOICES = {
  rock:     { label: 'Đá',   emoji: '🪨', vi: 'đá' },
  paper:    { label: 'Giấy', emoji: '📄', vi: 'giấy' },
  scissors: { label: 'Kéo',  emoji: '✂️', vi: 'kéo' },
};

// What beats what: key beats value
const BEATS = {
  rock:     'scissors',
  scissors: 'paper',
  paper:    'rock',
};

const CHOICE_KEYS = Object.keys(CHOICES);

// ─── Slash command definitions ────────────────────────────────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName('oẳn')
    .setDescription('Chơi oẳn tù tì với bot! (Đá – Giấy – Kéo)'),
  new SlashCommandBuilder()
    .setName('rock-paper-scissors')
    .setDescription('Play rock-paper-scissors against the bot!'),
].map(cmd => cmd.toJSON());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomChoice() {
  return CHOICE_KEYS[Math.floor(Math.random() * CHOICE_KEYS.length)];
}

/**
 * Determine the outcome from the *user's* perspective.
 * @returns {'win'|'lose'|'draw'}
 */
function getOutcome(userKey, botKey) {
  if (userKey === botKey) return 'draw';
  return BEATS[userKey] === botKey ? 'win' : 'lose';
}

function buildGameEmbed(title) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription('Chọn **Đá**, **Giấy** hoặc **Kéo** bên dưới!')
    .setColor(0x5865f2)
    .setFooter({ text: 'Oẳn tù tì • Rock Paper Scissors' });
}

function buildResultEmbed(userKey, botKey, outcome, username) {
  const user = CHOICES[userKey];
  const bot  = CHOICES[botKey];

  const outcomeText = {
    win:  '🎉 Bạn thắng!',
    lose: '😢 Bạn thua!',
    draw: '🤝 Hoà!',
  }[outcome];

  const outcomeColor = {
    win:  0x57f287,
    lose: 0xed4245,
    draw: 0xfee75c,
  }[outcome];

  return new EmbedBuilder()
    .setTitle(`Oẳn tù tì — ${outcomeText}`)
    .setColor(outcomeColor)
    .addFields(
      { name: `${username} chọn`, value: `${user.emoji} ${user.label}`, inline: true },
      { name: 'Bot chọn',         value: `${bot.emoji}  ${bot.label}`,  inline: true },
    )
    .setFooter({ text: 'Oẳn tù tì • Rock Paper Scissors' });
}

function buildChoiceRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('rps_rock')
      .setLabel('Đá')
      .setEmoji('🪨')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('rps_paper')
      .setLabel('Giấy')
      .setEmoji('📄')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('rps_scissors')
      .setLabel('Kéo')
      .setEmoji('✂️')
      .setStyle(ButtonStyle.Danger),
  );
}

// ─── Client setup ─────────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`✅ Bot đã online: ${client.user.tag}`);

  // Register slash commands globally
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('⏳ Đang đăng ký slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    console.log('✅ Slash commands đã được đăng ký thành công!');
  } catch (err) {
    console.error('❌ Lỗi khi đăng ký slash commands:', err);
  }
});

// ─── Slash command handler ────────────────────────────────────────────────────

client.on('interactionCreate', async interaction => {
  // Handle /oẳn and /rock-paper-scissors
  if (interaction.isChatInputCommand()) {
    if (!['oẳn', 'rock-paper-scissors'].includes(interaction.commandName)) return;

    const embed = buildGameEmbed('🎮 Oẳn tù tì!');
    const row   = buildChoiceRow();

    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }

  // Handle button clicks
  if (interaction.isButton()) {
    if (!interaction.customId.startsWith('rps_')) return;

    const userKey = interaction.customId.replace('rps_', ''); // rock | paper | scissors
    if (!CHOICES[userKey]) return;

    const botKey  = randomChoice();
    const outcome = getOutcome(userKey, botKey);
    const username = interaction.user.displayName ?? interaction.user.username;

    const resultEmbed = buildResultEmbed(userKey, botKey, outcome, username);

    // Disable all buttons after a pick
    const disabledRow = new ActionRowBuilder().addComponents(
      buildChoiceRow().components.map(btn =>
        ButtonBuilder.from(btn).setDisabled(true),
      ),
    );

    await interaction.update({ embeds: [resultEmbed], components: [disabledRow] });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN);

