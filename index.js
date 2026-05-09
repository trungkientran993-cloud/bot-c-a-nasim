const { Client, GatewayIntentBits, Events, REST, Routes,
        SlashCommandBuilder, ActionRowBuilder, ButtonBuilder,
        ButtonStyle, EmbedBuilder, PermissionFlagsBits,
        GuildMemberRoleManager } = require("discord.js");

const TOKEN  = "MTUwMTYy..."; // ✅ đã điền
const APP_ID = "1501628832598331643"; // ✅ đã điền

const ROLE_PANELS = [
  {
    title: "Giới tính của cậu là gì nè?",
    description: "Click nút bên dưới để nhận role!",
    color: 0x5865f2,
    roles: [
      { id: "1312044213147275304", label: "Bé trai",            emoji: "👦" },
      { id: "1312055990106984448", label: "Bé gái",             emoji: "👧" },
      { id: "1312055990106984448", label: "Bé hướng lung tung", emoji: "🌈" },
    ],
  },
];
// ... (phần còn lại đã có trong file reaction-role-standalone.js)
