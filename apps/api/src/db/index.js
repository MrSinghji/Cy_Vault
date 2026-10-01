// Minimal DB bootstrap (Phase 0). Feature work will add repositories on top of this.
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { config } = require("../config");

function openDb(fileOverride) {
  const file = fileOverride || config.databaseFile;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
  return db;
}

module.exports = { openDb };
