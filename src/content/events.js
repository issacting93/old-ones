// content/events.js — what happens at dusk.
//
// Every night begins by checking these. Each event: { id, headline, narrative, conditions,
// effects, priority?, pool?, chains?: [{ event, delay }], queuedOnly?, repeatable?, quarter?,
// tone? }. Conditions and effects are the language in core/rules.js, so the old ones (and the
// moon, and what you know) can start an event, and an event can change them back.
// `queuedOnly` events never fire on their own; another event chains them in.
//
// The town no longer builds during a loop: what stands was written by the last sentence. These
// events are how that town and its old ones live through the month.

export const EVENTS = [
  // ── the mites ────────────────────────────────────────────────
  {
    id: "mites-thinning",
    headline: "The lamps burn alone",
    narrative: "At dusk the wayside lamps are lit and almost nothing comes. A few mites, low over the water, and then not even those.",
    conditions: [{ type: "speciesBelow", key: "wisp", value: 0.6 }],
    effects: [{ type: "flag", value: "mites-thinning" }, { type: "dread", delta: 1 }],
    quarter: "lantern",
    tone: "omen",
  },
  {
    id: "mites-thick",
    headline: "The mites come thick",
    narrative: "Children follow the mites through the lanes with jars and let them go again at the stones, the way their grandparents did.",
    conditions: [{ type: "speciesAbove", key: "wisp", value: 1.2 }, { type: "built", kind: "shrine" }],
    effects: [{ type: "dread", delta: -1 }],
    quarter: "lantern",
    tone: "grace",
  },

  // ── the eels ─────────────────────────────────────────────────
  {
    id: "eel-inside",
    headline: "Something long and pale",
    narrative: "A Pale Eel came in over the rooftops last night, low enough to touch the chimneys. By morning everyone in the quarter had a story about it.",
    conditions: [{ type: "intruding", key: "eel" }],
    effects: [{ type: "flag", value: "eel-inside" }, { type: "dread", delta: 2 }],
    tone: "omen",
  },

  // ── the koi and the sleep ────────────────────────────────────
  {
    id: "koi-leaving",
    headline: "The east culvert goes still",
    narrative: "Nothing rises in the east culvert at dusk. By morning the water there has a skin on it.",
    conditions: [{ type: "speciesBelow", key: "koi", value: 0.75 }],
    effects: [{ type: "flag", value: "koi-leaving" }, { type: "dread", delta: 1 }],
    chains: [{ event: "long-sleep", delay: 1 }],
    quarter: "cistern",
    tone: "omen",
  },
  {
    id: "long-sleep",
    queuedOnly: true,
    headline: "They don't wake",
    narrative: "In the Cistern Quarter, people on the east culvert go to bed and do not wake. They breathe. They turn over. Maren has stopped sleeping herself.",
    conditions: [{ type: "speciesBelow", key: "koi", value: 0.9 }],
    effects: [{ type: "flag", value: "long-sleep" }, { type: "dread", delta: 2 }],
    quarter: "cistern",
    tone: "omen",
  },
  {
    id: "koi-return",
    headline: "The water clears",
    narrative: "The koi are back in the culverts, grazing in long slow lines. In the morning the wells smell of nothing at all.",
    conditions: [{ type: "flag", value: "koi-leaving" }, { type: "speciesAbove", key: "koi", value: 1.0 }],
    effects: [{ type: "removeFlag", value: "koi-leaving" }, { type: "dread", delta: -1 }],
    quarter: "cistern",
    tone: "grace",
  },

  // ── what this town was written with ──────────────────────────
  {
    id: "wards-stand",
    headline: "Iron in the ground",
    narrative: "This town has wardstones. Everything that drifts at dusk turns aside at the iron, as though it had walked into a wall nobody can see. People here sleep easy, and don't ask where the old ones go instead.",
    conditions: [{ type: "built", kind: "wardstone" }, { type: "night", value: 2 }],
    effects: [{ type: "dread", delta: -1 }],
    chains: [{ event: "ward-cost", delay: 3 }],
    tone: "plain",
  },
  {
    id: "ward-cost",
    queuedOnly: true,
    headline: "The stones keep more out",
    narrative: "Inside the ring of wardstones the water stands still and the gardens have gone quiet. No mites. No koi. Nothing comes to graze.",
    effects: [{ type: "dread", delta: 1 }, { type: "pop", mult: { koi: 0.85 } }],
    tone: "omen",
  },
  {
    id: "glow-press",
    headline: "Light by the jar",
    narrative: "Jars of pressed veil-light are sold in the market. They burn clean and blue and never smoke. Everyone wants one, and nobody asks what is pressed.",
    conditions: [{ type: "built", kind: "harvest" }, { type: "night", value: 2 }],
    tone: "plain",
  },
  {
    id: "new-moon",
    headline: "No moon",
    narrative: "The darkest night of the month. The lamplighters work in pairs, and the eels range wider than they have all month.",
    conditions: [{ type: "moonPhase", value: "new" }],
    effects: [{ type: "dread", delta: 1 }],
    tone: "omen",
  },

  // ── the Watcher, and being seen ──────────────────────────────
  {
    id: "watcher-lowers",
    headline: "The Watcher comes down",
    narrative: "For the first time anyone can remember, the haloed thing over the Old Tower circles low enough to see its eyes. It turns once over the street where you are staying, slowly, as if counting.",
    conditions: [{ type: "insightAbove", value: 4 }],
    effects: [{ type: "flag", value: "watcher-down" }],
    tone: "grace",
  },
  {
    id: "noticed",
    headline: "They have noticed you",
    narrative: "You can see so much of them now. Lights in the gutters, eyes in the culverts, a pale length in every alley. And every one of them turns, as you pass, to look back.",
    conditions: [{ type: "insightAbove", value: 6 }],
    effects: [{ type: "dread", delta: 2 }],
    tone: "omen",
  },

  // ── the moon ─────────────────────────────────────────────────
  {
    id: "omen-foreseen",
    headline: "The moon rises rust-coloured",
    narrative: "Tonight's moon came up over the wall with a brown edge to it, like a coin left in water. You can read it now as well as any shrine-keeper: tomorrow's full moon will rise red. Unless someone is found.",
    conditions: [{ type: "moonOmen" }, { type: "nightsToFull", value: 1 }, { type: "insightAbove", value: 3 }],
    effects: [{ type: "flag", value: "blood-omen" }, { type: "dread", delta: 1 }],
    priority: 2,
    tone: "omen",
  },
  {
    id: "omen-felt",
    headline: "The dogs won't settle",
    narrative: "Every dog in the town is awake and facing the Old Tower. The moon is almost full. Nobody can say what is wrong with it, only that something is.",
    conditions: [{ type: "moonOmen" }, { type: "nightsToFull", value: 1 }, { type: "NOT", condition: { type: "insightAbove", value: 3 } }],
    effects: [{ type: "flag", value: "blood-omen" }, { type: "dread", delta: 1 }],
    priority: 2,
    tone: "omen",
  },
  {
    id: "blood-moon",
    headline: "Blood moon",
    narrative: "The full moon rose the colour of rust. Every old one in the valley turned toward the Old Tower and went to it, over the wall, over the roofs, low enough to touch. Somewhere in the town, a door stands open that was closed.",
    conditions: [{ type: "bloodMoon" }],
    effects: [{ type: "flag", value: "blood-moon" }, { type: "dread", delta: 2 }],
    priority: 10,
    tone: "blood",
  },
  {
    id: "blood-kin",
    headline: "They come to the stones",
    narrative: "Where there are wayside stones, the old ones come down to them and wait, the way a guest waits at a door.",
    conditions: [{ type: "bloodMoon" }, { type: "stanceLeads", value: "kin" }],
    priority: 9,
    tone: "blood",
  },
  {
    id: "blood-ward",
    headline: "They press against the iron",
    narrative: "All night the old ones circle the wardstones, closer than they have ever come, and the stones ring like struck bells. By morning two of the iron bands have split.",
    conditions: [{ type: "bloodMoon" }, { type: "stanceLeads", value: "ward" }],
    priority: 9,
    tone: "blood",
  },
  {
    id: "blood-bind",
    headline: "They come for what was taken",
    narrative: "They go to the forges and the presses first. Nothing is broken. They hang over the furnaces in silence, as if counting, and do not leave until dawn.",
    conditions: [{ type: "bloodMoon" }, { type: "stanceLeads", value: "bind" }],
    priority: 9,
    tone: "blood",
  },
  {
    id: "blood-averted",
    headline: "The moon rises pale after all",
    narrative: "Everyone was watching the wall at moonrise. It came up white. Somebody laughed, and then a lot of people did, and the mites came up off the water as if nothing had ever been wrong.",
    conditions: [{ type: "moonPhase", value: "full" }, { type: "flag", value: "blood-omen" }, { type: "NOT", condition: { type: "bloodMoon" } }],
    effects: [{ type: "dread", delta: -2 }],
    priority: 10,
    tone: "grace",
  },
  {
    id: "moon-viewing",
    headline: "Moon-viewing",
    narrative: "The full moon comes up clear and white. Families carry stools onto the flat roofs to watch it, and the old ones rise toward it in slow spirals: mites, then moths, then, very high, the Watcher.",
    conditions: [{ type: "moonPhase", value: "full" }, { type: "NOT", condition: { type: "bloodMoon" } }, { type: "notFlag", value: "blood-omen" }],
    effects: [{ type: "dread", delta: -1 }],
    priority: 10,
    tone: "grace",
  },

  // ── the larger mystery ───────────────────────────────────────
  {
    id: "drowned-bell",
    headline: "A bell in the Drowned Quarter",
    narrative: "Just after midnight a bell rings in the Drowned Quarter, where there have been no bells since the flood. You count the strokes. It rings the number of times you have come to this town.",
    conditions: [{ type: "loopAbove", value: 2 }, { type: "nightAfter", value: 3 }],
    effects: [{ type: "flag", value: "drowned-bell" }],
    quarter: "drowned",
    tone: "omen",
  },
];
