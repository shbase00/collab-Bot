const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const fs = require("fs");

module.exports = {

data: new SlashCommandBuilder()
.setName("export_data")
.setDescription("Download database file")
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

async execute(interaction){

await interaction.deferReply({ephemeral:true});

const dbPath = process.env.DB_PATH || "/data/collabs.db";

if(!fs.existsSync(dbPath)){

return interaction.editReply("Database file not found.");

}

await interaction.editReply({
content:"Database downloaded:",
files:[dbPath]
});

}

};
