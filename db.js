const Database = require('better-sqlite3');

// استخدم مسار الـ Volume على Railway
// تأكد إنك عامل Mount للـ Volume على /data
const db = new Database('/data/collabs.db');

// ====== Create tables if not exists ======
db.prepare(`
CREATE TABLE IF NOT EXISTS collabs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  description TEXT,
  supply TEXT,
  date TEXT,
  price TEXT,
  spots TEXT,
  requirements TEXT, -- JSON string: { follow: url, discord: url, like_repost: url }
  note TEXT,
  image TEXT,
  deadline INTEGER,
  channel_id TEXT,
  status TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collab_id INTEGER,
  user_id TEXT,
  username TEXT,
  tier TEXT,
  community TEXT,
  contest_link TEXT, -- can contain multiple links separated by " | "
  sheet_link TEXT,
  contest_time INTEGER,
  sheet_time INTEGER
)
`).run();

// ====== Simple Migration Helper ======
function addColumnIfNotExists(table, columnDef) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const colName = columnDef.split(' ')[0];
  const exists = cols.some(c => c.name === colName);
  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`).run();
    console.log(`🛠 Added column ${colName} to ${table}`);
  }
}

// ====== Migrate collabs table (لو الداتابيز قديمة) ======
addColumnIfNotExists('collabs', 'description TEXT');
addColumnIfNotExists('collabs', 'supply TEXT');
addColumnIfNotExists('collabs', 'date TEXT');
addColumnIfNotExists('collabs', 'price TEXT');
addColumnIfNotExists('collabs', 'spots TEXT');
addColumnIfNotExists('collabs', 'requirements TEXT');
addColumnIfNotExists('collabs', 'note TEXT');
addColumnIfNotExists('collabs', 'image TEXT');

// ====== Future migrations for submissions can go here ======

module.exports = db;
