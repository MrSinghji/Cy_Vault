const { test } = require("node:test");
const assert = require("node:assert");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { openDb } = require("./index");

test("db opens and creates all Phase 0 tables", () => {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "dbtest-")), "t.db");
  const db = openDb(tmp);
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  for (const t of ["identities", "roles", "assets", "auth_nonces", "audit_events"]) {
    assert.ok(names.includes(t), `missing table ${t}`);
  }
  // smoke insert/read roundtrip
  db.prepare("INSERT INTO identities (id, wallet) VALUES (?, ?)").run("id-1", "0xabc");
  const row = db.prepare("SELECT * FROM identities WHERE id=?").get("id-1");
  assert.strictEqual(row.status, "pending");
  db.close();
});

test("role CHECK constraint rejects unknown roles", () => {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "dbtest-")), "t.db");
  const db = openDb(tmp);
  assert.throws(() => db.prepare("INSERT INTO roles (wallet, role) VALUES (?, ?)").run("0xabc", "SUPERUSER"));
  db.prepare("INSERT INTO roles (wallet, role) VALUES (?, ?)").run("0xabc", "ADMIN");
  db.close();
});
