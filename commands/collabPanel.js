const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('collab_panel')
    .setDescription('Show collabs panel and export CSV')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    // ===== Select menu for status =====
    const select = new StringSelectMenuBuilder()
      .setCustomId('collab_status_select')
      .setPlaceholder('Choose collab status')
      .addOptions([
        {
          label: 'Active Collabs',
          value: 'active',
          emoji: '🟢'
        },
        {
          label: 'Closed Collabs',
          value: 'closed',
          emoji: '🔴'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.editReply({
      content: 'Choose which collabs to view:',
      components: [row]
    });

  }
};
