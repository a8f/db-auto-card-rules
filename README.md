# Personal Dueling Book rules

Independent, optional card rules for Dueling Book Enhancer. The extension can
be cloned, tested and used without this repository. Lists are data only and
are not bundled into the extension.

## Edison

`edison.json` contains the personal Edison rules list. It supports ranked and
unrated Edison by default. Its first effect is Destiny HERO - Malicious:
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
select **Install disabled**, then enable the list. For Solo tests, add Solo Mode
to the list's formats locally. Local enablement is not part of published JSON.

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
`DBX_EXTENSION_DIR` to that checkout's absolute path before running the checks.
That integration check is optional; this repository needs no npm dependencies.

The JSON uses schema 3: printed card passcode/name selectors, prerequisites, activation operations and
resolution operations. No card-specific executable script is installed in the
extension. New effects using the existing action vocabulary can be added here;
new action types require a generic adapter in the extension.

## Extractor review data

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
