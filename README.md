# Personal Dueling Book rules

Independent, optional card rules for Dueling Book Enhancer. The extension can
be cloned, tested and used without this repository. Lists are data only and
are not bundled into the extension.

Lists use schema 4 with action schema 2. Older extension versions cannot load
them; reload the updated extension and reimport or restart the local watcher.
Each entry keeps `id`, `card`, and `label` metadata outside its nested `action`.
Review sidecars and helper reports retain their separate formats.

The Edison list is version 3.0.0. Its actions use explicit source/timing,
activation choices/costs, resolution search/destruction branches, and required
manual coverage. Effect entry IDs remain stable; changing an ID tells the
extension it is a different effect. Several effect IDs on one card now open an
effect chooser before declaration; duplicate enabled IDs are blocked.

## Edison

`edison.json` contains the personal Edison rules list. It supports ranked and
unrated Edison and Solo Mode by default. Its first effect is Destiny HERO - Malicious:
banish the graveyard copy as cost, then Special Summon another copy from Deck
in the chosen Attack or Defense Position when the effect resolves.

The historical mapping also prevents activation while Necrovalley is face-up.
If all monster zones become occupied before resolution, it destroys a matching
Deck copy and sends it to the Graveyard. This uses the extension's optional
`absentFaceUpCards` prerequisite and `onNoMonsterZone` resolution policy; reload
the updated extension before importing/watching this definition. Priority,
negation, continuous-effect negation and replacement effects remain manual.

In extension settings, open **Automation → Card rules lists → Share or import
a rules list**, choose `edison.json` with **Load JSON file**, review the preview,
select **Install disabled**, then enable the list. Solo Mode is included in the
default formats. Existing watched lists retain their saved format selections;
check Solo Mode once under **Loads in** if it was previously excluded.
Local enablement is not part of published JSON.

When hosted in a public GitHub repository, the raw `edison.json` URL can be
loaded through the extension's optional **Load from URL** control. Private
repositories require file/string import; no GitHub tokens belong in the list.

Repository: https://github.com/a8f/db-auto-card-rules

Raw list: https://raw.githubusercontent.com/a8f/db-auto-card-rules/main/edison.json

See [usage](USAGE.md) for the duel flow. Test this repository independently with:

```sh
node --test checks/edison.check.cjs
```

To additionally validate against a local extension checkout, set
`DBX_EXTENSION_DIR` to that checkout's `extension/shared` absolute path before running the checks.
That integration check is optional; this repository needs no npm dependencies.

The JSON uses list schema 4: card identity/label metadata and a nested `action`
following action schema 2 (prerequisites, activation and resolution operations). No card-specific executable script is installed in the
extension. New effects using the existing action vocabulary can be added here;
new action types require a generic adapter in the extension.

## Extractor review data

For a convenient per-card batch import, run from this repository:

```powershell
node add-edison-cards.mjs "Destiny HERO - Malicious" "Another Card Name"
node add-edison-cards.mjs --file cards.txt
node add-edison-cards.mjs --file cards.json --dry-run
node add-edison-cards.mjs Stratos --headless
```

Quote each name separately. `cards.txt` has one name per line; `cards.json` is an
array of names. Commas inside a name are preserved. The script always targets
this repository's `edison.json` and `edison.reviews.json`, even when invoked from
another directory. It finds the sibling `card-rule-extractor` checkout or a clone
at `.local-tools/dbe-sim-extractor`; `--extractor <directory>` or
`DBE_SIM_EXTRACTOR_DIR` can select another checkout. Node.js 22.13+ is required.

Names use ranked fuzzy matching, including shortened names and common typos.
Exact names take precedence, followed by whole-word/substring and typo matches.
When several candidates match, a terminal session prompts with a numbered list:
choose a number, press Enter for the best match, or enter `s` to skip that card.
`--headless` takes the highest-ranked candidate automatically. Redirected input
or output also uses headless behavior so scripts cannot hang waiting for input;
`--interactive` forces prompts if desired. Ties have a deterministic name/passcode
order, and implausible queries still fail instead of selecting an unrelated card.
The terminal and JSON report record ambiguous selections and their candidates.
Matching a card does not bypass historical-review or supported-effect checks.

Each card is extracted, reviewed and saved independently. A failed/ambiguous card
or failed update is reported and skipped; later cards still run, and successful
earlier writes remain. Existing rule IDs and list settings are preserved.
`--simulator <directory>` selects another installation. `--dry-run` validates the
proposed merges without changing the list. Names resolving to the same passcode
are processed once after their first success.

Progress prints to the terminal, and `reports/last-edison-import.json` records
per-card outcomes, source diagnostics, warnings and candidate matches. This
directory is Git-ignored; `--report <path>` selects another output. Exit status 0
means no card failed; 1 means some cards failed while successful cards were saved;
2 means setup or report writing failed. A report-write error does not undo cards
already saved.

Stratos is also reviewed and supported: choose its HERO search or Spell/Trap
destruction effect at activation, then select cards at resolution. Reload the
updated extension and refresh Duelingbook before using this new action type.
See [usage](USAGE.md#elemental-hero-stratos) for timing and native movement limits.

The script tries the card's full supported effect, not a partial implementation.
The extractor currently supports a limited action vocabulary; missing historical
reviews or unsupported effects still need a reviewed mapping and sometimes a
new generic adapter. Those cards stay out of the list and their diagnostics stay
in the report. Raw downloaded rulings remain in the extractor's ignored cache.

While the local server is running and extension settings is watching
`http://127.0.0.1:8765/edison.json`, each successful write synchronizes live.
No extension reload is needed for JSON edits. The wrapper itself never commits,
pushes, or changes browser settings.

`edison.reviews.json` contains reviewed historical card facts, corrections,
provenance and comparison notes for the separate simulator extractor. All actual
card mappings belong here, alongside `edison.json`; the extractor repository
contains only generic code, format/source metadata and synthetic tests.

From the extension checkout, `--write personal-rules/edison.json` automatically
loads `personal-rules/edison.reviews.json`. For preview, pass it explicitly:

```sh
node card-rule-extractor/extract-card-rules.mjs 09411399 --ruleset edison --reviews personal-rules/edison.reviews.json
```

The review document is extractor input, not an extension rules list. Do not
import it into the extension. Raw third-party ruling JSON/HTML is downloaded
automatically by the extractor into its ignored local cache; it is not included
in either repository. Cached rulings are retained until explicitly refreshed
or cleared.
