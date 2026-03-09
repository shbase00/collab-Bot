const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

module.exports = {

data: new SlashCommandBuilder()
.setName('collab_panel')
.setDescription('View collabs panel')
.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

async execute(interaction) {

await interaction.reply({
content:"Select which collabs to view:",
components:[
new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId("collab_filter")
.setPlaceholder("Choose collab type")
.addOptions([
{
label:"Active Collabs",
value:"active"
},
{
label:"Closed Collabs",
value:"closed"
}
])
)
],
ephemeral:true
});

}

};
