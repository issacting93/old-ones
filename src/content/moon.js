// content/moon.js — the lunar cycle, and the blood moon.
//
// Every night is one lunar day. The cycle is compressed to eight lunar days (one per phase) so
// a whole month fits in a handful of nights. `MOON.startPhase` is the phase of night 1; starting
// at the new moon puts the full moon on night 5, with night 6 as the morning after.
//
// Each phase changes the old ones a little:
//   pop     multiplies a species' share while that phase lasts (like a building's pop)
//   gather  species drawn toward the Old Tower on that night (the tower wakes first)
//   light   how bright the night is, 0..1 (drives the map's tint)
//
// The blood moon: a full moon rises red when the town has strained its relationship with the
// old ones. `MOON.blood.when` is a list of conditions (core/rules.js), any one of which is
// enough, and `unless` can call it off. It is read at dusk the night before the full moon (so
// it can be foreseen) and decided at the full moon's own dusk (so it can still be averted).

export const MOON = {
  cycle: 8,
  startPhase: 0, // index into PHASES for night 1 (0 = new moon)

  blood: {
    // any one of these at dusk makes the coming full moon a blood moon
    when: [
      { type: "dreadAbove", value: 5 },
      { type: "hungry", key: "eel" },
      { type: "hungry", key: "koi", nights: 2 },
      { type: "stanceShare", pull: "bind", value: 0.45 },
      { type: "stanceShare", pull: "ward", value: 0.45 },
    ],
    // ...unless one of these holds: keeping the old courtesies on the eve turns it pale again
    unless: [{ type: "flag", value: "courtesies-kept" }],
    // a Shrine-keeping lens this high can read it in the sky a night early
    foreseenAt: 2,
    pop: { eel: 1.6, jelly: 1.4, wisp: 0.8 },
    gather: ["wisp", "swift", "koi", "moth", "jelly", "eel", "halo-eyed-seraph"],
    wardStrength: 0.5, // iron holds half as far under a red moon
  },
};

export const PHASES = [
  { day: 0, id: "new", name: "New moon", light: 0.05, pop: { eel: 1.15 }, gather: [],
    line: "No moon. The eels range wider in the dark." },
  { day: 1, id: "waxing-crescent", name: "Waxing crescent", light: 0.25, pop: {}, gather: [],
    line: "A paring of light over the wall." },
  { day: 2, id: "first-quarter", name: "First quarter", light: 0.45, pop: { swift: 1.1 }, gather: [],
    line: "Half a moon. The swifts fly late." },
  { day: 3, id: "waxing-gibbous", name: "Waxing gibbous", light: 0.65, pop: { wisp: 1.1 }, gather: ["halo-eyed-seraph"],
    line: "The moon fattens. The Watcher keeps closer to the tower." },
  { day: 4, id: "full", name: "Full moon", light: 1.0, pop: { wisp: 1.25, moth: 1.2 }, gather: ["wisp", "moth", "halo-eyed-seraph"],
    line: "Full. Everything that glows rises toward it." },
  { day: 5, id: "waning-gibbous", name: "Waning gibbous", light: 0.7, pop: {}, gather: [],
    line: "The moon thins from the other side." },
  { day: 6, id: "last-quarter", name: "Last quarter", light: 0.45, pop: { koi: 1.05 }, gather: [],
    line: "Half again. The koi graze slow and deep." },
  { day: 7, id: "waning-crescent", name: "Waning crescent", light: 0.2, pop: {}, gather: [],
    line: "A last sliver before the dark." },
];

// Lunar day (1..cycle) and phase for a night.
export function lunarDay(night) {
  return ((MOON.startPhase + night - 1) % MOON.cycle) + 1;
}
export function phaseFor(night) {
  return PHASES[(MOON.startPhase + night - 1) % MOON.cycle];
}
// nights from `night` until the next full moon (0 = tonight)
export function nightsToFull(night) {
  for (let k = 0; k < MOON.cycle; k++) if (phaseFor(night + k).id === "full") return k;
  return -1;
}
export const BLOOD_PHASE = {
  id: "blood", name: "Blood moon", light: 0.85,
  line: "The full moon rose the colour of rust. Every old one in the valley turned toward the tower.",
};
