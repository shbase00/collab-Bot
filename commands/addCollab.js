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

    // ===== Required =====
    .addStringOption(opt =>
      opt.setName('name').setDescription('Collab name').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('description').setDescription('Collab description').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('supply').setDescription('Supply (e.g. 3333, 1000, etc)').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('date').setDescription('Mint date / event date').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('price').setDescription('Price (e.g. Free, 0.002 ETH)').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('spots').setDescription('Spots info (e.g. T1 = 10 GTD & 15 FCFS)').setRequired(true)
    )

    // ===== Time =====
    .addIntegerOption(opt =>
      opt.setName('hours').setDescription('Hours until close').setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('minutes').setDescription('Minutes until close').setRequired(false)
    )

    // ===== Requirements (optional) =====
    .addStringOption(opt =>
      opt.setName('follow').setDescription('Follow link (optional)').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('join_discord').setDescription('Discord invite link (optional)').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('like_repost').setDescription('Post link to like & repost (optional)').setRequired(false)
    )

    // ===== Other optional =====
    .addStringOption(opt =>
      opt.setName('note').setDescription('Optional note').setRequired(false)
    )
    .addAttachmentOption(opt =>
      opt.setName('image').setDescription('Optional image').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client, ensureStructure) {
    const name = interaction.options.getString('name');
    const description = interaction.options.getString('description');
    const supply = interaction.options.getString('supply');
    const date = interaction.options.getString('date');
    const price = interaction.options.getString('price');
    const spots = interaction.options.getString('spots');

    const hours = interaction.options.getInteger('hours') || 0;
    const minutes = interaction.options.getInteger('minutes') || 0;

    const follow = interaction.options.getString('follow');
    const joinDiscord = interaction.options.getString('join_discord');
    const likeRepost = interaction.options.getString('like_repost');

    const note = interaction.options.getString('note') || '—';
    const image = interaction.options.getAttachment('image');

    if (hours === 0 && minutes === 0) {
      return interaction.reply({ content: '❌ You must provide hours or minutes (or both).', ephemeral: true });
    }

    const totalMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
    const deadline = Date.now() + totalMs;

    const deadlineUnix = Math.floor(deadline / 1000);
    const relativeTime = `<t:${deadlineUnix}:R>`;

    // Build requirements object
    const requirements = {
      follow: follow || null,
      discord: joinDiscord || null,
      like_repost: likeRepost || null
    };

    const guild = interaction.guild;
    const { activeCat } = await ensureStructure(guild);

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    const channel = await guild.channels.create({
      name: `🟢-${slug}`,
      type: ChannelType.GuildText,
      parent: activeCat.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const result = db.prepare(
      `INSERT INTO collabs 
      (name, description, supply, date, price, spots, requirements, note, image, deadline, channel_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      name,
      description,
      supply,
      date,
      price,
      spots,
      JSON.stringify(requirements),
      note,
      image ? image.url : null,
      deadline,
      channel.id,
      'active'
    );

    const collabId = result.lastInsertRowid;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`contest_${collabId}`).setLabel('🟢 Submit Contest Link').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`wallet_${collabId}`).setLabel('📄 Submit Wallet Sheet').setStyle(ButtonStyle.Primary),
    );

    // Build requirements text
    let reqText = '';
    if (follow) reqText += `• Follow: ${follow}\n`;
    if (joinDiscord) reqText += `• Join Discord: ${joinDiscord}\n`;
    if (likeRepost) reqText += `• Like & Repost: ${likeRepost}\n`;
    if (!reqText) reqText = '—';

    const embed = new EmbedBuilder()
      .setTitle(`🔥 ${name}`)
      .setDescription(description)
      .addFields(
        { name: '⏳ Ends', value: relativeTime, inline: true },
        { name: '📦 Supply', value: supply, inline: true },
        { name: '💰 Price', value: price, inline: true },
        { name: '🗓 Date', value: date, inline: true },
        { name: '🎟️ Spots', value: spots, inline: false },
        { name: '✅ Requirements', value: reqText, inline: false },
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
