const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_collab')
    .setDescription('Create a new collab')

    // ===== Required options FIRST =====
    .addStringOption(opt =>
      opt.setName('name').setDescription('Collab name').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('spots').setDescription('Spots info (e.g. T1 = 10 GTD & 15 FCFS / T2 = 5 GTD & 10 FCFS)').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('description').setDescription('Collab description').setRequired(true)
    )

    // ===== Optional options AFTER =====
    .addIntegerOption(opt =>
      opt.setName('deadline_hours').setDescription('Hours until close').setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('deadline_minutes').setDescription('Minutes until close').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('note').setDescription('Optional note').setRequired(false)
    )
    .addAttachmentOption(opt =>
      opt.setName('image').setDescription('Optional image for the collab').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client, ensureStructure) {
    const name = interaction.options.getString('name');
    const spots = interaction.options.getString('spots');
    const description = interaction.options.getString('description');
    const hours = interaction.options.getInteger('deadline_hours') || 0;
    const minutes = interaction.options.getInteger('deadline_minutes') || 0;
    const note = interaction.options.getString('note') || '—';
    const image = interaction.options.getAttachment('image'); // ممكن تبقى null

    if (hours === 0 && minutes === 0) {
      return interaction.reply({ content: '❌ You must provide hours or minutes (or both).', ephemeral: true });
    }

    const totalMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
    const deadline = Date.now() + totalMs;

    // Discord relative timestamp
    const deadlineUnix = Math.floor(deadline / 1000);
    const relativeTime = `<t:${deadlineUnix}:R>`;

    const guild = interaction.guild;
    const { activeCat } = await ensureStructure(guild);

    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const channel = await guild.channels.create({
      name: `collab-${slug}-active`,
      type: ChannelType.GuildText,
      parent: activeCat.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const result = db.prepare(
      'INSERT INTO collabs (name, deadline, channel_id, status) VALUES (?, ?, ?, ?)'
    ).run(name, deadline, channel.id, 'active');

    const collabId = result.lastInsertRowid;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`contest_${collabId}`).setLabel('🟢 Submit Contest Link').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`wallet_${collabId}`).setLabel('📄 Submit Wallet Sheet').setStyle(ButtonStyle.Primary),
    );

    const embed = new EmbedBuilder()
      .setTitle(`🔥 ${name}`)
      .setDescription(description)
      .addFields(
        { name: '⏳ Ends', value: relativeTime, inline: true },
        { name: '🎟️ Spots', value: spots, inline: false },
        { name: '📌 Note', value: note, inline: false }
      )
      .setTimestamp();

    if (image && image.url) {
      embed.setImage(image.url);
    }

    await channel.send({
      content: `Use the buttons below to submit:`,
      embeds: [embed],
      components: [row]
    });

    // announcement
    const ann = guild.channels.cache.find(c => c.name === 'collabs-announcements');
    if (ann) {
      await ann.send({
        content: `📢 New Collab: **${name}** → ${channel}\n⏳ Ends ${relativeTime}`,
        embeds: [embed]
      });
    }

    // log
    const logs = guild.channels.cache.find(c => c.name === 'logs');
    if (logs) {
      await logs.send(`🟢 Collab Created: **${name}** | Channel: ${channel} | Ends ${relativeTime}`);
    }

    await interaction.reply({ content: `✅ Collab created: ${channel}`, ephemeral: true });
  }
};
