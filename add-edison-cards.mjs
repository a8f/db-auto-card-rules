import path from "node:path";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";

const repository = path.dirname(fileURLToPath(import.meta.url));

export async function promptForCandidate(input, candidates, { ask, log = console.log }) {
  log('Multiple matches for "' + input + '":');
  candidates.forEach((card, index) => log("  " + (index + 1) + ". " + card.name + " [" + card.passcode + "]"));
  while (true) {
    const answer = (await ask("Choose 1-" + candidates.length + " (Enter = best match, s = skip): ")).trim();
    if (/^(s|skip)$/i.test(answer)) return null;
    if (!answer) return candidates[0];
    const index = /^\d+$/.test(answer) ? Number(answer) - 1 : -1;
    if (index >= 0 && index < candidates.length) return candidates[index];
    log("Enter a listed number, or s to skip.");
  }
}

async function loadExtractor(directory) {
  const candidates = directory ? [path.resolve(directory)] : [
    path.resolve(repository, "../card-rule-extractor"), path.join(repository, ".local-tools", "dbe-sim-extractor")
  ];
  for (const candidate of candidates) {
    try { await access(path.join(candidate, "extract-card-rules.mjs")); }
    catch { continue; }
    const [extractor, { default: core }] = await Promise.all([
      import(pathToFileURL(path.join(candidate, "extract-card-rules.mjs"))),
      import(pathToFileURL(path.join(candidate, "schema-3.mjs")))
    ]);
    return { ...extractor, validate: core.importAutomationList };
  }
  throw new Error("Extractor not found. Initialize the card-rule-extractor submodule, clone a8f/dbe-sim-extractor into .local-tools/dbe-sim-extractor, or pass --extractor <directory>.");
}

export async function addEdisonCards(names, options = {}) {
  const listFile = options.listFile || path.join(repository, "edison.json");
  const reviewsFile = options.reviewsFile || path.join(repository, "edison.reviews.json");
  const reportFile = options.reportFile || path.join(repository, "reports", "last-edison-import.json");
  const api = options.api || await loadExtractor(options.extractor || process.env.DBE_SIM_EXTRACTOR_DIR);
  const original = await readFile(listFile, "utf8");
  api.validate(original);
  const document = JSON.parse((await readFile(reviewsFile, "utf8")).replace(/^\uFEFF/, ""));
  if (document.schemaVersion !== 1 || document.ruleset !== "edison" || !document.cards ||
      typeof document.cards !== "object" || Array.isArray(document.cards)) throw new Error("Invalid Edison review document. No cards written.");
  const reviews = document.cards;
  const report = { startedAt: new Date().toISOString(), listFile, dryRun: options.dryRun === true, results: [] };
  const headless = options.headless ?? (!process.stdin.isTTY || !process.stdout.isTTY);
  const seen = new Set();
  let previewList = JSON.parse(original);
  for (const input of names) {
    const item = { input, status: "failed" };
    try {
      if (typeof input !== "string" || !input.trim()) throw new Error("Supply a nonempty card name.");
      const extract = selection => api.extractCards([selection], options.simulator, "edison", { ...options.extractionOptions, reviews, fuzzy: true });
      let cards = await extract({ name: input.trim() });
      if (cards.length !== 1) throw new Error("Expected one resolved card; got " + cards.length);
      let card = cards[0];
      if (card.candidates?.length) {
        item.extraction = card;
        const candidates = [...card.candidates].sort((a, b) => (b.score || 0) - (a.score || 0));
        const selected = headless ? candidates[0] : await options.chooseCandidate?.(input, candidates);
        if (!selected) throw new Error("Card selection skipped or requires an interactive choice.");
        if (!candidates.some(candidate => candidate.passcode === selected.passcode)) throw new Error("Selection is not one of the candidate cards.");
        item.selection = { mode: headless ? "headless-best-match" : "interactive", chosen: selected, candidates, candidateCount: card.candidateCount ?? candidates.length };
        cards = await extract(selected.passcode);
        if (cards.length !== 1) throw new Error("Selected card did not resolve to one extraction.");
        card = cards[0];
      }
      item.extraction = card;
      item.name = card.name;
      item.passcode = card.passcode;
      item.warnings = (card.research || []).flatMap(source => [source.error, source.warning, source.cacheWarning].filter(Boolean));
      if (card.status !== "supported") throw new Error(card.reason || "This card's complete effect could not be extracted.");
      if (seen.has(card.passcode)) {
        item.status = "duplicate";
      } else {
        const current = options.dryRun ? previewList : JSON.parse(await readFile(listFile, "utf8"));
        const existed = current.rules.some(rule => rule.card.passcode === card.passcode);
        if (options.dryRun) {
          previewList = api.mergeRules(previewList, [card], "edison", reviews);
          item.status = "would-" + (existed ? "update" : "add");
        } else {
          const written = await api.writeRules(listFile, [card], "edison", reviews);
          item.status = written.changed ? (existed ? "updated" : "added") : "unchanged";
        }
        seen.add(card.passcode);
      }
    } catch (error) { item.reason = error.message; }
    report.results.push(item);
    options.onResult?.(item);
  }
  report.completedAt = new Date().toISOString();
  report.failed = report.results.filter(item => item.status === "failed").length;
  report.summary = Object.fromEntries([...new Set(report.results.map(item => item.status))]
    .map(status => [status, report.results.filter(item => item.status === status).length]));
  await mkdir(path.dirname(reportFile), { recursive: true });
  await writeFile(reportFile, JSON.stringify(report, null, 2) + "\n");
  return { ...report, reportFile };
}

export async function main(args) {
  const names = [], options = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      console.log('Usage: node add-edison-cards.mjs "Card Name" ["Another Name" ...] [--file <names.txt|names.json>] [--headless|--interactive] [--dry-run] [--extractor <directory>] [--simulator <directory>] [--report <path>]\nNames use ranked fuzzy lookup. Multiple matches prompt in a terminal; --headless or redirected input/output selects the best match. --interactive forces prompts. Each card is independent; successful cards are saved even if others fail. Exit 0 = all handled, 1 = some cards failed, 2 = setup failure.');
      return;
    }
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--headless" || arg === "--interactive") options.headless = arg === "--headless";
    else if (["--file", "--extractor", "--simulator", "--report"].includes(arg)) {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error("Missing value for " + arg);
      if (arg === "--file") {
        const content = (await readFile(value, "utf8")).replace(/^\uFEFF/, "");
        const entries = content.trimStart().startsWith("[") ? JSON.parse(content) : content.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
        if (!Array.isArray(entries) || entries.some(name => typeof name !== "string" || !name.trim())) throw new Error("Name file must contain nonempty strings.");
        names.push(...entries);
      } else options[arg.slice(2) === "report" ? "reportFile" : arg.slice(2)] = path.resolve(value);
    } else if (arg.startsWith("-")) throw new Error("Unknown option: " + arg);
    else names.push(arg);
  }
  if (!names.length) throw new Error("Supply card names or --file <path>. Use --help for usage.");
  let terminal;
  let report;
  try { report = await addEdisonCards(names, { ...options,
    chooseCandidate: async (input, candidates) => {
      terminal ||= createInterface({ input: process.stdin, output: process.stdout });
      return promptForCandidate(input, candidates, { ask: question => terminal.question(question) });
    }, onResult(item) {
    if (item.selection) console.log("MATCH: " + item.input + " → " + item.selection.chosen.name + " [" + item.selection.chosen.passcode + "] (" + item.selection.mode + ")");
    console.log(item.status.toUpperCase() + ": " + (item.name || item.input) + (item.reason ? " — " + item.reason : ""));
    for (const candidate of item.extraction?.candidates || []) console.log("  " + candidate.passcode + "  " + candidate.name);
    for (const warning of item.warnings || []) console.log("  Warning: " + warning);
  } }); } finally { terminal?.close(); }
  console.log(Object.entries(report.summary).map(([status, count]) => count + " " + status).join(", ") + ". Report: " + report.reportFile);
  if (report.failed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error("Setup/report error: " + error.message); process.exitCode = 2; });
}
