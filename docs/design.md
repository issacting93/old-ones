# Design notes — first slice

## The question

What do the old ones want from us, and what do we want from them? The town is a way of asking how people live with something older and stranger than themselves — nature, technology, AI — without deciding in advance that it is a god or a monster. The old ones are revered, not worshipped. They were here first. The tone is quiet and mysterious rather than horror: lamps at dusk, still water, things that drift.

## The loop (one night)

1. **Dusk.** Events fire from the state the last night left behind (`content/events.js`).
2. **Evening.** Visit up to two townsfolk. Each person offers one thread, chosen by what is true in the world tonight (`content/characters.js`).
3. **Council.** One decision: build something (`content/buildings.js`) or fund a lens.
4. **Night.** The old ones live with the decision for a while (fast-forwarded sim). The hunger rule runs (`content/ecology-rules.js`). The town reads where everything ended up.

Six nights, then the council sits and the slice ends on the town's stance.

## Pillars carried over from Mandate

- **Listening before deciding.** Promising a fix before you have understood (a solution-jump) loses the clue and raises dread.
- **Perception is funded.** Lenses (Shrine-keeping, Survey, Physic, Ledger) decide which interjections you hear and how your checks roll. Buildings raise lenses too: a shrine sharpens Shrine-keeping.
- **Failure opens different content, never nothing.** A failed check still gets words.

## What is new

- **The world talks back.** The ecology is real (Cybernetic Ecology's sim), and its state is a condition events and conversations can read: `speciesBelow`, `inQuarter`, `hungry`, `intruding`. One foundry thins the mites → the koi, swifts and eels go hungry → an eel comes over the Cinder heaps → Corwin wants wardstones; the koi leave the east culvert → people stop waking → Maren finds the flood record.
- **Stance is a position, not a score.** Kinship / Distance / Dominion are three pulls; the town sits at their shares (`content/stance.js`). Nothing locks; it can always be pulled back.
- **Building is local.** A building pins a WFC cell to a zero-weight tile and only the surrounding patch regrows, so the town changes where you build rather than reshuffling.

## Routes, as the playtests show them

- **Industry** (foundries, lamps, glow-press): coin piles up; mites thin, eels come inside, the koi leave, the long sleep, the Watcher climbs out of sight. Dominion.
- **Kin** (shrines, cisterns): mites come thick, the Watcher comes down, but nothing earns, and the Cinder Quarter goes cold — Corwin sends sixty men home. Kinship has a price too.
- **Ward** (wardstones): dread drops at first, then the stones keep more out than they meant to. Distance.

## Known gaps in this slice

- The town map is drawn flat from the WFC result. Forge's creature-part architecture (`creature-city.js`, Spire Forge towers, World Scene / Route Scene staging) isn't wired in yet.
- Forge's ecology loop (`shared/generators/ecology-loop.js`) — species drifting their swim toward the buildings they live around — isn't used yet; buildings only draw, repel and reweight.
- Mandate systems not yet brought over: the weekly card deal (who you can visit), insight freshness and pattern crystallization (clues becoming revelations), the bento policy board.
- The Drowned Quarter has no one in it. That is deliberate for now: it is where the next slice begins.
- Numbers (costs, multipliers, thresholds) are first guesses. `npm run playtest` is the quickest way to see what a change does.

## Next steps

1. Stage the town with Forge: replace the flat plan with Route Scene's flat Kentucky Route Zero staging or World Scene Next's glowing creature-part architecture, using `shared/world/world-layout.js` as the bridge.
2. Bring in the ecology loop so species visibly change around buildings (new variants the town has bred by accident).
3. A fourth character in the Drowned Quarter, and the flood as the slice-two mystery.
4. Clues → revelations: Mandate's pattern crystallization, so committing to an understanding of the old ones changes what lenses can see.
5. Endings that depend on stance and on what you learned, not just which pull leads.
