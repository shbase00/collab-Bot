require('dotenv').config();

console.log("BOT STARTING...");

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const db = require('./db');

// ===== DATABASE DEBUG =====
try {

  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all();

  console.log("TABLES:", tables);

  const count = db.prepare(
    "SELECT COUNT(*) as c FROM collabs"
  ).get();

  console.log("COLLABS COUNT:", count);

  // ⭐ معرفة قيم status الموجودة
  const statuses = db.prepare(
    "SELECT DISTINCT status FROM collabs"
  ).all();

  console.log("STATUSES:", statuses);

} catch (err) {
  console.log("Error reading tables:", err);
}

// ===== DB SIZE =====
try {

  const stats = fs.statSync("/data/collabs.db");
  console.log("DB SIZE:", stats.size);

} catch (err) {
  console.log("Error reading DB size:", err);
}

console.log("Database path: /data/collabs.db");

// ====== Create Client ======
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ====== Load Commands ======
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');

console.log("Loading commands from:", commandsPath);

if (!fs.existsSync(commandsPath)) {
  console.error("❌ Commands folder not found!");
} else {

  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {

    try {

      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if ('data' in command && 'execute' in command) {

        client.commands.set(command.data.name, command);
        console.log("✅ Loaded command:", command.data.name);

      }

    } catch (err) {
      console.error("❌ Error loading command:", file, err);
    }

  }

}

// ====== Helpers: Ensure Categories & Channels ======
async function ensureStructure(guild) {

  let activeCat = guild.channels.cache.find(
    c => c.name === 'collabs-active' && c.type === ChannelType.GuildCategory
  );

  let closedCat = guild.channels.cache.find(
    c => c.name === 'collabs-closed' && c.type === ChannelType.GuildCategory
  );

  if (!activeCat) {
    activeCat = await guild.channels.create({
      name: 'collabs-active',
      type: ChannelType.GuildCategory
    });
  }

  if (!closedCat) {
    closedCat = await guild.channels.create({
      name: 'collabs-closed',
      type: ChannelType.GuildCategory
    });
  }

  let ann = guild.channels.cache.find(
    c => c.name === 'collabs-announcements' && c.type === ChannelType.GuildText
  );

  if (!ann) {
    ann = await guild.channels.create({
      name: 'collabs-announcements',
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }
      ]
    });
  }

  let logs = guild.channels.cache.find(
    c => c.name === 'logs' && c.type === ChannelType.GuildText
  );

  if (!logs) {
    logs = await guild.channels.create({
      name: 'logs',
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }
      ]
    });
  }

  return { activeCat, closedCat, ann, logs };
}

// ====== Interaction Handlers ======
const { handleButton } = require('./interactions/buttons');
const { handleModal } = require('./interactions/modals');

// ====== Ready ======
client.once('ready', () => {

  console.log(`✅ Logged in as ${client.user.tag}`);

});

// ====== Interaction Create ======
client.on('interactionCreate', async interaction => {

  try {

    if (interaction.isChatInputCommand()) {

      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction, client, ensureStructure);
      return;

    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {

      await handleButton(interaction);
      return;

    }

    if (interaction.isModalSubmit()) {

      await handleModal(interaction);
      return;

    }

  } catch (err) {

    console.error(err);

    try {

      if (interaction.replied || interaction.deferred) {

        await interaction.followUp({
          content: '❌ Error happened.',
          ephemeral: true
        });

      } else {

        await interaction.reply({
          content: '❌ Error happened.',
          ephemeral: true
        });

      }

    } catch (e) {
      console.error('Failed to send error reply:', e);
    }

  }

});

// ===== Health server for Railway =====
const http = require("http");

const PORT = process.env.PORT || 8080;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot running");
}).listen(PORT, () => {
  console.log("Health server running on port", PORT);
});

// ===== Login =====
console.log("Connecting to Discord...");

client.login(process.env.DISCORD_TOKEN)
.then(() => {
  console.log("Discord login success");
})
.catch(err => {
  console.error("Discord login error:", err);
});
