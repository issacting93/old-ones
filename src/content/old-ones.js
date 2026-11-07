// content/old-ones.js — the old ones: the creatures that lived here before the town.
//
// Each entry names a Cybernetic Ecology species (`key`, the sim's id) and gives it the town's
// own name for it. The townsfolk revere them rather than worship them: they are neighbours that
// were here first, not gods. Their behaviour (who eats whom, how they move) comes from the
// ecology sim untouched; this file only says what the town calls them and what they mean to it.
//
// Changing this list? Re-run `npm run species` so the slim species file matches.

export const OLD_ONES = [
  {
    key: "wisp",
    name: "Lantern-mites",
    short: "mites",
    blurb: "Specks of drifting light that gather at dusk over shrines and still water. Everything else feeds on them.",
    role: "base",
  },
  {
    key: "swift",
    name: "Bell-swifts",
    short: "swifts",
    blurb: "They wheel over the rooftops in a single body whenever the bells ring.",
    role: "grazer",
  },
  {
    key: "koi",
    name: "Well-koi",
    short: "koi",
    blurb: "Slow, sigil-marked, always near the cisterns. The old wives say the water stays sweet while they stay.",
    role: "grazer",
  },
  {
    key: "moth",
    name: "Wick-moths",
    short: "moths",
    blurb: "Drawn to any flame. Nobody minds them except the lamplighters.",
    role: "drifter",
  },
  {
    key: "jelly",
    name: "Veil-drifters",
    short: "veils",
    blurb: "Translucent bells that hang over the gardens and catch whatever drifts into them.",
    role: "hunter",
  },
  {
    key: "eel",
    name: "the Pale Eels",
    short: "eels",
    blurb: "Long, white-blue, solitary. Rarely seen inside the wall — unless they are hungry.",
    role: "apex",
  },
  {
    key: "halo-eyed-seraph",
    name: "the Watcher",
    short: "watcher",
    blurb: "A haloed thing that circles the old tower. It has never been seen to eat.",
    role: "elder",
  },
];

export const OLD_ONE_BY_KEY = Object.fromEntries(OLD_ONES.map((o) => [o.key, o]));
