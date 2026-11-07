// content/events.js — what happens at dusk.
//
// Every night begins by checking these. Each event: { id, headline, narrative, conditions,
// effects, priority?, pool?, chains?: [{ event, delay }], queuedOnly?, repeatable?, quarter?,
// tone? }. Conditions and effects are the language in core/rules.js — so the old ones can start
// an event (speciesBelow, inQuarter, hungry, intruding) and an event can change them back (pop).
// `queuedOnly` events never fire on their own; another event chains them in.

export const EVENTS = [
  {
    id: "first-dusk",
    headline: "The first dusk",
    narrative: "There is no moon tonight. The bells ring the hour, and over the Lantern Quarter the first mites lift off the still water and drift toward the shrines, and the koi rise behind them. The council expects a plan for how the town will grow before the moon is full.",
    conditions: [{ type: "night", value: 1 }],
    tone: "plain",
  },

  // ── the mites ────────────────────────────────────────────────
  {
    id: "mites-thinning",
    headline: "The lamps burn alone",
    narrative: "At dusk the wayside lamps are lit and almost nothing comes. A few mites, low over the water, and then not even those.",
    conditions: [{ type: "speciesBelow", key: "wisp", value: 0.6 }],
    effects: [{ type: "flag", value: "mites-thinning" }, { type: "dread", delta: 1 }, { type: "hope", delta: -1 }],
    quarter: "lantern",
    tone: "omen",
  },
  {
    id: "mites-thick",
    headline: "The mites come thick",
    narrative: "Children follow the mites through the lanes with jars and let them go again at the stones, the way their grandparents did.",
    conditions: [{ type: "speciesAbove", key: "wisp", value: 1.2 }, { type: "built", kind: "shrine" }],
    effects: [{ type: "hope", delta: 2 }],
    quarter: "lantern",
    tone: "grace",
  },

  // ── the eels ─────────────────────────────────────────────────
  {
    id: "eel-inside",
    headline: "Something long and pale",
    narrative: "A Pale Eel came in over the Cinder heaps last night, low enough to touch the chimneys. By morning everyone in the quarter had a story about it.",
    conditions: [{ type: "intruding", key: "eel" }],
    effects: [{ type: "flag", value: "eel-inside" }, { type: "dread", delta: 2 }],
    quarter: "cinder",
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
    effects: [{ type: "flag", value: "long-sleep" }, { type: "dread", delta: 2 }, { type: "hope", delta: -1 }],
    quarter: "cistern",
    tone: "omen",
  },
  {
    id: "koi-return",
    headline: "The water clears",
    narrative: "The koi are back in the culverts, grazing in long slow lines. In the morning the wells smell of nothing at all.",
    conditions: [{ type: "flag", value: "koi-leaving" }, { type: "speciesAbove", key: "koi", value: 1.0 }],
    effects: [{ type: "removeFlag", value: "koi-leaving" }, { type: "hope", delta: 2 }, { type: "dread", delta: -1 }],
    quarter: "cistern",
    tone: "grace",
  },

  // ── what the town builds ─────────────────────────────────────
  {
    id: "wards-raised",
    headline: "Iron in the ground",
    narrative: "The wardstones go up. Everything that drifts at dusk turns aside at the iron, as though it had walked into a wall nobody can see. People sleep easier. For now.",
    conditions: [{ type: "built", kind: "wardstone" }],
    effects: [{ type: "dread", delta: -2 }],
    chains: [{ event: "ward-cost", delay: 2 }],
    tone: "plain",
  },
  {
    id: "ward-cost",
    queuedOnly: true,
    headline: "The stones keep more out",
    narrative: "Inside the ring of wardstones the water stands still and the gardens have gone quiet. No mites. No koi. Nothing at all comes to graze.",
    effects: [{ type: "dread", delta: 1 }, { type: "pop", mult: { koi: 0.85 } }],
    tone: "omen",
  },
  {
    id: "glow-press",
    headline: "Light by the jar",
    narrative: "The first jars of pressed veil-light are sold in the market. They burn clean and blue and never smoke. Everyone wants one.",
    conditions: [{ type: "built", kind: "harvest" }],
    effects: [{ type: "hope", delta: 1 }, { type: "coin", delta: 2 }],
    tone: "plain",
  },

  {
    id: "cold-furnaces",
    headline: "Cold furnaces",
    narrative: "Corwin has laid off a third of the Cinder Quarter. Men stand at the market cross with their hands in their pockets and watch the mites drift past.",
    conditions: [{ type: "nightAfter", value: 2 }, { type: "stanceShare", pull: "kin", value: 0.55 }, { type: "notBuilt", kind: "foundry" }],
    effects: [{ type: "flag", value: "cold-furnaces" }, { type: "hope", delta: -2 }, { type: "dread", delta: 1 }],
    quarter: "cinder",
    tone: "omen",
  },

  // ── the Watcher ──────────────────────────────────────────────
  {
    id: "watcher-lowers",
    headline: "The Watcher comes down",
    narrative: "For the first time anyone can remember, the haloed thing over the Old Tower circles low enough to see its eyes. It turns once over each of the shrines, slowly, as if counting them.",
    conditions: [{ type: "nightAfter", value: 2 }, { type: "stanceShare", pull: "kin", value: 0.45 }],
    effects: [{ type: "hope", delta: 1 }, { type: "clue", id: "watcher-counts", text: "The Watcher came down and circled each shrine, as if counting them." }],
    tone: "grace",
  },
  {
    id: "watcher-withdraws",
    headline: "The Watcher climbs",
    narrative: "The Watcher has gone up out of sight above the Old Tower. You only know it is still there because the bell-swifts won't fly near the top.",
    conditions: [{ type: "nightAfter", value: 2 }, { type: "OR", conditions: [{ type: "stanceShare", pull: "bind", value: 0.45 }, { type: "stanceShare", pull: "ward", value: 0.45 }] }],
    effects: [{ type: "dread", delta: 1 }, { type: "clue", id: "watcher-climbs", text: "The Watcher withdrew upward when the town turned against the old ones." }],
    tone: "omen",
  },

  // ── the moon ─────────────────────────────────────────────────
  // The eve of the full moon: if the town has strained things (content/moon.js, MOON.blood.when),
  // there is an omen. A Shrine-keeper can read it plainly; everyone else just feels it.
  {
    id: "omen-foreseen",
    headline: "The moon rises rust-coloured",
    narrative: "Tonight's moon came up over the wall with a brown edge to it, like a coin left in water. The shrine-keepers say tomorrow's full moon will rise red, and they do not say it lightly.",
    conditions: [{ type: "moonOmen" }, { type: "nightsToFull", value: 1 }, { type: "lens", lens: "SHRINE", min: 2 }],
    effects: [{ type: "flag", value: "blood-omen" }, { type: "dread", delta: 1 }],
    priority: 2,
    tone: "omen",
  },
  {
    id: "omen-felt",
    headline: "The dogs won't settle",
    narrative: "Every dog in the town is awake and facing the Old Tower. The moon is almost full. Nobody can say what is wrong with it, only that something is.",
    conditions: [{ type: "moonOmen" }, { type: "nightsToFull", value: 1 }, { type: "NOT", condition: { type: "lens", lens: "SHRINE", min: 2 } }],
    effects: [{ type: "flag", value: "blood-omen" }, { type: "dread", delta: 1 }],
    priority: 2,
    tone: "omen",
  },
  {
    id: "blood-moon",
    headline: "Blood moon",
    narrative: "The full moon rose the colour of rust. Every old one in the valley turned toward the Old Tower and went to it — over the wall, over the roofs, low enough to touch. The iron in the wardstones hums and does not hold the way it did.",
    conditions: [{ type: "bloodMoon" }],
    effects: [{ type: "flag", value: "blood-moon" }, { type: "dread", delta: 2 }],
    chains: [{ event: "blood-morning", delay: 1 }],
    priority: 10,
    tone: "blood",
  },
  {
    id: "blood-kin",
    headline: "They come to the stones",
    narrative: "Where there are wayside stones, the old ones come down to them and wait, the way a guest waits at a door. People who kept a lamp lit stand in their doorways and watch, and are not touched.",
    conditions: [{ type: "bloodMoon" }, { type: "stanceLeads", value: "kin" }],
    effects: [{ type: "hope", delta: 1 }, { type: "clue", id: "blood-guests", text: "Under the blood moon the old ones came to the shrines and waited, like guests at a door." }],
    priority: 9,
    tone: "blood",
  },
  {
    id: "blood-ward",
    headline: "They press against the iron",
    narrative: "All night the old ones circle the wardstones, closer than they have ever come, and the stones ring like struck bells. By morning two of the iron bands have split.",
    conditions: [{ type: "bloodMoon" }, { type: "stanceLeads", value: "ward" }],
    effects: [{ type: "dread", delta: 1 }, { type: "clue", id: "blood-iron", text: "Under the blood moon the old ones pressed against the wardstones all night. Two iron bands split." }],
    priority: 9,
    tone: "blood",
  },
  {
    id: "blood-bind",
    headline: "They come for what we took",
    narrative: "They go to the forges and the presses first. Nothing is broken. They hang over the furnaces and the jars of pressed light in silence, as if counting, and do not leave until dawn.",
    conditions: [{ type: "bloodMoon" }, { type: "stanceLeads", value: "bind" }],
    effects: [{ type: "dread", delta: 2 }, { type: "clue", id: "blood-count", text: "Under the blood moon the old ones hung over the forges and presses all night, as if counting what was taken." }],
    priority: 9,
    tone: "blood",
  },
  {
    id: "blood-averted",
    headline: "The moon rises pale after all",
    narrative: "Everyone was watching the wall at moonrise. It came up white. Somebody laughed, and then a lot of people did, and the mites came up off the water as if nothing had ever been wrong.",
    conditions: [{ type: "moonPhase", value: "full" }, { type: "flag", value: "blood-omen" }, { type: "NOT", condition: { type: "bloodMoon" } }],
    effects: [{ type: "hope", delta: 2 }, { type: "dread", delta: -2 }, { type: "clue", id: "blood-averted", text: "A blood moon was foretold and did not come. Whatever the town changed the night before was enough." }],
    priority: 10,
    tone: "grace",
  },
  {
    id: "moon-viewing",
    headline: "Moon-viewing",
    narrative: "The full moon comes up clear and white. Families carry stools onto the flat roofs to watch it, the way their grandparents did, and the old ones rise toward it in slow spirals — mites, then moths, then, very high, the Watcher.",
    conditions: [{ type: "moonPhase", value: "full" }, { type: "NOT", condition: { type: "bloodMoon" } }, { type: "notFlag", value: "blood-omen" }],
    effects: [{ type: "hope", delta: 2 }, { type: "clue", id: "moon-rise", text: "At the full moon the old ones rise toward it in order: mites, then moths, then the Watcher." }],
    priority: 10,
    tone: "grace",
  },
  {
    id: "blood-morning",
    queuedOnly: true,
    headline: "The morning after",
    narrative: "By dawn they have all gone back to the water. The town counts what it has and finds nothing missing. It is the counting that frightens people: everyone can feel they were counted too.",
    effects: [{ type: "clue", id: "blood-morning", text: "After the blood moon nothing was missing. Everyone felt counted." }],
    tone: "omen",
  },

  // ── a thread for the next slice ──────────────────────────────
  {
    id: "drowned-bell",
    headline: "A bell in the Drowned Quarter",
    narrative: "Just after midnight a bell rings in the Drowned Quarter, where there have been no bells for eleven years. Nobody goes to look.",
    conditions: [{ type: "nightAfter", value: 3 }, { type: "OR", conditions: [{ type: "clue", value: "drowned-koi" }, { type: "clueCount", value: 6 }] }],
    effects: [{ type: "flag", value: "drowned-bell" }],
    quarter: "drowned",
    tone: "omen",
  },
];
