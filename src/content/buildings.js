// content/buildings.js — what the council can decide to build, and what each choice does to the
// old ones.
//
// A building is pinned into one cell of the town before the city generator re-solves, so the
// streets around it regrow to fit. Then it changes the ecology in three ways:
//   pop      multiplies a species' share of the population, town-wide (1 = unchanged)
//   draws    species the building pulls into orbit around it (a local vortex in the sim)
//   wards    radius of a ward: every old one inside is pushed back out
// and it moves the town's stance toward the old ones (`stance`: kin, ward, bind — see
// content/stance.js).
//
// `zones` lists which rings it can stand in. `coin` is the cost to build; `income` is coin
// earned every night after.

export const BUILDINGS = [
  {
    id: "shrine",
    name: "Wayside shrine",
    zones: ["housing", "garden"],
    coin: 2, income: 0,
    color: "#d8b46a",
    pop: { wisp: 1.4, moth: 1.1 },
    draws: ["wisp", "koi", "halo-eyed-seraph"],
    stance: { kin: 2 },
    lens: { SHRINE: 1 },
    blurb: "A roofed stone with a lamp of rendered fat. The old way of saying: you are welcome here.",
  },
  {
    id: "cistern",
    name: "Deep cistern",
    zones: ["housing"],
    coin: 3, income: 0,
    color: "#5e9fb8",
    pop: { koi: 1.35, jelly: 1.15 },
    draws: ["koi", "jelly"],
    stance: { kin: 1 },
    lens: { SURVEY: 1 },
    blurb: "Clean water for a growing town. The koi follow water wherever it is stored.",
  },
  {
    id: "lamphouse",
    name: "Lamphouse",
    zones: ["housing", "garden"],
    coin: 2, income: 1,
    color: "#e6a04a",
    pop: { moth: 1.8, swift: 1.15 },
    draws: ["moth", "swift"],
    stance: { bind: 1 },
    lens: { LEDGER: 1 },
    blurb: "Oil lamps on every corner and a toll for lighting them. The streets are safer. The moths come in clouds.",
  },
  {
    id: "foundry",
    name: "Foundry",
    zones: ["housing"],
    coin: 1, income: 3,
    color: "#b5533c",
    pop: { wisp: 0.45, koi: 0.85 },
    draws: [],
    stance: { bind: 2 },
    lens: { SURVEY: 1 },
    blurb: "More furnaces, more coin, more work. The smoke settles on still water.",
  },
  {
    id: "wardstone",
    name: "Wardstone ring",
    zones: ["housing", "garden"],
    coin: 3, income: 0,
    color: "#8c8f99",
    pop: {},
    draws: [],
    wards: 260,
    stance: { ward: 3 },
    lens: { PHYSIC: 1 },
    blurb: "Iron-banded standing stones. Nothing the stones are set against will cross them. Nobody is sure what else they keep out.",
  },
  {
    id: "harvest",
    name: "Glow-press",
    zones: ["garden"],
    coin: 2, income: 2,
    color: "#9b7fc4",
    pop: { jelly: 0.5, wisp: 0.85 },
    draws: ["jelly"],
    stance: { bind: 3 },
    lens: { LEDGER: 1 },
    blurb: "Veil-drifters are drawn in with lamps and pressed for their light. It burns cleaner than oil and sells for more.",
  },
];

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

// Raising a lens instead of building: the council funds a way of paying attention.
export const FUND_LENS_COST = 2;
