// content/cases.js — what can happen to someone in Vesper, and the trail it leaves.
//
// At the start of every loop the mystery generator (game/case.js) scores each cause against the
// town the last sentence grew and the old ones living in it, and picks one. So the case follows
// from the world: a town full of forges starves the mites, starving mites send the eels in, and
// an eel takes someone. Then it fills the cause's templates with this loop's people.
//
// Template context `c`: c.V (vanished), c.K (their relative), c.W (a witness), c.Q (quarter
// name). People carry name, first, role, rel, and pronouns: pron / obj / pos, with Pron
// capitalised.
//
// A fact is something one person (or place) knows:
//   holder    kin | witness | ondine | corwin | maren | place:<id>
//   hidden    false: they say it when asked about the case. true: it has to be drawn out by trust
//             (`need`), by pressing them (a check), or by a sigil word you know that sits under
//             what they say (`concepts`, followed by the question `ask`)
//   triggers  cards that make them say it when you show the card ("sighting:eel", "clue:<id>",
//             "place:<id>", "person:<id>", "word:<id>")
//   introduces  a person or case place this fact puts on your map
//   found     searching this place finds the vanished person (alive, if it is before the full moon)
//
// `deductions` combine two pieces of what you know (clue or deduction ids). `key` is the
// deduction that proves the cause; `answer` is what you say at the full moon to name it.

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const CASES = [
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "eel",
    answer: "The Pale Eels came in starving and took them.",
    words: ["hunger", "light"],
    victimRoles: [
      { role: "lamplighter", habit: "light the late lamps" },
      { role: "night carter", habit: "bring the slag carts down" },
    ],
    quarter: (w) => w.busiest || "cinder",
    score: (w) => (w.share.wisp < 0.75 ? 2 : 0) + (w.hungry.eel ? 2 : 0) + 0.6 * ((w.built.foundry || 0) + (w.built.lamphouse || 0)) + (w.words.hunger || 0) * 0.8,
    signs: [{ species: "eel", text: (c) => `Something long and pale over the ${c.Q} rooftops, low enough to touch the chimneys.` }],
    places: [{ id: "culvert", name: (c) => `The culvert gate, ${c.Q}`, quarter: (c) => c.q, blurb: "An iron grate where the culvert runs out under the wall." }],
    facts: [
      { id: "e-last", holder: "kin", says: (c) => `${c.V.first} went out after the dusk bell to ${c.V.habit} in the ${c.Q}. ${cap(c.V.pron)} never came back up the steps.`,
        clue: (c) => `${c.V.name} went out to ${c.V.habit} in the ${c.Q} after dusk and did not come back.`, concepts: ["light"] },
      { id: "e-pale", holder: "kin", hidden: true, concepts: ["hunger"], ask: "Did anything frighten them, those last nights?",
        says: (c) => `${cap(c.V.pron)} said something had been following the lamps. Something pale that kept just past the edge of the light. ${cap(c.V.pron)} laughed about it.`,
        clue: (c) => `${c.V.first} felt followed by something pale that kept out of the lamplight.`, introduces: "witness" },
      { id: "e-sighting", holder: "witness", triggers: ["sighting:eel"], concepts: ["hunger"],
        says: (c) => `I was on the ${c.Q} wall when the bell went. Something came over the roofs, long as a street and white as bone. It went low along the culvert.`,
        clue: (c) => `The ${c.W.role} saw a Pale Eel come over the ${c.Q} roofs and follow the culvert, the night ${c.V.first} vanished.` },
      { id: "e-dropped", holder: "witness", hidden: true, concepts: ["take"], ask: "What did it do when it came down?",
        says: (c) => `It didn't eat. It set something down by the culvert grate at the ${c.Q} gate, the way a cat leaves a bird on a step, and it went on.`,
        clue: (c) => `The eel set something down at the culvert grate in the ${c.Q} and left it there.`, introduces: "place:culvert" },
      { id: "e-thin", holder: "ondine", concepts: ["light"],
        says: () => "The mites come thin this month. Ten years ago you couldn't see the shrine for them. Now the lamps burn alone.",
        clue: () => "The mites are thinning. The shrine lamps burn with nothing coming to them." },
      { id: "e-diet", holder: "ondine", hidden: true, concepts: ["hunger"], ask: "What happens to the things that live on the mites?",
        says: () => "The eels live on the mites. Everyone with a grandmother knows that. When the mites go, the eels come into town looking.",
        clue: () => "The Pale Eels feed on the mites. When the mites fail, the eels come into town hungry." },
      { id: "e-deny", holder: "corwin", triggers: ["clue:e-sighting"],
        says: (c) => `Eels? I've lived over the slag heaps twenty years. Nothing comes over these roofs but smoke. Whoever told you that was drinking.`,
        clue: () => "Corwin denies that anything comes over the roofs at night." },
      { id: "e-smoke", holder: "corwin", hidden: true, concepts: ["fire"], ask: "What does the smoke do, at night?", triggers: ["clue:e-thin", "place:forges"],
        says: () => "Fine. The new furnaces run all night now. The smoke lies on the shrine ponds till noon. I've watched the mites drop out of it like ash.",
        clue: () => "Forge smoke settles on the shrine ponds overnight, and the mites die in it." },
      { id: "e-falls", holder: "maren",
        says: () => "Two people this month with broken wrists from falling in the dark. Both said they ran from something they never saw.",
        clue: () => "Maren has treated people who ran in the dark from something unseen." },
      { id: "e-soot", holder: "place:forges", concepts: ["fire"],
        says: () => "Soot lies thick on every ledge, and the shrine pond downhill of the sheds has a skin of ash on it.",
        clue: () => "The pond below the forges is skinned with ash." },
      { id: "e-grate", holder: "place:culvert", found: true,
        says: (c) => `Wedged against the culvert grate, soaked and cold and breathing, is ${c.V.name}. There are no marks on ${c.V.obj} at all.`,
        clue: (c) => `${c.V.name} was found at the culvert grate in the ${c.Q}, unhurt.` },
    ],
    deductions: [
      { id: "d-starving", needs: ["e-thin", "e-diet"], text: () => "The eels are starving because the mites are dying out." },
      { id: "d-why", needs: ["e-thin", "e-smoke"], text: () => "The forge smoke is what is killing the mites." },
      { id: "d-eel-took", needs: ["e-sighting", "e-last"], text: (c) => `A hungry eel crossed ${c.V.first}'s path in the ${c.Q} that night.` },
    ],
    key: "d-eel-took",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "sleep",
    answer: "The long sleep walked them to the Old Tower.",
    words: ["sleep", "tower"],
    victimRoles: [
      { role: "well-keeper", habit: "draw the morning water" },
      { role: "laundress", habit: "wash at the culvert steps" },
    ],
    quarter: () => "cistern",
    // the town's oldest way of losing people: the likeliest when nothing else is driving it
    score: (w) => 1 + (w.share.koi < 0.85 ? 2 : 0) + (w.hungry.koi ? 1 : 0) + (w.words.sleep || 0) * 1.2 + (w.words.tower || 0) * 0.8,
    signs: [{ species: "koi", text: () => "Nothing rises in the east culvert at dusk. The water there has a skin on it." }],
    places: [{ id: "tower-door", name: () => "The Old Tower's lowest door", quarter: () => "centre", blurb: "The door with no handle, on the side of the tower that faces no street." }],
    facts: [
      { id: "s-bed", holder: "kin", concepts: ["sleep"],
        says: (c) => `${c.V.first} slept four days straight. We turned ${c.V.obj}, we wet ${c.V.pos} lips. On the fifth morning the bed was empty and the door was open.`,
        clue: (c) => `${c.V.name} slept for four days, then left the house in the night.` },
      { id: "s-facing", holder: "kin", hidden: true, concepts: ["tower"], ask: "Which way did they lie, while they slept?",
        says: (c) => `${cap(c.V.pron)} always lay facing the same way, toward the middle of town. If we turned ${c.V.obj}, ${c.V.pron}'d turn back in an hour.`,
        clue: (c) => `While ${c.V.first} slept, ${c.V.pron} kept turning to face the middle of town.`, introduces: "witness" },
      { id: "s-still", holder: "maren", concepts: ["water"], triggers: ["sighting:koi"],
        says: () => "The east culvert has gone still. No koi come up it now, and every sleeper I have lives along it.",
        clue: () => "The koi have left the east culvert, and every sleeper lives along it." },
      { id: "s-flood", holder: "maren", hidden: true, concepts: ["water"], ask: "Has the water gone still like this before?",
        says: () => "There's a line in the flood-year ledger. The koi left the Drowned Quarter's wells a month before the water came. The sleep came first.",
        clue: () => "Before the flood, the koi left the Drowned Quarter, and the sleep came first." },
      { id: "s-barefoot", holder: "witness", concepts: ["tower"],
        says: (c) => `Moonrise, two nights back. Someone barefoot in a nightshirt, walking up the avenue toward the Old Tower. Walking like ${c.V.pron} knew the way.`,
        clue: (c) => `The ${c.W.role} saw someone barefoot walking toward the Old Tower at moonrise.` },
      { id: "s-door", holder: "witness", hidden: true, concepts: ["sleep"], ask: "Where did they go when they reached the tower?",
        says: () => "Round the back, to the side with no street. There's a door there nobody uses. I didn't follow.",
        clue: () => "The sleepwalker went round to the tower door that faces no street.", introduces: "place:tower-door" },
      { id: "s-counted", holder: "ondine", hidden: true, concepts: ["tower", "sleep"], ask: "What does the tower have to do with sleepers?",
        says: () => "My grandmother said the sleepers go up to the tower to be counted, and the ones who are counted come home. She never said what happens to the others.",
        clue: () => "Old story: sleepers go to the tower to be counted." },
      { id: "s-damp", holder: "corwin",
        says: () => "Sleeping sickness. It's the damp in that quarter. Drain it and put something useful there.",
        clue: () => "Corwin blames the damp for the sleeping sickness." },
      { id: "s-found", holder: "place:tower-door", found: true,
        says: (c) => `Curled asleep against the door with no handle, frost in ${c.V.pos} hair, is ${c.V.name}. ${cap(c.V.pron)} wakes when you touch ${c.V.pos} hand, and asks what day it is.`,
        clue: (c) => `${c.V.name} was found asleep at the Old Tower's lowest door.` },
    ],
    deductions: [
      { id: "d-koi-sleep", needs: ["s-still", "s-flood"], text: () => "The sleep comes where the koi leave the water." },
      { id: "d-walked", needs: ["s-barefoot", "s-facing"], text: (c) => `${c.V.first} walked to the Old Tower in ${c.V.pos} sleep.` },
    ],
    key: "d-walked",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "veils",
    answer: "The veils took them back from the glow-press.",
    words: ["take", "hunger"],
    victimRoles: [{ role: "press-hand", habit: "work the night shift at the glow-press" }],
    quarter: (w) => w.pressQuarter || "drowned",
    // only a town with a glow-press can lose someone to it
    score: (w) => (w.built.harvest ? w.built.harvest * 3 + (w.words.take || 0) * 1.2 + (w.share.jelly > 1.1 ? 0.6 : 0) : -9),
    signs: [{ species: "jelly", text: () => "The veils are thick over the groves, a whole bank of them, lit blue from inside." }],
    places: [{ id: "veil-bank", name: () => "The low veil over the groves", quarter: () => null, blurb: "One veil hangs lower than the rest, heavier, turning slowly." }],
    facts: [
      { id: "v-shift", holder: "kin", concepts: ["take"],
        says: (c) => `${c.V.first} took the night shift at the glow-press. Double pay. ${cap(c.V.pron)} came home with blue light under ${c.V.pos} nails that wouldn't wash out.`,
        clue: (c) => `${c.V.name} worked nights at the glow-press.` , introduces: "witness" },
      { id: "v-thick", holder: "witness", triggers: ["sighting:jelly"], concepts: ["take"],
        says: () => "The veils were thick over the groves that night, lit blue from inside. One hung lower than the others. Heavier. Like it was carrying something.",
        clue: () => "One veil over the groves hung low and heavy, as if it were carrying something.", introduces: "place:veil-bank" },
      { id: "v-burns", holder: "maren", hidden: true, concepts: ["take"], ask: "What do the press-hands come to you with?",
        says: () => "The press-hands come to me with marks on their palms. Not burns. Stings, in rings, like something took hold of them back.",
        clue: () => "Press-hands carry ring-shaped stings, as if the veils held on to them." },
      { id: "v-pay", holder: "corwin",
        says: () => "The press pays better than my forges, I'll give it that. Lamps that never smoke. Half the town wants one.",
        clue: () => "The glow-press pays well, and its lamps sell fast." },
      { id: "v-count", holder: "corwin", hidden: true, concepts: ["take", "hunger"], ask: "Does the press keep count of what it takes?",
        says: () => "The press counts its jars every dawn. That morning it was one jar up and one hand down. I wrote it in the ledger as a mistake.",
        clue: () => "The morning after, the press counted one jar more and one worker fewer." },
      { id: "v-held", holder: "ondine", hidden: true, concepts: ["kin", "take"], ask: "What are the veils owed?",
        says: () => "The veils were never meant to be held. They hold back. Whatever you take from them, they come for something in turn.",
        clue: () => "Ondine: whatever is taken from the veils, they take something back." },
      { id: "v-found", holder: "place:veil-bank", found: true,
        says: (c) => `Inside the lowest veil, folded like a moth in a lantern, is ${c.V.name}. When you reach in, the veil lets ${c.V.obj} go.`,
        clue: (c) => `${c.V.name} was found inside a veil over the groves.` },
    ],
    deductions: [
      { id: "d-trade", needs: ["v-burns", "v-held"], text: () => "The veils take back what the press takes from them." },
      { id: "d-press", needs: ["v-shift", "v-thick"], text: (c) => `A veil carried ${c.V.first} off from the press.` },
    ],
    key: "d-press",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "ward",
    answer: "The wardstones drove the old ones down onto them.",
    words: ["iron", "open"],
    victimRoles: [{ role: "clay-digger", habit: "dig clay in the Drowned Quarter" }],
    quarter: () => "drowned",
    // only a town with wardstones can drive the old ones onto someone
    score: (w) => (w.built.wardstone ? w.built.wardstone * 3 + (w.words.iron || 0) * 1.2 : -9),
    signs: [{ species: "wisp", text: () => "Every mite in town pouring into the Drowned Quarter like water down a drain." }],
    places: [{ id: "dye-cellar", name: () => "The dye-works cellar", quarter: () => "drowned", blurb: "Under the old dye works, where the best clay is." }],
    facts: [
      { id: "w-clay", holder: "kin", concepts: ["open"],
        says: (c) => `${c.V.first} went down to the Drowned Quarter for clay, like always. Nobody else goes there. ${cap(c.V.pron)} said it was the only quiet place left.`,
        clue: (c) => `${c.V.name} went to the Drowned Quarter for clay the night ${c.V.pron} vanished.`, introduces: "witness" },
      { id: "w-stones", holder: "corwin", concepts: ["iron"],
        says: () => "We raised the wardstones and slept easy for the first time in a month. Whatever was getting into the houses can't now.",
        clue: () => "The town raised wardstones, and the old ones stopped coming into houses." },
      { id: "w-pressed", holder: "witness", triggers: ["sighting:wisp"],
        says: () => "That night everything that glows came pouring into the Drowned Quarter. The sky over it went white. I've never seen so many in one place.",
        clue: () => "That night the old ones crowded into the Drowned Quarter, more than anyone had seen." },
      { id: "w-knock", holder: "witness", hidden: true, concepts: ["water"], ask: "Did you hear anything from down there?",
        says: () => "There's a cellar under the old dye works. Water was coming up into it when I passed. I heard knocking. I thought it was the pipes.",
        clue: () => "Knocking came from the flooding cellar under the dye works.", introduces: "place:dye-cellar" },
      { id: "w-sends", holder: "ondine", hidden: true, concepts: ["iron"], ask: "Where do they go, when the iron turns them?",
        says: () => "Iron doesn't keep them away. It sends them somewhere else. And wherever that is gets all of them at once.",
        clue: () => "Iron does not keep the old ones away. It sends them all somewhere else." },
      { id: "w-dreams", holder: "maren", hidden: true, concepts: ["water", "sleep"], ask: "What are people near the stones dreaming?",
        says: () => "People living near the stones dream of drowning. All the same dream: a cellar, and the water rising, and lights on the stairs.",
        clue: () => "People near the wardstones all dream of a flooding cellar with lights on the stairs." },
      { id: "w-found", holder: "place:dye-cellar", found: true,
        says: (c) => `Standing on a crate with the water at ${c.V.pos} chest is ${c.V.name}. The stairwell above is full of mites, so many the water underneath them lies flat and still.`,
        clue: (c) => `${c.V.name} was found in the flooded dye-works cellar, the old ones keeping the water still.` },
    ],
    deductions: [
      { id: "d-crowded", needs: ["w-stones", "w-sends"], text: () => "The wardstones drove every old one into the Drowned Quarter." },
      { id: "d-trapped", needs: ["w-clay", "w-pressed"], text: (c) => `${c.V.first} was in the Drowned Quarter when the old ones flooded into it.` },
    ],
    key: "d-trapped",
  },
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "guest",
    answer: "The mites led them out of the gate to visit the old ones.",
    words: ["kin", "open"],
    victimRoles: [
      { role: "orchard-keeper", habit: "walk the pear rows at dusk" },
      { role: "gatekeeper", habit: "close the north gate at moonrise" },
    ],
    quarter: () => "lantern",
    // a town that welcomes the old ones is visited by them, and is expected to visit back
    score: (w) => ((w.words.kin || 0) + (w.words.open || 0) + (w.words.light || 0) * 0.5) * 0.9 + (w.share.wisp > 1.2 ? 1.2 : 0) - (w.built.wardstone ? 2 : 0),
    signs: [{ species: "wisp", text: () => "The mites so thick at the north gate that the lamps there look like they are underwater." }],
    places: [{ id: "pear-ring", name: () => "The pear ring beyond the north gate", quarter: () => null, blurb: "A ring of old pear trees outside the wall, where nobody goes after dark." }],
    facts: [
      { id: "x-dusk", holder: "kin", concepts: ["light"],
        says: (c) => `${c.V.first} went out at dusk to ${c.V.habit}, same as always. The mites were so thick that night you could read by them. ${cap(c.V.pron)} never came back in.`,
        clue: (c) => `${c.V.name} went out at dusk on a night when the mites were very thick, and didn't come back.`, introduces: "witness" },
      { id: "x-happy", holder: "kin", hidden: true, concepts: ["kin"], ask: "How had they been, those last days?",
        says: (c) => `Happy. That's what frightens me. ${cap(c.V.pron)} kept saying ${c.V.pron}'d been invited somewhere and wouldn't say where.`,
        clue: (c) => `${c.V.first} said ${c.V.pron} had been invited somewhere.` },
      { id: "x-gate", holder: "witness", triggers: ["sighting:wisp"], concepts: ["open"],
        says: (c) => `The north gate was open. It's always open now, nobody bothers. I saw someone walk out through it inside a cloud of mites, slow, like a bride.`,
        clue: (c) => `The ${c.W.role} saw someone walk out of the open north gate inside a cloud of mites.` },
      { id: "x-ring", holder: "witness", hidden: true, concepts: ["light", "kin"], ask: "Where did the light go, after the gate?",
        says: () => "Out to the pear ring. There was light in it all night, low, like a room with the door shut. I didn't go and knock.",
        clue: () => "All night there was a low light in the pear ring beyond the north gate.", introduces: "place:pear-ring" },
      { id: "x-guest", holder: "ondine", hidden: true, concepts: ["kin"], ask: "What does a welcome ask of the one who gives it?",
        says: () => "A guest who is welcomed is expected to visit back. My grandmother said that about the old ones and about her sister-in-law, and meant both.",
        clue: () => "Ondine: a guest who is welcomed is expected to visit back." },
      { id: "x-soft", holder: "corwin",
        says: () => "Gates open all night, lamps for the lights, bowls of milk on doorsteps. This town's gone soft. Something was bound to walk in, or someone out.",
        clue: () => "Corwin says the town leaves its gates open all night now." },
      { id: "x-standing", holder: "maren", hidden: true, concepts: ["sleep", "light"], ask: "What do the mites do to people, when they come that thick?",
        says: () => "When they come that thick, people sleep standing up. I've seen it twice. Eyes open, smiling. They walk where the light walks.",
        clue: () => "When the mites come thick enough, people sleepwalk after them." },
      { id: "x-found", holder: "place:pear-ring", found: true,
        says: (c) => `In the middle of the pear ring, sitting with ${c.V.pos} back to the oldest tree, is ${c.V.name}, awake and smiling, surrounded by mites like a lamp in a room. ${cap(c.V.pron)} says ${c.V.pron} was only visiting.`,
        clue: (c) => `${c.V.name} was found in the pear ring, unharmed, saying ${c.V.pron} had only been visiting.` },
    ],
    deductions: [
      { id: "d-followed", needs: ["x-dusk", "x-gate"], text: (c) => `${c.V.first} followed the mites out of the north gate.` },
      { id: "d-visit", needs: ["x-guest", "x-happy"], text: (c) => `${c.V.first} was returning a visit the town owed.` },
    ],
    key: "d-followed",
  },
];

export const CASE_BY_ID = Object.fromEntries(CASES.map((c) => [c.id, c]));
