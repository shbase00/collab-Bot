const PAGE_SIZE = 10;

if (interaction.isStringSelectMenu() && interaction.customId === "collab_type") {

const type = interaction.values[0];

const rows = db.prepare(
"SELECT id,name,status FROM collabs WHERE status=? ORDER BY id DESC"
).all(type);

if(!rows.length){

return interaction.update({
content:"No collabs found.",
components:[]
});

}

const page = 0;

const slice = rows.slice(0,PAGE_SIZE);

const list = slice.map(r=>{
const icon = r.status==="active"?"🟢":"🔴";
return ${icon} ${r.name};
}).join("\n");

const nextBtn = new ButtonBuilder()
.setCustomId(`page_${type}_1`)
.setLabel("Next ➡️")
.setStyle(ButtonStyle.Primary);

return interaction.update({
content:`**${type.toUpperCase()} COLLABS**\n\n${list}`,
components:[
new ActionRowBuilder().addComponents(nextBtn)
]
});

}
