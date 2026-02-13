require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath)) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('⏳ Registering slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(
        "1471686059690692698", // <-- Application ID بتاعك
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log('✅ Slash commands registered!');
  } catch (error) {
    console.error(error);
  }
})();
