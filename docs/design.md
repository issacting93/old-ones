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

## The moon

Every night is one lunar day of a compressed eight-day cycle (`content/moon.js`). The slice starts at the new moon, so the full moon falls on night 5 and night 6 is the morning after. Each phase nudges the old ones: the new moon lets the eels range wider, the waxing moon draws the Watcher to the tower, the full moon lifts the mites and moths toward it. The moon crosses the map while the night passes and its light tints the town.

**The blood moon.** A full moon rises red when the town has strained things with the old ones — dread high, the eels or koi starving, or the town leaning hard toward Distance or Dominion (`MOON.blood.when`). The night before, there is an omen: a Shrine-keeper (lens 2+) reads it plainly in the sky and the almanac marks it; everyone else just notices the dogs won't settle. Ondine then offers a choice for the eve: keep the old courtesies (which can still turn the moon pale), ring iron bells, or plan to take the old ones at the tower. Under a blood moon every old one gathers at the Old Tower, the eels and veils swell, wardstones hold half as far, and what happens depends on where the town stands: they wait at the shrines like guests (Kinship), press against the iron until it splits (Distance), or hang over the forges and presses counting what was taken (Dominion). The sleepers in the physic house sit up and watch. A clear full moon instead brings moon-viewing on the rooftops.

## Routes, as the playtests show them

- **Industry** (foundries, lamps, glow-press): coin piles up; mites thin, eels come inside, the koi leave, the long sleep, the Watcher climbs out of sight, and the full moon rises red over the forges. Dominion.
- **Kin** (shrines, cisterns): mites come thick, the Watcher comes down, the full moon is a clear moon-viewing, but nothing earns, and the Cinder Quarter goes cold — Corwin sends sixty men home. Kinship has a price too.
- **Ward** (wardstones): dread drops at first, then the stones keep more out than they meant to, and under the blood moon the old ones press against the iron all night. Distance.
- Keeping the courtesies on the eve of a foretold blood moon turns it pale again — the one moment a strained town can pull back.

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
6. The `tower-snare` and `iron-bells` choices on the eve of a blood moon set flags that nothing reads yet; they are the hooks for what Dominion and Distance do with a gathered moon.
