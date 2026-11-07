// content/town.js — the town itself: its name, its quarters, the ways it pays attention, and the
// tile grammar the city generator grows it from.
//
// The grammar reuses the radial solver from interactions_library (shared/city/city-wfc.js) but
// replaces its desert round-city pieces with the town's own. Zone keys (core, sanctum, bazaar,
// housing, garden, wall) are the solver's ring names and must stay as they are; `ZONE_NAMES`
// gives each ring its name in this town.

export const TOWN = {
  name: "Vesper",
  epithet: "a walled town on the old ones' water",
  nights: 6, // length of this slice
  visitsPerNight: 2,
  startingCoin: 6,
  tithe: 1,        // coin the town pays in every night, whatever is built
  hopefulTithe: 1, // extra coin on nights when hope is at least `hopefulAt`
  hopefulAt: 6,
};

// The four quarters are the wedges between the four avenues (the solver keeps an avenue
// running from every gate to the centre). `from`/`to` are angles in degrees, measured the
// same way the solver measures its cells (0° = east, increasing clockwise on screen).
export const QUARTERS = [
  { id: "lantern", name: "Lantern Quarter", from: 0, to: 90,
    blurb: "Shrines, washing lines and the oldest houses. The mites gather here at dusk." },
  { id: "cinder", name: "Cinder Quarter", from: 90, to: 180,
    blurb: "Forges and slag heaps. Most of the town's coin is made here." },
  { id: "cistern", name: "Cistern Quarter", from: 180, to: 270,
    blurb: "Wells, cisterns and the physic house. The koi keep to these streets." },
  { id: "drowned", name: "Drowned Quarter", from: 270, to: 360,
    blurb: "Shuttered since the flood. Nobody will say which flood." },
];

// Lenses are Mandate's departments, turned into the town's ways of paying attention. A lens's
// level decides which interjections you hear in conversation and how well your checks roll.
export const LENSES = {
  SHRINE: { name: "Shrine-keeping", color: "#c9a96e", blurb: "Rites, omens, what the old ones are owed." },
  SURVEY: { name: "Survey", color: "#7fa6b8", blurb: "Stone, water, slope — what the land will bear." },
  PHYSIC: { name: "Physic", color: "#b07a8c", blurb: "Bodies, sleep, sickness." },
  LEDGER: { name: "Ledger", color: "#9a9a7a", blurb: "Records, debts, who said what and when." },
};
export const STARTING_LENSES = { SHRINE: 1, SURVEY: 1, PHYSIC: 1, LEDGER: 0 };

export const ZONE_NAMES = {
  core: "The Old Tower",
  sanctum: "Cloister ring",
  bazaar: "Market ring",
  housing: "The tiers",
  garden: "Groves",
  wall: "The wall",
};

// Tile grammar, in city-wfc.js's own shape:
//   [id, name, zone, [in, out, cw, ccw], weight, mirror?, note]
// Socket letters keep the solver's meanings: p plaza, S street, M market arcade, b closed wall,
// c water channel, g grove edge, w wall, X outside. Ids the solver depends on stay the same:
// 'gate' (only at the four gates) and 'belvedere' (a reserved court, never chosen on its own).
export const TILE_DEFS = [
  ["core", "The Old Tower", "core", ["X", "p", "X", "X"], 1, false, "The tower the town grew around. Older than the wall."],

  ["iwan", "Cloister gate", "sanctum", ["p", "S", "p", "p"], 2, false, "Vaulted passage from the close onto an avenue."],
  ["fountain", "Well-head", "sanctum", ["p", "b", "p", "p"], 1.4, false, "A stone well-head in the close."],
  ["minaret", "Bell tower", "sanctum", ["p", "b", "p", "p"], 0.9, false, "Rings the hours, and the dusk."],
  ["bayt-al-hikma", "The Archive", "sanctum", ["p", "b", "p", "p"], 0.5, false, "Where the town keeps its ledgers and its silences."],

  ["avenue", "Avenue", "bazaar", ["S", "S", "b", "b"], 3, false, "Radial street of stalls."],
  ["chaharsu", "Market cross", "bazaar", ["S", "S", "M", "M"], 2, false, "Where an avenue meets the covered market."],
  ["chaharsu-t", "Market cross, inner end", "bazaar", ["S", "b", "M", "M"], 1, false, "An avenue ends at the market."],
  ["chaharsu-o", "Market cross, outer start", "bazaar", ["b", "S", "M", "M"], 1, false, "An avenue leaves the market outward."],
  ["arcade", "Covered market", "bazaar", ["b", "b", "M", "M"], 4, false, "Vaulted market street around the ring."],
  ["arcade-end", "Market end", "bazaar", ["b", "b", "M", "b"], 1.2, true, "The market ends at a shop."],
  ["caravanserai", "Coaching inn", "bazaar", ["b", "b", "b", "b"], 1.6, false, "Courtyard inn for carters."],
  ["madrasa", "Guild hall", "bazaar", ["S", "b", "b", "b"], 0.9, false, "Hall at the end of a street."],

  ["avenue-h", "Avenue", "housing", ["S", "S", "b", "b"], 3, false, "Radial street between houses."],
  ["lane", "Ring lane", "housing", ["b", "b", "S", "S"], 2, false, "Lane running round the tier."],
  ["cross", "Crossroads", "housing", ["S", "S", "S", "S"], 0.8, false, "Avenue meets ring lane."],
  ["t-in", "Junction", "housing", ["S", "b", "S", "S"], 1, false, "Avenue meets a lane and stops."],
  ["t-out", "Junction", "housing", ["b", "S", "S", "S"], 1, false, "Avenue leaves a lane outward."],
  ["t-side", "Junction", "housing", ["S", "S", "S", "b"], 1, true, "Lane branches off the avenue."],
  ["bend-in", "Bend", "housing", ["S", "b", "S", "b"], 0.9, true, "Avenue turns into a lane."],
  ["bend-out", "Bend", "housing", ["b", "S", "S", "b"], 0.9, true, "Lane turns outward."],
  ["house", "Stacked houses", "housing", ["b", "b", "b", "b"], 5, false, "Narrow houses, gable to gable."],
  ["kucheh", "Close", "housing", ["S", "b", "b", "b"], 1.4, false, "Dead-end close of front doors."],
  ["kucheh-o", "Close", "housing", ["b", "S", "b", "b"], 0.8, false, "Dead-end close reached from outside."],
  ["kucheh-s", "Close", "housing", ["b", "b", "S", "b"], 0.8, true, "Dead-end close off a lane."],
  ["hammam", "Bathhouse", "housing", ["b", "b", "b", "b"], 0.6, false, "Steam and gossip."],
  ["bimaristan", "Physic house", "housing", ["b", "b", "b", "b"], 0.4, false, "Wards around a running channel."],
  ["masjid", "Wayside chapel", "housing", ["S", "b", "b", "b"], 0.5, false, "A small chapel at the head of a lane."],
  ["qanat", "Culvert", "housing", ["c", "c", "b", "b"], 0.8, false, "Water channel under the street."],
  ["ab-anbar", "Cistern", "housing", ["b", "c", "b", "b"], 0.5, false, "Domed cistern at the end of the culvert."],
  ["belvedere", "Reserved court", "housing", ["b", "b", "b", "b"], 0, false, "Held open for a landmark."],

  ["orchard", "Orchard", "garden", ["b", "g", "g", "g"], 4, false, "Old pear trees."],
  ["pool-garden", "Pond grove", "garden", ["b", "g", "g", "g"], 1, false, "A still pond the mites love."],
  ["pavilion", "Grove shrine", "garden", ["b", "g", "g", "g"], 0.6, false, "A roofed shrine among the trees."],
  ["garden-path", "Grove avenue", "garden", ["S", "S", "g", "g"], 1, false, "Avenue running through to a gate."],
  ["garden-end", "Grove walk", "garden", ["S", "g", "g", "g"], 1.2, false, "Avenue ending in the groves."],
  ["garden-canal", "Grove rill", "garden", ["c", "c", "g", "g"], 1, false, "Water crossing the groves."],

  ["wall", "Curtain wall", "wall", ["g", "X", "w", "w"], 5, false, "Black stone wall."],
  ["tower", "Wall tower", "wall", ["g", "X", "w", "w"], 1.6, false, "Round tower on the wall."],
  ["gate", "Gate", "wall", ["S", "X", "w", "w"], 1, false, "One of four gates."],
  ["inlet", "Water gate", "wall", ["c", "X", "w", "w"], 0.6, false, "Where the culvert passes under the wall."],
];

// How each kind of tile reads on the map. `kind` groups tiles for drawing and for counting
// what a quarter is made of.
export const TILE_KIND = {
  core: "tower", iwan: "street", fountain: "water", minaret: "tower", "bayt-al-hikma": "civic",
  avenue: "street", chaharsu: "market", "chaharsu-t": "market", "chaharsu-o": "market", arcade: "market",
  "arcade-end": "market", caravanserai: "civic", madrasa: "civic",
  "avenue-h": "street", lane: "street", cross: "street", "t-in": "street", "t-out": "street", "t-side": "street",
  "bend-in": "street", "bend-out": "street", house: "house", kucheh: "street", "kucheh-o": "street", "kucheh-s": "street",
  hammam: "civic", bimaristan: "civic", masjid: "shrine", qanat: "water", "ab-anbar": "water", belvedere: "court",
  orchard: "grove", "pool-garden": "water", pavilion: "shrine", "garden-path": "street", "garden-end": "street",
  "garden-canal": "water", wall: "wall", tower: "wall", gate: "gate", inlet: "wall",
};
