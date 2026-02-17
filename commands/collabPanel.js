const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('collab_panel')
    .setDescription('Show collabs panel and export CSV')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const rows = db.prepare('SELECT * FROM collabs ORDER BY id DESC').all();

    const lines = rows.length
      ? rows.map(r => {
          const icon = r.status === 'active' ? '🟢' : '🔴';
          return `${icon} ${r.name}`;
        }).join('\n')
      : 'No collabs yet.';

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('export_csv')
        .setLabel('📥 Export CSV')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: `**📊 Collabs Status**\n${lines}`,
      components: [row],
      ephemeral: true
    });
  }
};
