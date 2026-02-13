const Database = require('better-sqlite3');
const db = new Database('collabs.db');

db.prepare(`
CREATE TABLE IF NOT EXISTS collabs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
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
  contest_link TEXT,
  sheet_link TEXT,
  contest_time INTEGER,
  sheet_time INTEGER
)
`).run();

module.exports = db;
