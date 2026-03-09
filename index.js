// --- Prevent multiple instances on Railway ---
if (process.env.INSTANCE_ID && process.env.INSTANCE_ID !== "0") {
  console.log("Secondary instance detected, exiting.");
  process.exit(0);
}
console.log("BOT STARTING...");
// Prevent running multiple instances
if (global.__bot_running__) {
  console.log("Bot already running. Exiting second instance.");
  process.exit(0);
}
global.__bot_running__ = true;

require('dotenv').config();

console.log("BOT STARTING...");

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const db = require('./db');

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

// ====== Auto Close Logic ======
async function autoCloseExpiredCollabs() {

  try {

    const now = Date.now();

    const expired = db.prepare(
      "SELECT * FROM collabs WHERE status = 'active' AND deadline <= ?"
    ).all(now);

    for (const collab of expired) {

      try {

        if (!collab.channel_id) continue;

        const channel = await client.channels.fetch(collab.channel_id).catch(() => null);
        if (!channel || !channel.guild) continue;

        const guild = channel.guild;
        const { closedCat, logs } = await ensureStructure(guild);

        let newName = channel.name;

        if (!newName.startsWith('🔴')) {
          newName = `🔴-${newName.replace(/^🟢-/, '')}`;
        }

        await channel.setName(newName).catch(() => {});
        await channel.setParent(closedCat.id).catch(() => {});
        await channel.permissionOverwrites
          .edit(guild.roles.everyone, { SendMessages: false })
          .catch(() => {});

        db.prepare("UPDATE collabs SET status = 'closed' WHERE id = ?")
          .run(collab.id);

        const contestCount = db.prepare(
          "SELECT COUNT(*) as n FROM submissions WHERE collab_id = ? AND contest_link IS NOT NULL AND contest_link != ''"
        ).get(collab.id).n;

        const walletCount = db.prepare(
          "SELECT COUNT(*) as n FROM submissions WHERE collab_id = ? AND sheet_link IS NOT NULL AND sheet_link != ''"
        ).get(collab.id).n;

        if (logs) {

          await logs.send(
            `🔴 **Auto Closed Collab:** ${collab.name}\n` +
            `📝 Contest submissions: **${contestCount}**\n` +
            `💼 Wallet sheets: **${walletCount}**`
          );

        }

      } catch (e) {
        console.error('Auto-close error for collab:', collab.id, e);
      }
    }

  } catch (err) {
    console.error('Auto-close loop error:', err);
  }
}

// ====== Ready ======
client.once('ready', () => {

  console.log(`✅ Logged in as ${client.user.tag}`);

  autoCloseExpiredCollabs();

  setInterval(() => {
    autoCloseExpiredCollabs();
  }, 10 * 60 * 1000);

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
