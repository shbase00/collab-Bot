require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const db = require('./db');

// ====== Create Client ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// ====== Load Commands ======
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// ====== Helpers: Ensure Categories & Channels ======
async function ensureStructure(guild) {
  // Categories
  let activeCat = guild.channels.cache.find(c => c.name === 'collabs-active' && c.type === ChannelType.GuildCategory);
  let closedCat = guild.channels.cache.find(c => c.name === 'collabs-closed' && c.type === ChannelType.GuildCategory);

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

  // Announcement Channel
  let ann = guild.channels.cache.find(c => c.name === 'collabs-announcements' && c.type === ChannelType.GuildText);
  if (!ann) {
    ann = await guild.channels.create({
      name: 'collabs-announcements',
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }
      ]
    });
  }

  // Logs Channel
  let logs = guild.channels.cache.find(c => c.name === 'logs' && c.type === ChannelType.GuildText);
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
    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, client, ensureStructure);
      return;
    }

    // Buttons or Select Menus
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      await handleButton(interaction);
      return;
    }

    // Modals
    if (interaction.isModalSubmit()) {
      await handleModal(interaction);
      return;
    }
  } catch (err) {
    console.error(err);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Error happened.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Error happened.', ephemeral: true });
      }
    } catch (e) {
      console.error('Failed to send error reply:', e);
    }
  }
});

// ====== Login ======
client.login(process.env.TOKEN);
