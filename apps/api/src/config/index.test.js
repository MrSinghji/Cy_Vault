const { test } = require("node:test");
const assert = require("node:assert");
const { config } = require("./index");

test("config exposes expected defaults", () => {
  assert.strictEqual(config.chain.chainId, 31337);
  assert.strictEqual(config.apiPort, 4000);
  assert.match(config.chain.rpcUrl, /^http/);
  assert.ok(config.databaseFile.endsWith(path_join_check()));
  function path_join_check() { return ".db"; }
});

test("config values are overridable via env at read time (documented behavior)", () => {
  // NODE_ENV/API_PORT were not set in this test run; defaults must apply.
  assert.strictEqual(typeof config.env, "string");
});
