// content/moon.js — the lunar cycle, and the blood moon.
//
// Every night is one lunar day, and one loop is one lunar month: eight nights, one per phase.
// A loop starts the morning after a full moon (waning gibbous) and ends at the next full moon,
// night 8, when the town resets. So the trail goes cold as the moon wanes, the new moon (night 4)
// is the darkest and most dangerous night, and the reckoning builds as it waxes.
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
// A blood moon takes someone, and they are the next loop's missing person.

export const MOON = {
  cycle: 8,
  startPhase: 5, // index into PHASES for night 1 (5 = waning gibbous, so night 8 is full)

  blood: {
    // any one of these at dusk makes the coming full moon a blood moon
    when: [
      { type: "dreadAbove", value: 5 },
      { type: "hungry", key: "eel" },
      { type: "hungry", key: "koi", nights: 2 },
      { type: "stanceShare", pull: "bind", value: 0.45 },
      { type: "stanceShare", pull: "ward", value: 0.45 },
      { type: "insightAbove", value: 6 }, // they have noticed you
    ],
    // ...unless one of these holds: finding the missing person alive before the full moon
    unless: [{ type: "flag", value: "found" }],
    // with this much Insight you can read a coming blood moon in the sky a night early
    foreseenAt: 3,
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
