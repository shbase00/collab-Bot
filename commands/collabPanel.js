const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../db');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('collab_panel')
    .setDescription('Show collabs panel and export CSV')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const rows = db.prepare('SELECT * FROM collabs ORDER BY id DESC').all();

    const lines = rows.map(r => `${r.status === 'active' ? '🟢' : '🔴'} ${r.name} — ${r.status}`).join('\n') || 'No collabs yet.';
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('export_csv').setLabel('📥 Export CSV').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ content: `**📊 Collabs Status**\n${lines}`, components: [row], ephemeral: true });
  }
};
