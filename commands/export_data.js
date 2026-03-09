const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');

const fs = require("fs");
const db = require("../db");

module.exports = {

  data: new SlashCommandBuilder()
    .setName("export_data")
    .setDescription("Export all database data")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    const collabs = db.prepare("SELECT * FROM collabs").all();
    const submissions = db.prepare("SELECT * FROM submissions").all();

    let csv = "TYPE,ID,NAME,STATUS,USER,TIER,COMMUNITY,CONTEST,WALLET\n";

    // collabs
    for (const c of collabs) {
      csv += `COLLAB,${c.id},${c.name},${c.status},,,,,\n`;
    }

    // submissions
    for (const s of submissions) {
      csv += `SUBMISSION,${s.id},,${s.collab_id},${s.username},${s.tier},${s.community},${s.contest_link},${s.sheet_link}\n`;
    }

    fs.writeFileSync("export.csv", csv);

    await interaction.editReply({
      content: "Database exported successfully.",
      files: ["export.csv"]
    });

  }

};
