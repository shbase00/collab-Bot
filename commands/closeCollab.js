const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close_collab')
    .setDescription('Close a collab (choose from list)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const rows = db.prepare("SELECT id, name FROM collabs WHERE status = 'active' ORDER BY id DESC").all();

    if (!rows.length) {
      return interaction.reply({ content: '❌ No active collabs to close.', ephemeral: true });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('close_select')
      .setPlaceholder('Choose a collab to close')
      .addOptions(
        rows.map(r => ({
          label: r.name,
          value: String(r.id)
        }))
      );

    return interaction.reply({
      content: 'Select a collab to close:',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }
};
