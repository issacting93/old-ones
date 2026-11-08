// content/places.js — places you can search.
//
// Searching a place shows what stands there tonight, which old ones are near, a sigil word
// carved there (one per search, from `words`), and any evidence the case left there. A case can
// also add places of its own (content/cases.js `places`), which only appear once someone tells
// you about them.
//
// `quarter` decides which creature readings the search reports ("centre" = around the Old Tower,
// null = the whole town).

export const PLACES = [
  { id: "tower", name: "The Old Tower", quarter: "centre", words: ["tower", "sleep"],
    blurb: "Older than the wall. Its lowest door has no handle, and its stones are worn smooth at hand height." },
  { id: "shrines", name: "The wayside shrines", quarter: "lantern", words: ["light", "kin"],
    blurb: "Roofed stones with fat-lamps, one at the head of every old lane." },
  { id: "forges", name: "The forges", quarter: "cinder", words: ["fire", "iron"],
    blurb: "Furnaces, slag heaps, and the long sheds where the town's coin is made." },
  { id: "cisterns", name: "The cisterns", quarter: "cistern", words: ["water", "sleep"],
    blurb: "Domed cisterns and the culverts that feed them." },
  { id: "drowned", name: "The drowned streets", quarter: "drowned", words: ["water", "hunger"],
    blurb: "Shuttered since the flood. Nobody will say which flood." },
  { id: "groves", name: "The groves", quarter: null, words: ["take", "open"],
    blurb: "Old pear trees between the houses and the wall." },
  { id: "wall", name: "The wall", quarter: null, words: ["iron", "open"],
    blurb: "Black stone, four gates, and the oldest carvings in town on the inside face." },
];

export const PLACE_BY_ID = Object.fromEntries(PLACES.map((p) => [p.id, p]));
