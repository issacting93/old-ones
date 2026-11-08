# The Old Ones

A gothic mystery in loops. You are an outsider who arrives in **Vesper**, a walled town built on water the old ones lived on long before anyone laid a stone, to find someone who has gone missing. Each loop is one lunar month: eight nights of talking to people who have never met you, searching the town, and learning the old ones' language one word at a time. At the full moon you name what happened and write a sentence in their words on the tower door. The town forgets. You don't. The next town grows from your sentence.

Arrival meets Bloodborne: the patient work of learning an alien language, in a vertical gothic town where knowing more makes the world stranger.

```sh
npm install
npm run dev                    # play it at http://localhost:5173
npm run playtest -- 3 listener # play three loops headless (or "hasty")
npm run species                # rebuild the slim species file after changing src/content/old-ones.js
npm run sigils                 # redraw the sigil words with Sigil Forge
```

## How it fits together

```
your sentence ─► the city ─► the old ones ─► the mystery ─► what people know ─► what you learn ─► your sentence
 (sigils.js)   (town-map)   (ecology)      (case.js)      (cases.js facts)   (talk.js)
```

Every link is recorded in the brain (`core/graph.js`), and the full moon reads it backwards to show why it happened.

| Folder | What it is | Where it came from |
|---|---|---|
| `src/core/` | Event bus, state store, dice, the rules language, scenario system, conversations (`talk.js`), the brain (`graph.js`) | Mandate (`systems/`), see below |
| `src/world/town-map.js` | The town as a radial WFC layout, weighted by the sentence, with buildings pinned in | Forge's city generator |
| `src/world/ecology.js` | The old ones over the town; buildings set populations, draw species, raise wards | Forge's Cybernetic Ecology sim |
| `src/world/route-stage.js` | The town staged the Kentucky Route Zero way in three.js: the WFC town built from creature parts, Spire Forge towers, ridges, pines, one lantern, the old ones drawn over it | Route Scene (`tools/world-scene/route-scene.html`) |
| `src/game/engine.js` | Loops and nights: regrow → dusk → deal → two actions → night → … → the full moon | New |
| `src/game/case.js` | The mystery generator: picks what happened from the world and writes the brain | New |
| `src/content/` | Everything authored: sigils, cases, characters, places, townsfolk, lore, town, buildings, old ones, events, the moon | New |
| `src/ui/` | Svelte 5 views: the staged town (`RouteView`) or flat plan (`TownView`), conversation panel, reckoning, ledger | New |
| `public/vendor/forge/` | Classic scripts copied from interactions_library | Forge |
| `tools/` | `slim-species.mjs` (cuts the 20 MB species file to the roster), `build-sigils.mjs` (draws the words with Sigil Forge), `playtest.mjs` (headless loops), `artifact.mjs` | New |

Most new work only needs `src/content/`. Each content file explains its own format at the top.

## Provenance

Copied from [interactions_library](https://github.com/issacting93/interactions_library) at `6b38818`, unmodified, into `public/vendor/forge/`:
`shared/city/city-wfc.js`, `shared/ecology/ecology-sim.js`, `shared/ecology/ecology-render.js`; and at `59760f6`: `shared/style/style-recipes.js`, `shared/creature-arch.js`, `shared/creature-parts.json`, `shared/tower/creature-spire.js`, `shared/city/creature-city.js` (Route Scene's staging). `ecology-species.slim.js` is generated from `shared/ecology/ecology-species.js` by `npm run species`. `src/content/sigil-glyphs.js` is generated from `shared/generators/sigil-generator.js` and `shared/creature-parts.json` by `npm run sigils`.

Copied from [Mandate](https://github.com/issacting93/Mandate) at `0207883`, unmodified: `systems/bus.js`, `systems/state.js`, `systems/dice.js`.

Ported from Mandate, with changes:
- **`core/rules.js` + `core/scenario.js`** come from `systems/scenario.js`. Same condition/effect model (AND/OR/NOT, pools, priorities, chains), but conditions and effects are open registries that read only the state store, so ecology conditions are one entry each. Chained events re-check their conditions when they come due.
- **`core/talk.js`** comes from the conversation rules inside `ConversationOverlay.svelte`: interjections, checks where failure still says something, and the solution-jump fail. Rebuilt for a detective: topics instead of a linear script, facts generated per case, showing cards as evidence, and sigil words in place of departments as the lenses.
- Mandate's `DISTRICTS` array was mutable shared state; here content is read-only and all play state lives in the store.

When either source repo changes, re-copy the file and update the commit hash above.

See [docs/design.md](docs/design.md) for the design and what comes next.
