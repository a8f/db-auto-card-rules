"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const list = require("../edison.json");

test("Edison scope and Malicious activation/resolution definition", () => {
  assert.equal(list.schemaVersion, 2);
  assert.deepEqual(list.formats, ["er", "eu"]);
  assert.equal(list.enabled, undefined, "local activation preference must not be published");
  const rule = list.rules.find(rule => rule.id === "destiny-hero-malicious");
  assert.equal(rule.card.name, "Destiny HERO - Malicious");
  assert.deepEqual(rule.requires, { sourceZone: "graveyard", ownTurn: true, phases: ["M1", "M2"] });
  assert.deepEqual(rule.activation, [{ op: "banish", card: "source" }]);
  assert.deepEqual(rule.resolution, [{ op: "special-summon", from: "deck",
    card: { name: "Destiny HERO - Malicious" }, positions: ["ATK", "DEF"] }]);
});

test("optional extension compatibility", { skip: !process.env.DBX_EXTENSION_DIR }, () => {
  const core = require(path.join(process.env.DBX_EXTENSION_DIR, "enhancer-core.js"));
  const imported = core.importAutomationList(JSON.stringify(list));
  assert.equal(imported.enabled, false);
  assert.deepEqual(JSON.parse(core.exportAutomationList(imported)), list);
});
