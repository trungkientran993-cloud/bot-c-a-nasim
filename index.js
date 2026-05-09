const {
  Client,
  GatewayIntentBits,
  Partials,
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

const TOKEN = "MTUwMTYyODgzMjU5ODMzMTY0Mw.G303OI.7sehvCuANNOOf30aUmcDyB0MOEPDAJYNqO76D4";

// ID TIN NHẮN ROLE
const MESSAGE_ID = "ID_TIN_NHAN";

// ROLE
const roles = {

  "👦": "1312044213147275304", // Bé trai
  "👧": "1312044213147275304", // Bé gái
  "🏳️‍🌈": "1312055990106984448", // LGBT

  "🤍": "1312058251977953321", // Identity V
  "💖": "1312058509365346324", // HSR
  "🩷": "1312058509365346324", // Genshin
  "🩵": "1312059085432291469", // LOL
  "🧡": "1312059279171129416", // Liqi
  "🩶": "1312059498923560980" // Roblox

};


// ===================================
// NHẬN ROLE
// ===================================

client.on(Events.MessageReactionAdd, async (reaction, user) => {

  if (user.bot) return;

  if (reaction.partial)
    await reaction.fetch();

  if (reaction.message.id !== MESSAGE_ID)
    return;

  const roleId = roles[reaction.emoji.name];

  if (!roleId) return;

  const member =
    await reaction.message.guild.members.fetch(user.id);

  await member.roles.add(roleId);

});


// ===================================
// GỠ ROLE
// ===================================

client.on(Events.MessageReactionRemove, async (reaction, user) => {

  if (user.bot) return;

  if (reaction.partial)
    await reaction.fetch();

  if (reaction.message.id !== MESSAGE_ID)
    return;

  const roleId = roles[reaction.emoji.name];

  if (!roleId) return;

  const member =
    await reaction.message.guild.members.fetch(user.id);

  await member.roles.remove(roleId);

});


// ===================================
// BOT ONLINE
// ===================================

client.once(Events.ClientReady, async () => {

  console.log(`✅ ${client.user.tag} online`);

});

client.login(TOKEN);
