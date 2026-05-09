const {
  Client,
  GatewayIntentBits,
  Partials,
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});


// ===================================
// TOKEN RAILWAY
// ===================================

const TOKEN = process.env.TOKEN;


// ===================================
// ID KÊNH CHỌN ROLE
// ===================================

const CHANNEL_ID = "1502608926351298651";

let MESSAGE_ID = "";


// ===================================
// ROLE
// ===================================

const roles = {

  "👦": "1312044213147275304",
  "👧": "1312044213147275304",
  "🏳️‍🌈": "1312055990106984448",

  "🤍": "1312058251977953321",
  "💖": "1312058509365346324",
  "🩷": "1312058509365346324",
  "🩵": "1312059085432291469",
  "🧡": "1312059279171129416",
  "🩶": "1312059498923560980"

};


// ===================================
// BOT ONLINE
// ===================================

client.once(Events.ClientReady, async () => {

  console.log(`✅ ${client.user.tag} online`);

  try {

    const channel =
      await client.channels.fetch(CHANNEL_ID);

    // GỬI TIN NHẮN ROLE
    const msg = await channel.send(`
# 🎭 Chọn role của bạn

## 👤 Giới tính
👦 Bé trai
👧 Bé gái
🏳️‍🌈 Bé hướng lung tung

## 🎮 Game
🤍 Identity V
💖 Honkai Star Rail
🩷 Genshin Impact
🩵 LOL
🧡 Liqi
🩶 Roblox
`);

    MESSAGE_ID = msg.id;

    // THẢ REACTION
    await msg.react("👦");
    await msg.react("👧");
    await msg.react("🏳️‍🌈");

    await msg.react("🤍");
    await msg.react("💖");
    await msg.react("🩷");
    await msg.react("🩵");
    await msg.react("🧡");
    await msg.react("🩶");

    console.log("✅ MESSAGE ID:", MESSAGE_ID);

  } catch (err) {

    console.log("❌ Lỗi gửi role:", err);

  }

});


// ===================================
// NHẬN ROLE
// ===================================

client.on(Events.MessageReactionAdd, async (reaction, user) => {

  if (user.bot) return;

  try {

    if (reaction.partial)
      await reaction.fetch();

    if (reaction.message.id !== MESSAGE_ID)
      return;

    const roleId = roles[reaction.emoji.name];

    if (!roleId) return;

    const member =
      await reaction.message.guild.members.fetch(user.id);

    await member.roles.add(roleId);

  } catch (err) {

    console.log("❌ Lỗi add role:", err);

  }

});


// ===================================
// GỠ ROLE
// ===================================

client.on(Events.MessageReactionRemove, async (reaction, user) => {

  if (user.bot) return;

  try {

    if (reaction.partial)
      await reaction.fetch();

    if (reaction.message.id !== MESSAGE_ID)
      return;

    const roleId = roles[reaction.emoji.name];

    if (!roleId) return;

    const member =
      await reaction.message.guild.members.fetch(user.id);

    await member.roles.remove(roleId);

  } catch (err) {

    console.log("❌ Lỗi remove role:", err);

  }

});


// ===================================
// LOGIN
// ===================================

client.login(TOKEN);
