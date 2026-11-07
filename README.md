# The Old Ones

A gothic mystery town game. You are the mayor of **Vesper**, a walled town built on water the old ones lived on long before anyone laid a stone. Each night you walk the quarters and listen to the people who live there, then the council makes one decision about what the town builds. Everything you build changes how the old ones live, and how they live changes what people have to tell you. Over the nights the town drifts toward one of three relationships with them: **Kinship** (live alongside them), **Distance** (keep them out) or **Dominion** (put them to use).

This repo is the first playable slice: four quarters, three townsfolk, six buildings, seven species of old ones, about twenty dusk events, and a lunar cycle across six nights that ends on a full moon — clear, or blood red, depending on what the town has done.

```sh
npm install
npm run dev          # play it at http://localhost:5173 (?seed=N for another town)
npm run playtest     # play six nights headless and print what happened (routes: industry, kin, ward)
npm run species      # rebuild the slim species file after changing src/content/old-ones.js
```

## How it fits together

```
 council builds ──► town-map (radial WFC) ──► the streets regrow around the new building
        │
        └──────────► ecology (creature sim) ──► populations shift, creatures orbit or avoid it
                                                     │
                     night ends: hunger rule, readings per species and per quarter
                                                     │
 dusk events (rules) ◄───────────────────────────────┘
        │
        └──► unlock conversation threads ──► what you say pushes stance, flags, coin ──► council
```

| Folder | What it is | Where it came from |
|---|---|---|
| `src/core/` | Event bus, state store, dice, the rules language, scenario system, conversation runner | Mandate (`systems/`), see below |
| `src/world/town-map.js` | The town as a radial WFC layout; building pins a cell and regrows the streets locally | Forge's city generator |
| `src/world/ecology.js` | The old ones over the town; buildings set populations, draw species, raise wards | Forge's Cybernetic Ecology sim |
| `src/game/engine.js` | The night loop: dusk → visits → council → night | New |
| `src/content/` | Everything authored: town, quarters, lenses, buildings, old ones, characters, events, the moon | New |
| `src/ui/` | Svelte 5 views: town map with the creature render on top, conversation panel, council, ledger | New |
| `public/vendor/forge/` | Classic scripts copied from interactions_library | Forge |
| `tools/` | `slim-species.mjs` (cuts the 20 MB species file to the roster), `playtest.mjs` (headless runs) | New |

Most new work only needs `src/content/`. Each content file explains its own format at the top.

## Provenance

Copied from [interactions_library](https://github.com/issacting93/interactions_library) at `6b38818`, unmodified, into `public/vendor/forge/`:
`shared/city/city-wfc.js`, `shared/ecology/ecology-sim.js`, `shared/ecology/ecology-render.js`. `ecology-species.slim.js` is generated from `shared/ecology/ecology-species.js` by `npm run species`.

Copied from [Mandate](https://github.com/issacting93/Mandate) at `0207883`, unmodified: `systems/bus.js`, `systems/state.js`, `systems/dice.js`.

Ported from Mandate, with changes:
- **`core/rules.js` + `core/scenario.js`** come from `systems/scenario.js`. Same condition/effect model (AND/OR/NOT, pools, priorities, chains), but conditions and effects are open registries that read only the state store, so ecology conditions are one entry each. Chained events re-check their conditions when they come due.
- **`core/conversation.js`** comes from the logic inside `ConversationOverlay.svelte`, pulled out of the component so it runs without a UI. Same script format as `conversations_v2.js`; departments are renamed lenses, and scripts are split into threads with `requires` conditions and `effects`, so the world decides what a person has to say and what you say changes the world.
- Mandate's `DISTRICTS` array was mutable shared state; here content is read-only and all play state lives in the store.

When either source repo changes, re-copy the file and update the commit hash above.

See [docs/design.md](docs/design.md) for the design and what comes next.
