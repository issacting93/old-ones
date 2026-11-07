// content/ecology-rules.js — how the old ones respond to the town, night by night.
//
// The ecology sim handles movement, schooling and hunting in real time. These rules handle the
// slower story: who goes hungry when their food thins out, and where the hungry go looking.
// They run once at the end of every night, after the buildings' own effects.

export const HUNGER = {
  // A species whose prey has fallen below this share of its usual numbers goes hungry.
  threshold: 0.6,
  // A hungry species loses this share of its own numbers each night it stays hungry.
  decline: 0.8,
  // Recovery per night once food comes back (moves the multiplier back toward 1).
  recovery: 0.15,
};

// Who each old one eats, for the hunger rule. This mirrors the sim's own food web for the
// species in content/old-ones.js; the Watcher eats nothing anyone has seen.
export const DIET = {
  koi: ["wisp"],
  swift: ["wisp"],
  jelly: ["wisp", "swift", "moth"],
  eel: ["wisp"],
};

// When an apex is hungry it comes inside the wall: it is drawn toward the quarter where the
// town is busiest (most buildings), and an event can name it there.
export const HUNGRY_INTRUDERS = ["eel", "jelly"];
