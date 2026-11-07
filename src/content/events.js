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
    narrative: "The bells ring the hour. Over the Lantern Quarter the first mites lift off the still water and drift toward the shrines, and the koi rise behind them. The council meets at the end of the week. It expects a plan for how the town will grow.",
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
