"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const list = require("../edison.json");

test("Edison scope and Malicious activation/resolution definition", () => {
  assert.equal(list.schemaVersion, 3);
  assert.deepEqual(list.formats, ["er", "eu", "so"]);
  assert.equal(list.enabled, undefined, "local activation preference must not be published");
  const rule = list.rules.find(rule => rule.id === "destiny-hero-malicious");
  assert.equal(rule.card.name, "Destiny HERO - Malicious");
  assert.equal(rule.card.passcode, "09411399");
  assert.deepEqual(rule.requires, { sourceZone: "graveyard", ownTurn: true, phases: ["M1", "M2"],
    absentFaceUpCards: [{ passcode: "47355498", name: "Necrovalley" }] });
  assert.deepEqual(rule.activation, [{ op: "banish", card: "source" }]);
  assert.deepEqual(rule.resolution, [{ op: "special-summon", from: "deck",
    card: { passcode: "09411399", name: "Destiny HERO - Malicious" }, positions: ["ATK", "DEF"],
    onNoMonsterZone: "destroy-to-graveyard" }]);
});

test("optional extension compatibility", { skip: !process.env.DBX_EXTENSION_DIR }, () => {
  const core = require(path.join(process.env.DBX_EXTENSION_DIR, "enhancer-core.js"));
  const imported = core.importAutomationList(JSON.stringify(list));
  assert.equal(imported.enabled, false);
  assert.deepEqual(JSON.parse(core.exportAutomationList(imported)), list);
});

test("Stratos review and complete summon choice use historical HERO names and search prohibition", () => {
  const reviews = require("../edison.reviews.json");
  const rule = list.rules.find(rule => rule.card.passcode === "40044918");
  assert.ok(rule);
  assert.equal(rule.card.name, "Elemental HERO Stratos");
  assert.equal(reviews.cards[rule.card.passcode].status, "approved");
  assert.equal(reviews.cards[rule.card.passcode].effect.kind, "summon-trigger-search-or-destroy");
  assert.equal(rule.requires.trigger, "normal-or-special-summon");
  assert.equal(rule.requires.ownTurn, false);
  assert.deepEqual(rule.activation, []);
  assert.deepEqual(rule.resolution, [{ op: "choose-search-or-destroy",
    monsterNamePrefixes: ["Elemental HERO ", "Destiny HERO ", "Evil HERO "],
    searchAbsentFaceUpCards: [{ passcode: "71564252", name: "Thunder King Rai-Oh" }] }]);
});
