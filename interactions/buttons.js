const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const db = require('../db');
const fs = require('fs');

// ====== قوائم المجتمعات ======
const TIERS = {
  T1: ['TropadaDrih','CelestialLab','ZaxWeb3','wazoogangg'],
  T2: ['DreamersWeb3','Mintopia_alpha','MummiesNeverDie','JOKER__NFTs','AK_MIINT','Worldnft','TwinkleNFTs','Basedking','alphanft_7','QuantumMint','AK_ALPHAA','CryptoArias','squapesonape','lil_lumi','nft_whale17','NFTS50_nfts','SloppyApeYC','Web3_lab_x','orbex'],
  T3: ['metagems_nft','cryptoSoren','MythicMintDAO','MintropolisDAO','Iion_Mint','bazuka_Outlaws'],
};
// =============================

async function handleButton(interaction) {

  // ======================================================
  // ================== EXPORT CSV =========================
  // ======================================================
  // زرار Export CSV في الـ Panel
  if (interaction.isButton() && interaction.customId === 'export_csv') {
    const rows = db.prepare('SELECT id, name, status FROM collabs ORDER BY id DESC').all();
    if (!rows.length) {
      return interaction.reply({ content: 'No collabs.', ephemeral: true });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_export')
      .setPlaceholder('Choose a collab')
      .addOptions(rows.map(r => ({ label: `${r.name} (${r.status})`, value: String(r.id) })));

    return interaction.reply({
      content: 'Choose collab to export:',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // اختيار الشراكة للتصدير
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_export') {
    const collabId = interaction.values[0];
    const data = db.prepare('SELECT * FROM submissions WHERE collab_id = ?').all(collabId);

    let csv = 'username,tier,community,contest_link,sheet_link,contest_time,sheet_time\n';
    for (const r of data) {
      csv += `"${r.username}","${r.tier}","${r.community}","${r.contest_link || ''}","${r.sheet_link || ''}","${r.contest_time || ''}","${r.sheet_time || ''}"\n`;
    }

    const filePath = `export_${collabId}.csv`;
    fs.writeFileSync(filePath, csv);

    await interaction.reply({
      content: 'Here is your CSV:',
      files: [new AttachmentBuilder(filePath)],
      ephemeral: true
    });

    fs.unlinkSync(filePath);
    return;
  }

  // ======================================================
  // ====== CLOSE COLLAB (from /close_collab dropdown) =====
  // ======================================================
  if (interaction.isStringSelectMenu() && interaction.customId === 'close_select') {
    const collabId = interaction.values[0];
    const collab = db.prepare('SELECT * FROM collabs WHERE id = ?').get(collabId);

    if (!collab || collab.status === 'closed') {
      return interaction.update({ content: '❌ Collab not found or already closed.', components: [] });
    }

    const guild = interaction.guild;

    // هات كاتيجوري المغلقة
    let closedCat = guild.channels.cache.find(c => c.name === 'collabs-closed' && c.type === ChannelType.GuildCategory);
    if (!closedCat) {
      closedCat = await guild.channels.create({
        name: 'collabs-closed',
        type: ChannelType.GuildCategory
      });
    }

    // هات قناة الشراكة
    let ch = null;
    if (collab.channel_id) {
      ch = await guild.channels.fetch(collab.channel_id).catch(() => null);
    }

    if (ch) {
      const newName = ch.name.replace('-active', '') + '-closed';
      await ch.setName(newName);
      await ch.setParent(closedCat.id);
      await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
    }

    // حدّث الداتابيز
    db.prepare('UPDATE collabs SET status = ? WHERE id = ?').run('closed', collabId);

    // لوج
    const logs = guild.channels.cache.find(c => c.name === 'logs');
    if (logs) {
      const count = db.prepare('SELECT COUNT(*) as n FROM submissions WHERE collab_id = ?').get(collabId).n;
      await logs.send(`🔴 Collab Closed: **${collab.name}** | Submissions: **${count}**`);
    }

    return interaction.update({
      content: `✅ Closed **${collab.name}** successfully.`,
      components: []
    });
  }

  // ======================================================
  // ================= BUTTONS =============================
  // ======================================================
  if (interaction.isButton()) {
    const [type, collabId] = interaction.customId.split('_');

    const collab = db.prepare('SELECT * FROM collabs WHERE id = ?').get(collabId);
    if (!collab || collab.status !== 'active' || Date.now() > collab.deadline) {
      return interaction.reply({ content: '❌ This collab is closed.', ephemeral: true });
    }

    // ===== Submit Contest =====
    if (type === 'contest') {
      const tierSelect = new StringSelectMenuBuilder()
        .setCustomId(`chooseTier_${collabId}`)
        .setPlaceholder('Choose Tier')
        .addOptions(
          { label: 'T1', value: 'T1' },
          { label: 'T2', value: 'T2' },
          { label: 'T3', value: 'T3' }
        );

      return interaction.reply({
        content: 'Choose your Tier:',
        components: [new ActionRowBuilder().addComponents(tierSelect)],
        ephemeral: true
      });
    }

    // ===== Submit Wallet =====
    if (type === 'wallet') {
      const rows = db.prepare(
        `SELECT id, community FROM submissions 
         WHERE collab_id = ? AND user_id = ? AND sheet_link IS NULL`
      ).all(collabId, interaction.user.id);

      if (!rows.length) {
        return interaction.reply({ content: '❌ You have no pending contest to attach a wallet to.', ephemeral: true });
      }

      // لو صف واحد بس → افتح Modal مباشرة
      if (rows.length === 1) {
        const rowId = rows[0].id;

        const modal = new ModalBuilder()
          .setCustomId(`walletModal_${rowId}`)
          .setTitle('Submit Wallet Sheet');

        const sheetInput = new TextInputBuilder()
          .setCustomId('sheet_link')
          .setLabel('Wallet Sheet Link')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(sheetInput));
        return interaction.showModal(modal);
      }

      // لو أكتر من واحد → خلي المستخدم يختار Community
      const select = new StringSelectMenuBuilder()
        .setCustomId('chooseWalletRow')
        .setPlaceholder('Choose community to attach wallet')
        .addOptions(
          rows.map(r => ({
            label: r.community,
            value: String(r.id)
          }))
        );

      return interaction.reply({
        content: 'Choose which community this wallet belongs to:',
        components: [new ActionRowBuilder().addComponents(select)],
        ephemeral: true
      });
    }
  }

  // ======================================================
  // ===== Tier Chosen -> UPDATE message to show Communities
  // ======================================================
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('chooseTier_')) {
    const collabId2 = interaction.customId.split('_')[1];
    const tier = interaction.values[0];

    const communities = TIERS[tier] || [];
    if (!communities.length) {
      return interaction.update({ content: '❌ No communities for this tier.', components: [] });
    }

    const communitySelect = new StringSelectMenuBuilder()
      .setCustomId(`chooseCommunity_${collabId2}_${tier}`)
      .setPlaceholder('Choose Community')
      .addOptions(communities.map(c => ({ label: c, value: c })) );

    return interaction.update({
      content: `Choose community for **${tier}**:`,
      components: [new ActionRowBuilder().addComponents(communitySelect)]
    });
  }

  // ======================================================
  // ===== Community Chosen -> Show Modal
  // ======================================================
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('chooseCommunity_')) {
    const parts = interaction.customId.split('_');
    const collabId3 = parts[1];
    const tier = parts[2];
    const community = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`contestModal_${collabId3}_${tier}_${encodeURIComponent(community)}`)
      .setTitle('Submit Contest Link');

    const contestInput = new TextInputBuilder()
      .setCustomId('contest_link')
      .setLabel('Contest Link')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(contestInput));
    return interaction.showModal(modal);
  }

  // ======================================================
  // ===== Wallet Row Chosen -> Show Modal
  // ======================================================
  if (interaction.isStringSelectMenu() && interaction.customId === 'chooseWalletRow') {
    const rowId = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`walletModal_${rowId}`)
      .setTitle('Submit Wallet Sheet');

    const sheetInput = new TextInputBuilder()
      .setCustomId('sheet_link')
      .setLabel('Wallet Sheet Link')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(sheetInput));
    return interaction.showModal(modal);
  }
}

module.exports = { handleButton };
