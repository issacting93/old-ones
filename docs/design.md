# Design notes

The full design lives in the core design doc (Claude Docs, "The Old Ones — Core Design"). This file records what the code does today and where each idea lives.

## The game in one paragraph

You are an outsider who arrives in Vesper to find someone who has gone missing. A loop is one lunar month, eight nights from the morning after one full moon to the next. Each night the town deals you people and places; you play two, mostly by talking. What people know comes from a mystery generated out of the town and its old ones. At the full moon you name what happened, and then write a sentence in the old ones' language on the tower door. The town forgets; you don't. The next town grows from your sentence.

## Thesis

Vesper is a message passed through time, and the player writes it. Stories outlast almost everything people make; the strongest proposals for warning people ten thousand years ahead about nuclear waste were stories, not signs (the atomic priesthood, the ray cats). Your sentence is a message to a town that won't remember you, and the town keeps it the way towns keep things: as rites, worn down. The larger mystery (`content/lore.js`) ends with the courtesies (lamps at dusk, still water, no iron in the groves) turning out to be a sentence carved in your own hand.

## The brain

One causal chain runs the game, recorded each loop in `core/graph.js`:

```
your sentence ─► the city ─► the old ones ─► the mystery ─► what people know ─► what you learn ─► your sentence
 (sigils.js)   (town-map)   (ecology)      (case.js)      (cases.js facts)   (talk.js)
```

- `content/sigils.js` `compileSentence` turns words into rules: buildings to pin, tile weights, species numbers, what the tower gathers, stance, dread.
- `world/town-map.js` regrows the radial WFC town with those weights and pins the buildings.
- `world/ecology.js` runs the creature sim in it; `game/engine.js` runs the hunger rule.
- `game/case.js` scores every cause in `content/cases.js` against that world and picks one, then writes the chain into the graph.
- At the full moon the reckoning reads the graph backwards to show why it happened.

## A night

1. **Dusk:** events (`content/events.js`), the moon, and sightings: the case's own signs on nights 2 and 5, plus where the old ones are thickest.
2. **The deal:** five cards, at least two people and two places. A lead someone just gave you is always in the next hand.
3. **Two actions:** talk to a person (`core/talk.js`) or search a place (what stands there, which old ones are near, a carved word, physical evidence, maybe the missing person).
4. **Deduce:** on the Case tab, put two things you know together. Only the right pairs make a deduction.
5. **The night passes:** the sim fast-forwards, hunger runs, the town takes readings.

## Talking

Mandate's rules, rebuilt for a detective (`core/talk.js`):

- Topics instead of a script: the case, the person themselves, or a card you show them. Three topics per visit.
- Surface facts come out when asked. Hidden facts come out through trust (listening), a press check (trust × 3 + 2d6 against 9; failing tells you why they're guarded), evidence (showing the card that triggers them), or a sigil word.
- **Sigils are the lenses.** When a hidden fact sits under what someone says and you know the word for it, the word interjects with a follow-up question. If you misread the word, the question comes out wrong and the misreading is exposed.
- Promising a fix before you understand ("I'll find her") loses trust and raises dread.
- Showing a memory from a past loop gets "How do you know that?": trust drops, but if the same fact exists in this case, they tell you.

## The language

Ten words (`content/sigils.js`), drawn from your Sigil Forge alphabet by `tools/build-sigils.mjs` into Arrival-style ink rings (`ui/Sigil.svelte`). You see a word first as a guess (wrong 30% of the time, mistaken for its `decoy`); seeing it in a second place settles it. Places carve words, the core cast each show a few, and the Watcher (Insight 4+) traces them. A sentence holds two words, plus one per three you are sure of. A word writes what it truly means, so an unexposed misreading writes something you didn't intend.

**Insight** = words known. 3: you read a coming blood moon a night early. 4: the Watcher comes down to you. 6: the old ones notice you, dread rises, and a blood moon becomes likely.

## The cases

| Cause | What drives it | Found at |
|---|---|---|
| Starving eels | Forges and lamphouses thin the mites; the eels go hungry | The culvert grate |
| The long sleep | Koi leave the culverts; the town's default habit | The tower's lowest door |
| The glow-press | Only in a town with a glow-press | Inside a veil over the groves |
| The wardstones | Only in a town with wardstones | The flooded dye-works cellar |
| The guest | Kin, open and lamplight words; mites very thick | The pear ring beyond the north gate |

Each has facts held by the relative, a witness, the core three and places; two deductions; and a key deduction that proves the cause.

## The full moon

Night 8. A blood moon rises if the town is strained (dread 5+, starving eels or koi, a hard lean toward Distance or Dominion, Insight 6+) unless you found the missing person alive. You name what happened; naming it right answers the next question of the larger mystery. A blood moon takes the relative who went looking (or the witness, if you found the missing person), and they are the next loop's case. Then you write.

## What carries between loops

Saved in the browser (`localStorage`, key `old-ones.carry.v1`): the lexicon, up to 12 memories, stance, the sentence, the next missing person, how many questions are answered, and the history of towns. The town, its people's trust, its buildings and its dread are all new.

## The look

The map is the town staged the Kentucky Route Zero way (`world/route-stage.js`, shown by `ui/RouteView.svelte`), ported from interactions_library's Route Scene: a fixed orthographic camera, unlit flat fills shaded only by stepped depth bands (the shared Route Zero recipe in `style-recipes.js`), thin pencil lines, ridges and pines cut out behind, the road you came in by, a painted sky with the moon at its phase. The town is this loop's own WFC town built from creature parts (`creature-city.js`); the Old Tower and every building the sentence pinned are Spire Forge towers (`creature-spire.js`), and the lit ones burn as windows. The old ones are the game's own sim, each drawn as its Cybernetic Ecology figure. One amber lantern hangs in the tower's crown and moves to whatever place or quarter a card points at. The palette is sage at dusk, ultramarine while the night passes, rust under a blood moon. Drag turns and tilts the set a little; the wheel zooms. "Plan" switches to the flat plan (`ui/TownView.svelte`), which is also the fallback without WebGL2.

## Checking changes

`npm run playtest -- 3 listener` plays three loops headless; `hasty` plays a detective who promises fixes. The log shows each night, what was learned, the reckoning, the brain's explanation and the sentence written.

## Known gaps

- Generated people speak in templates; an LLM voicing them over engine-owned facts (Mandate's rule split) is the natural next step for variety.
- Mandate's insight freshness and costly de-commit aren't in; deductions don't yet colour what you hear.
- Five cases is enough to see the system work, not enough for many loops. The fifth question of the larger mystery has no ending sequence yet.
- Balance is first guesses: dread climbs fast in a forge town, and a careful player finds most missing people.
