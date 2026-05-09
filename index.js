require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
} = require("@discordjs/voice");

const axios = require("axios");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const memory = {};

const commands = [
  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Cho bot vào voice"),

  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Xóa trí nhớ chat"),

  new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Chat với AI")
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Tin nhắn")
        .setRequired(true)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" })
  .setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Đang đăng slash command...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("Đã đăng slash command!");
  } catch (err) {
    console.log(err);
  }
})();

client.once("ready", () => {
  console.log(`${client.user.tag} online`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // JOIN VC
  if (interaction.commandName === "join") {

    const vc = interaction.member.voice.channel;

    if (!vc) {
      return interaction.reply({
        content: "vào voice trước bro 😭",
        ephemeral: true,
      });
    }

    joinVoiceChannel({
      channelId: vc.id,
      guildId: vc.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator,
    });

    return interaction.reply("đã vào voice 😎");
  }

  // RESET MEMORY
  if (interaction.commandName === "reset") {

    memory[interaction.user.id] = [];

    return interaction.reply(
      "đã quên hết ký ức 🫠"
    );
  }

  // AI CHAT
  if (interaction.commandName === "ai") {

    const prompt =
      interaction.options.getString("message");

    if (!memory[interaction.user.id]) {
      memory[interaction.user.id] = [];
    }

    memory[interaction.user.id].push({
      role: "user",
      content: prompt,
    });

    memory[interaction.user.id] =
      memory[interaction.user.id].slice(-10);

    await interaction.deferReply();

    try {

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `
              Bạn là một người Việt nói chuyện kiểu Gen Z Discord.
              Trả lời tự nhiên như bạn bè.
              Hài nhẹ, ngắn gọn.
              Không quá toxic.
              `,
            },
            ...memory[interaction.user.id],
          ],
        },
        {
          headers: {
            Authorization:
              `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      const aiReply =
        response.data.choices[0].message.content;

      memory[interaction.user.id].push({
        role: "assistant",
        content: aiReply,
      });

      await interaction.editReply(aiReply);

      // VOICE CHAT
      const memberVC =
        interaction.member.voice.channel;

      if (memberVC) {

        const tts = await axios.post(
          "https://api.openai.com/v1/audio/speech",
          {
            model: "gpt-4o-mini-tts",
            voice: "alloy",
            input: aiReply,
          },
          {
            headers: {
              Authorization:
                `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            responseType: "arraybuffer",
          }
        );

        fs.writeFileSync("voice.mp3", tts.data);

        const connection = joinVoiceChannel({
          channelId: memberVC.id,
          guildId: memberVC.guild.id,
          adapterCreator:
            memberVC.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();

        const resource =
          createAudioResource("voice.mp3");

        player.play(resource);

        connection.subscribe(player);
      }

    } catch (err) {
      console.log(err.response?.data || err);

      interaction.editReply(
        "bot lag não rồi 😭"
      );
    }
  }
});

client.login(process.env.TOKEN);

