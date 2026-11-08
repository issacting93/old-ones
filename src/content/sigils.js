// content/sigils.js — the old ones' language.
//
// Each word is a circular logogram (drawn by tools/build-sigils.mjs with Sigil Forge into
// sigil-glyphs.js). You learn a word by seeing it used: carved at a place, shown by a person, or
// traced by the Watcher. The first time, you only guess its meaning, and a guess can be wrong
// (`decoy` is what it is most often mistaken for). Seeing it again somewhere new settles it.
//
// At the full moon you write a sentence of words you know, and the next town regrows from it.
// A word always does what it TRULY means, whatever you thought it meant. Each word's `rule`:
//   pins     buildings the new town is built with: [{ kind, count }] (content/buildings.js)
//   remove   building kinds the word forbids
//   weights  multipliers on the city generator's tile weights (content/town.js TILE_DEFS ids)
//   pop      multipliers on the old ones' numbers
//   gather   species the Old Tower draws in all month
//   stance   pushes on the town's stance (content/stance.js)
//   dread    added to the town's starting dread

export const WORDS = [
  {
    id: "water", meaning: "still water", decoy: "sleep",
    rule: { pins: [{ kind: "cistern", count: 1 }], weights: { qanat: 3, "ab-anbar": 3, "pool-garden": 3, fountain: 2, "garden-canal": 2 }, pop: { koi: 1.3 }, stance: { kin: 1 } },
    writes: "more water in the town, and koi to keep it sweet",
  },
  {
    id: "light", meaning: "lamplight", decoy: "fire",
    rule: { pins: [{ kind: "shrine", count: 2 }], weights: { pavilion: 3, masjid: 2 }, pop: { wisp: 1.3, moth: 1.15 }, stance: { kin: 1 } },
    writes: "wayside shrines, and mites thick at dusk",
  },
  {
    id: "fire", meaning: "the forge", decoy: "light",
    rule: { pins: [{ kind: "foundry", count: 2 }, { kind: "lamphouse", count: 1 }], weights: { madrasa: 1.5 }, pop: {}, stance: { bind: 2 } },
    writes: "forges and lamphouses, coin and smoke",
  },
  {
    id: "iron", meaning: "iron", decoy: "tower",
    rule: { pins: [{ kind: "wardstone", count: 1 }], weights: { tower: 2.5 }, pop: {}, stance: { ward: 2 } },
    writes: "wardstones, and the old ones kept back",
  },
  {
    id: "hunger", meaning: "hunger", decoy: "take",
    rule: { pop: { eel: 1.35, jelly: 1.2 }, stance: {}, dread: 1 },
    writes: "more eels and veils, and hungrier",
  },
  {
    id: "tower", meaning: "the tower", decoy: "iron",
    rule: { weights: { minaret: 3, "bayt-al-hikma": 2 }, pop: { "halo-eyed-seraph": 1.6 }, gather: ["halo-eyed-seraph", "wisp"], stance: { kin: 1 } },
    writes: "bell towers, and the Watcher close over the Old Tower",
  },
  {
    id: "take", meaning: "to take and hold", decoy: "hunger",
    rule: { pins: [{ kind: "harvest", count: 1 }], pop: {}, stance: { bind: 2 } },
    writes: "a glow-press in the groves",
  },
  {
    id: "sleep", meaning: "sleep", decoy: "water",
    rule: { pop: { koi: 0.8 }, stance: {}, dread: -1 },
    writes: "a quieter town, fewer koi, and more sleepers",
  },
  {
    id: "kin", meaning: "guest, neighbour", decoy: "open",
    rule: { pins: [{ kind: "shrine", count: 1 }], remove: ["wardstone"], stance: { kin: 2 } },
    writes: "a shrine, and no wardstones",
  },
  {
    id: "open", meaning: "open", decoy: "kin",
    rule: { remove: ["wardstone"], weights: { cross: 2, "t-out": 1.5 }, pop: { wisp: 1.1, swift: 1.2 }, stance: { kin: 1 } },
    writes: "open streets and no wardstones",
  },
];

export const WORD_BY_ID = Object.fromEntries(WORDS.map((w) => [w.id, w]));

// How many words a sentence may hold: two to start, one more for every three words you are sure of.
export function sentenceSlots(lexicon) {
  const sure = Object.values(lexicon || {}).filter((e) => e.sure).length;
  return Math.min(5, 2 + Math.floor(sure / 3));
}

// The sentence the first town grew from, long before you: the old courtesies, worn down, and
// the forges the town added since.
export const FIRST_SENTENCE = ["light", "water", "fire", "fire"];

// Turn a sentence into the rules the next town is generated from. Repeated words stack.
export function compileSentence(words, loop) {
  const out = { pins: {}, remove: new Set(), weights: {}, pop: {}, gather: new Set(), stance: { kin: 0, ward: 0, bind: 0 }, dread: 0 };
  for (const id of words) {
    const r = WORD_BY_ID[id]?.rule;
    if (!r) continue;
    for (const p of r.pins || []) out.pins[p.kind] = (out.pins[p.kind] || 0) + p.count;
    for (const k of r.remove || []) out.remove.add(k);
    for (const [k, v] of Object.entries(r.weights || {})) out.weights[k] = (out.weights[k] ?? 1) * v;
    for (const [k, v] of Object.entries(r.pop || {})) out.pop[k] = (out.pop[k] ?? 1) * v;
    for (const k of r.gather || []) out.gather.add(k);
    for (const [k, v] of Object.entries(r.stance || {})) out.stance[k] += v;
    out.dread += r.dread || 0;
  }
  for (const k of out.remove) delete out.pins[k];
  let h = 2166136261 ^ loop;
  for (const ch of words.join(" ")) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return { ...out, remove: [...out.remove], gather: [...out.gather], seed: (h >>> 0) % 100000 };
}
