"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const list = require("../edison.json");

test("Edison scope and Malicious activation/resolution definition", () => {
  assert.equal(list.schemaVersion, 4);
  assert.deepEqual(list.formats, ["er", "eu", "so"]);
  assert.equal(list.enabled, undefined, "local activation preference must not be published");
  const rule = list.rules.find(rule => rule.id === "destiny-hero-malicious");
  assert.equal(rule.card.name, "Destiny HERO - Malicious");
  assert.equal(rule.card.passcode, "09411399");
  assert.equal(rule.action.schemaVersion, 2);
  assert.deepEqual(rule.action.source, { zone: "graveyard", player: "self" });
  assert.deepEqual(rule.action.timing, { kind: "ignition", turn: "self", phases: ["M1", "M2"], verification: "manual" });
  assert.deepEqual(rule.action.activation.checks, [{ check: "absent-face-up", cards: [{ passcode: "47355498", name: "Necrovalley" }] }]);
  assert.deepEqual(rule.action.activation.costs, [{ op: "banish", card: "source", reason: "cost" }]);
  assert.deepEqual(rule.action.activation.choices[0].options, ["ATK", "DEF"]);
  assert.deepEqual(rule.action.resolution, [{ op: "special-summon", from: "deck",
    card: { passcode: "09411399", name: "Destiny HERO - Malicious" }, position: { choice: "position" }, reason: "effect",
    onNoMonsterZone: { op: "destroy", reason: "effect" } }]);
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
  assert.deepEqual(rule.action.timing.events, ["normal-summon", "special-summon"]);
  assert.equal(rule.action.timing.turn, "either");
  assert.deepEqual(rule.action.activation.costs, []);
  assert.deepEqual(rule.action.activation.targets, []);
  assert.deepEqual(rule.action.filters.monsters.namePrefixes, ["Elemental HERO ", "Destiny HERO ", "Evil HERO "]);
  const branches = rule.action.resolution[0].cases;
  assert.equal(branches.destroy[0].op, "destroy");
  assert.equal(branches.search[0].op, "search");
  assert.deepEqual(branches.search[0].checks, [{ check: "absent-face-up", cards: [{ passcode: "71564252", name: "Thunder King Rai-Oh" }] }]);
});
