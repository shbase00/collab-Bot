const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder
} = require('discord.js');

const db = require('../db');

const PAGE_SIZE = 10;

async function handleButton(interaction) {


// =====================================================
// SELECT ACTIVE / CLOSED
// =====================================================

if (interaction.isStringSelectMenu() && interaction.customId === "collab_filter") {

const type = interaction.values[0];

const rows = db.prepare(
"SELECT id,name,status FROM collabs WHERE status=? ORDER BY id DESC"
).all(type);

if (!rows.length) {

return interaction.update({
content:"No collabs found.",
components:[]
});

}

const page = 0;

const start = page * PAGE_SIZE;
const end = start + PAGE_SIZE;

const slice = rows.slice(start,end);

const list = slice.map(r => {

const icon = r.status === "active" ? "🟢" : "🔴";

return `${icon} ${r.name}`;

}).join("\n");

const next = new ButtonBuilder()
.setCustomId(`collab_page_${type}_1`)
.setLabel("Next ➡️")
.setStyle(ButtonStyle.Primary);

return interaction.update({
content:`**${type.toUpperCase()} COLLABS**\n\n${list}`,
components:[
new ActionRowBuilder().addComponents(next)
]
});

}


// =====================================================
// PAGINATION
// =====================================================

if (interaction.isButton() && interaction.customId.startsWith("collab_page_")) {

const parts = interaction.customId.split("_");

const type = parts[2];
const page = parseInt(parts[3]);

const rows = db.prepare(
"SELECT id,name,status FROM collabs WHERE status=? ORDER BY id DESC"
).all(type);

const start = page * PAGE_SIZE;
const end = start + PAGE_SIZE;

const slice = rows.slice(start,end);

const list = slice.map(r => {

const icon = r.status === "active" ? "🟢" : "🔴";

return `${icon} ${r.name}`;

}).join("\n");

const buttons = new ActionRowBuilder();

if (page > 0) {

buttons.addComponents(

new ButtonBuilder()
.setCustomId(`collab_page_${type}_${page-1}`)
.setLabel("⬅️ Previous")
.setStyle(ButtonStyle.Secondary)

);

}

if (end < rows.length) {

buttons.addComponents(

new ButtonBuilder()
.setCustomId(`collab_page_${type}_${page+1}`)
.setLabel("Next ➡️")
.setStyle(ButtonStyle.Primary)

);

}

return interaction.update({
content:`**${type.toUpperCase()} COLLABS**\n\n${list}`,
components:[buttons]
});

}

}

module.exports = { handleButton };
