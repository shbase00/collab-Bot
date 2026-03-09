const {
SlashCommandBuilder,
PermissionFlagsBits,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder
} = require('discord.js');

const db = require('../db');

const PAGE_SIZE = 10;

module.exports = {

data: new SlashCommandBuilder()
.setName('collab_panel')
.setDescription('View collabs')
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

async execute(interaction) {

await interaction.reply({
content:"Choose which collabs you want to view:",
components:[
new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId("collab_type")
.setPlaceholder("Select collab type")
.addOptions([
{label:"Active Collabs",value:"active"},
{label:"Closed Collabs",value:"closed"}
])
)
],
ephemeral:true
});

}

};
