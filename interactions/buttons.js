const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

const db = require('../db');
const fs = require('fs');

// ====== Communities ======
const TIERS = {
  T1: ['TropadaDrih','CelestialLab','ZaxWeb3','wazoogangg','Nasbelaeth','BlobaETH','word4zz_','AlphaEmpire','honeyratdao','imperial_alpha_','DreamersWeb3'],
  T2: ['casperllz','Mintopia_alpha','MummiesNeverDie','JOKER__NFTs','AK_MIINT','Worldnft','TwinkleNFTs','Basedking','alphanft_7','QuantumMint','AK_ALPHAA','CryptoArias','Soren','squapesonape','lil_lumi','nft_whale17','NFTS50_nfts','SloppyApeYC','Web3_lab_x','orbex','ThunderAlpha','VoofiOfficial','PerrysOnApe'],
  T3: ['metagems_nft','MythicMintDAO','MintropolisDAO','Iion_Mint','bazuka_Outlaws','MintFlowAlpha','Ace','Arya_00'],
};

async function handleButton(interaction) {

  // =====================================================
  // COLLAB STATUS SELECT (Active / Closed)
  // =====================================================
  if (interaction.isStringSelectMenu() && interaction.customId === 'collab_status_select') {

    const status = interaction.values[0];
    const page = 0;
    const pageSize = 10;

    const rows = db.prepare(
      "SELECT * FROM collabs WHERE status = ? ORDER BY id DESC"
    ).all(status);

    const pageItems = rows.slice(page * pageSize, (page + 1) * pageSize);

    const lines = pageItems.length
      ? pageItems.map(r => {
          const icon = r.status === 'active' ? '🟢' : '🔴';
          return `${icon} ${r.name}`;
        }).join('\n')
      : 'No collabs found.';

    const maxPage = Math.floor((rows.length - 1) / pageSize);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`collab_prev_${status}_${page}`)
        .setLabel('⬅ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),

      new ButtonBuilder()
        .setCustomId(`collab_next_${status}_${page}`)
        .setLabel('Next ➡')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(maxPage === 0)
    );

    return interaction.update({
      content: `📊 **${status.toUpperCase()} Collabs**\n\n${lines}`,
      components: [row]
    });
  }

  // =====================================================
  // PAGINATION
  // =====================================================
  if (interaction.isButton() && (
    interaction.customId.startsWith('collab_next_') ||
    interaction.customId.startsWith('collab_prev_')
  )) {

    const parts = interaction.customId.split('_');
    const status = parts[2];
    let page = parseInt(parts[3]);

    if (interaction.customId.startsWith('collab_next_')) page++;
    else page--;

    if (page < 0) page = 0;

    const pageSize = 10;

    const rows = db.prepare(
      "SELECT * FROM collabs WHERE status = ? ORDER BY id DESC"
    ).all(status);

    const maxPage = Math.floor((rows.length - 1) / pageSize);

    if (page > maxPage) page = maxPage;

    const pageItems = rows.slice(page * pageSize, (page + 1) * pageSize);

    const lines = pageItems.length
      ? pageItems.map(r => {
          const icon = r.status === 'active' ? '🟢' : '🔴';
          return `${icon} ${r.name}`;
        }).join('\n')
      : 'No collabs found.';

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`collab_prev_${status}_${page}`)
        .setLabel('⬅ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),

      new ButtonBuilder()
        .setCustomId(`collab_next_${status}_${page}`)
        .setLabel('Next ➡')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= maxPage)
    );

    return interaction.update({
      content: `📊 **${status.toUpperCase()} Collabs**\n\n${lines}`,
      components: [row]
    });
  }

  // =====================================================
  // EXPORT CSV
  // =====================================================
  if (interaction.isButton() && interaction.customId === 'export_csv') {

    const rows = db.prepare(
      "SELECT id, name FROM collabs ORDER BY id DESC"
    ).all();

    if (!rows.length) {
      return interaction.reply({ content: 'No collabs.', ephemeral: true });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_export')
      .setPlaceholder('Choose collab')
      .addOptions(
        rows.map(r => ({
          label: r.name,
          value: String(r.id)
        }))
      );

    return interaction.reply({
      content: 'Choose collab to export:',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // =====================================================
  // EXPORT SELECT
  // =====================================================
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_export') {

    const collabId = interaction.values[0];

    const data = db.prepare(
      "SELECT * FROM submissions WHERE collab_id = ?"
    ).all(collabId);

    let csv = "sheet_link,raffle_links,username,community\n";

    for (const r of data) {
      csv += `"${r.sheet_link || ''}","${r.contest_link || ''}","${r.username || ''}","${r.community || ''}"\n`;
    }

    const filePath = `export_${collabId}.csv`;

    fs.writeFileSync(filePath, csv);

    await interaction.reply({
      content: "Here is your CSV:",
      files: [new AttachmentBuilder(filePath)],
      ephemeral: true
    });

    fs.unlinkSync(filePath);
  }

}

module.exports = { handleButton };
