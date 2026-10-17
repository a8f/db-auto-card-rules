import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { addEdisonCards, promptForCandidate } from "../add-edison-cards.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "edison-batch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const options = { headless: false, listFile: path.join(root, "edison.json"), reviewsFile: path.join(root, "edison.reviews.json"), reportFile: path.join(root, "reports", "import.json") };
  const list = { schemaVersion: 3, id: "test.edison", name: "Example Edison", version: "1.0.0", formats: ["er", "eu"], rules: [
    { id: "original-id", card: { passcode: "09000001", name: "Example Existing" }, label: "Old" }
  ] };
  await writeFile(options.listFile, JSON.stringify(list));
  await writeFile(options.reviewsFile, JSON.stringify({ schemaVersion: 1, ruleset: "edison", cards: {} }));
  const calls = [];
  const api = {
    validate: JSON.parse,
    async extractCards([{ name }]) {
      calls.push(name);
      if (name === "Throwing Example") throw new Error("Example parser error");
      if (name === "Ambiguous Example") return [{ status: "unsupported", reason: "Ambiguous name", candidates: [{ passcode: "09000005", name: "Example Candidate" }] }];
      const id = { "Example Existing": "09000001", "Example Good": "09000002", "Example Write Error": "09000003", "Example Later": "09000004", "Example Alias": "09000002" }[name];
      if (!id) return [{ status: "unsupported", reason: "No historical review" }];
      return [{ passcode: id, name, status: "supported", rule: { id: "new-" + id, card: { passcode: id, name }, label: "New" },
        research: name === "Example Good" ? [{ error: "Example source unavailable; reviewed data still usable" }] : [] }];
    },
    mergeRules(list, [card]) {
      if (card.passcode === "09000003") throw new Error("Example merge failure");
      const next = structuredClone(list);
      const index = next.rules.findIndex(rule => rule.card.passcode === card.passcode);
      if (index >= 0) next.rules[index] = { ...card.rule, id: next.rules[index].id };
      else next.rules.push(card.rule);
      return next;
    },
    async writeRules(file, cards) {
      const old = await readFile(file, "utf8");
      const next = JSON.stringify(api.mergeRules(JSON.parse(old), cards));
      if (old !== next) await writeFile(file, next);
      return { changed: old !== next };
    }
  };
  return { root, options: { ...options, api }, calls };
}

test("per-card failures preserve successes, continue later cards and retain useful diagnostics", async t => {
  const { options, calls } = await fixture(t);
  const names = ["Example Existing", "Throwing Example", "Example Good", "Ambiguous Example", "Example Write Error", "Example Later", "Example Alias", "Missing Example"];
  const report = await addEdisonCards(names, options);
  assert.deepEqual(calls, names);
  assert.deepEqual(report.results.map(item => item.status), ["updated", "failed", "added", "failed", "failed", "added", "duplicate", "failed"]);
  assert.equal(report.failed, 4);
  assert.match(report.results[1].reason, /parser error/);
  assert.equal(report.results[3].extraction.candidates.length, 1);
  assert.match(report.results[4].reason, /merge failure/);
  assert.equal(report.results[2].warnings.length, 1);
  const saved = JSON.parse(await readFile(options.listFile, "utf8"));
  assert.deepEqual(saved.rules.map(rule => rule.card.passcode), ["09000001", "09000002", "09000004"]);
  assert.equal(saved.rules[0].id, "original-id");
  assert.deepEqual(saved.formats, ["er", "eu"]);
  assert.equal(JSON.parse(await readFile(options.reportFile, "utf8")).failed, 4);
  assert.equal((await addEdisonCards(["Example Existing"], options)).results[0].status, "unchanged");
});

test("dry-run checks merges individually without modifying the list", async t => {
  const { options } = await fixture(t);
  const original = await readFile(options.listFile, "utf8");
  const report = await addEdisonCards(["Example Good", "Example Write Error", "Example Later"], { ...options, dryRun: true });
  assert.deepEqual(report.results.map(item => item.status), ["would-add", "failed", "would-add"]);
  assert.equal(await readFile(options.listFile, "utf8"), original);
});

test("invalid review setup stops before extracting or writing cards", async t => {
  const { options, calls } = await fixture(t);
  const original = await readFile(options.listFile, "utf8");
  await writeFile(options.reviewsFile, '{"schemaVersion":1,"ruleset":"other","cards":{}}');
  await assert.rejects(addEdisonCards(["Example Good"], options), /Invalid Edison review/);
  assert.equal(calls.length, 0);
  assert.equal(await readFile(options.listFile, "utf8"), original);
});

test("headless picks the highest fuzzy score; interactive mode honors a different selection", async t => {
  const { options } = await fixture(t);
  const extract = options.api.extractCards;
  options.api.extractCards = async (inputs, ...rest) => {
    if (typeof inputs[0] === "string") return extract([{ name: inputs[0] === "09000004" ? "Example Later" : "Example Good" }], ...rest);
    return [{ status: "unsupported", reason: "Ambiguous name", candidates: [
      { passcode: "09000004", name: "Example Later", score: 0.8 },
      { passcode: "09000002", name: "Example Good", score: 0.95 }
    ] }];
  };
  const headless = await addEdisonCards(["Example"], { ...options, headless: true, chooseCandidate: () => assert.fail("Headless must not prompt") });
  assert.equal(headless.results[0].passcode, "09000002");
  assert.equal(headless.results[0].selection.mode, "headless-best-match");
  assert.equal(headless.results[0].selection.chosen.score, 0.95);
  const interactive = await addEdisonCards(["Example"], { ...options, headless: false, chooseCandidate: async (_input, candidates) => candidates[1] });
  assert.equal(interactive.results[0].passcode, "09000004");
  assert.equal(interactive.results[0].selection.mode, "interactive");
  const skipped = await addEdisonCards(["Example"], { ...options, chooseCandidate: async () => null });
  assert.equal(skipped.failed, 1);
  assert.match(skipped.results[0].reason, /skipped/);
});

test("numbered prompt retries invalid input, accepts a number, and supports skipping", async () => {
  const candidates = [{ name: "Example One", passcode: "09000001" }, { name: "Example Two", passcode: "09000002" }];
  const answers = ["bad", "9", "2"], output = [];
  const chosen = await promptForCandidate("Example", candidates, { ask: async () => answers.shift(), log: line => output.push(line) });
  assert.equal(chosen, candidates[1]);
  assert.ok(output.some(line => line.includes("2. Example Two")));
  assert.equal(await promptForCandidate("Example", candidates, { ask: async () => "s", log() {} }), null);
  assert.equal(await promptForCandidate("Example", candidates, { ask: async () => "", log() {} }), candidates[0]);
});

const extractor = process.env.DBE_SIM_EXTRACTOR_DIR || fileURLToPath(new URL("../../card-rule-extractor/", import.meta.url));
test("real extractor integration reconstructs a supported card while skipping a failed name", { skip: !existsSync(path.join(extractor, "extract-card-rules.mjs")) }, async t => {
  const { root, options } = await fixture(t);
  const { DatabaseSync } = await import("node:sqlite");
  const sim = path.join(root, "YGOPRO"); await mkdir(sim);
  const db = new DatabaseSync(path.join(sim, "cards.cdb"));
  db.exec("CREATE TABLE texts (id INTEGER PRIMARY KEY, name TEXT, desc TEXT)");
  db.prepare("INSERT INTO texts VALUES (?, ?, ?)").run(9000001, "Example Existing", "Example text");
  db.close();
  const review = { status: "approved", name: "Example Existing", reviewedOn: "2026-10-17", sources: ["https://example.test/rulings"],
    effect: { kind: "graveyard-ignition-banish-summon-from-deck", summon: { passcode: "09000001", name: "Example Existing" }, positions: ["ATK", "DEF"] } };
  await writeFile(options.reviewsFile, JSON.stringify({ schemaVersion: 1, ruleset: "edison", cards: { "09000001": review } }));
  const realList = { schemaVersion: 3, id: "test.edison", name: "Example Edison", version: "1.0.0", formats: ["er", "eu"], rules: [{
    id: "original-id", card: { passcode: "09000001", name: "Example Existing" }, label: "Old",
    requires: { sourceZone: "graveyard", ownTurn: true, phases: ["M1"] }, activation: [{ op: "banish", card: "source" }],
    resolution: [{ op: "special-summon", from: "deck", card: { passcode: "09000001", name: "Example Existing" }, positions: ["DEF"] }]
  }] };
  await writeFile(options.listFile, JSON.stringify(realList));
  const { api: _mock, ...paths } = options;
  const report = await addEdisonCards(["Missing Example", "example existing"], { ...paths, extractor, simulator: sim, extractionOptions: { research: false } });
  assert.deepEqual(report.results.map(item => item.status), ["failed", "updated"]);
  const saved = JSON.parse(await readFile(options.listFile, "utf8"));
  assert.equal(saved.rules[0].id, "original-id");
  assert.deepEqual(saved.rules[0].resolution[0].positions, ["ATK", "DEF"]);
});

test("CLI help and malformed name files work without the extractor", async t => {
  const { root } = await fixture(t);
  const script = fileURLToPath(new URL("../add-edison-cards.mjs", import.meta.url));
  const help = spawnSync(process.execPath, [script, "--help"], { encoding: "utf8", cwd: root });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--file/);
  const file = path.join(root, "names.json"); await writeFile(file, '["Example",42]');
  const malformed = spawnSync(process.execPath, [script, "--file", file], { encoding: "utf8", cwd: root });
  assert.equal(malformed.status, 2);
  assert.match(malformed.stderr, /nonempty strings/);
});
