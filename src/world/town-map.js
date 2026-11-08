// world/town-map.js — the town as a radial WFC layout, and building into it.
//
// Wraps interactions_library's radial solver (window.CityWFC, shared/city/city-wfc.js — vendored
// in public/vendor/forge/) with the town's own tile grammar (content/town.js) plus one
// zero-weight tile per building and zone. The solver never picks a zero-weight tile itself; a
// building only appears where the council pins it, and the streets regrow around the pin.
//
// Re-solving the whole town for every building would reshuffle it, so building is local: every
// other cell keeps its tile, the cells within a few steps of the new building are freed, and the
// solver regrows just that patch. If the patch can't be solved, the patch widens; only as a
// last resort does the whole town re-solve (built cells always stay pinned).

import { TILE_DEFS, QUARTERS, TILE_KIND, ZONE_NAMES } from "../content/town.js";
import { BUILDINGS, BUILDING_BY_ID } from "../content/buildings.js";

// the sockets a building presents in each zone: closed on every side, like a house or orchard
const CLOSED = {
  housing: ["b", "b", "b", "b"],
  bazaar: ["b", "b", "b", "b"],
  garden: ["b", "g", "g", "g"],
};
const buildingTileId = (kind, zone) => `build:${kind}:${zone}`;

// `weights` (tile id → multiplier) lets a sentence reshape what the town grows: "water" makes
// culverts and cisterns likelier everywhere. Tiles the solver depends on are never weighted to 0.
export function createTownMap(CityWFC, seed, { weights = {} } = {}) {
  const defs = TILE_DEFS.map((d) => (weights[d[0]] && d[4] > 0 ? [d[0], d[1], d[2], d[3], d[4] * weights[d[0]], d[5], d[6]] : d));
  for (const b of BUILDINGS) for (const z of b.zones) defs.push([buildingTileId(b.id, z), b.name, z, CLOSED[z], 0, false, b.blurb]);
  const tiles = CityWFC.buildTiles(defs);
  const tileIndex = new Map(tiles.map((t) => [t.id, t.index]));
  const { cells } = CityWFC.buildGrid();
  for (const c of cells) {
    const mid = ((c.a0 + c.a1) / 2) * (180 / Math.PI);
    c.quarter = c.ring === 0 ? null : (QUARTERS.find((q) => mid >= q.from && mid < q.to) || QUARTERS[0]).id;
    c.avenue = CityWFC.isAvenueCell(c);
  }
  // cells flanking an avenue, around the ring: the grove ring can't close these off (the avenue's
  // garden-end needs them open), so buildings keep one cell back from every avenue
  for (const c of cells) c.flanksAvenue = c.nb.some(([nb, side]) => (side === "cw" || side === "ccw") && cells[nb].avenue);

  let result = null; // tile index per cell
  const pins = new Map(); // cellId -> building id

  function solveWith(domain, s = seed) {
    const res = CityWFC.generate(s, { tiles, cells, domain });
    return res && res.ok !== false ? res : null;
  }

  function first() {
    const res = solveWith(undefined);
    if (!res) throw new Error("town: the grammar has no solution for this seed");
    result = Array.from(res.result);
    return res;
  }

  // cells within `hops` steps of `start` (by the solver's own neighbour links)
  function around(start, hops) {
    const seen = new Set([start]);
    let frontier = [start];
    for (let h = 0; h < hops; h++) {
      const next = [];
      for (const id of frontier) for (const [nb] of cells[id].nb) if (!seen.has(nb)) { seen.add(nb); next.push(nb); }
      frontier = next;
    }
    return seen;
  }

  function pinnedDomain(cell) {
    const kind = pins.get(cell.id);
    return kind ? [tileIndex.get(buildingTileId(kind, cell.zone))] : null;
  }

  // Pin a building and regrow the streets around it. Returns the cells that changed.
  function build(kind, cellId) {
    const cell = cells[cellId];
    if (!canBuild(kind, cellId)) return null;
    pins.set(cellId, kind);
    const before = result.slice();
    for (const hops of [1, 2, 3]) {
      const free = around(cellId, hops);
      const res = solveWith((c) => pinnedDomain(c) || (free.has(c.id) ? CityWFC.initialDomain(c, tiles) : [result[c.id]]), seed + hops * 131);
      if (res) { result = Array.from(res.result); return diff(before); }
    }
    const res = solveWith((c) => pinnedDomain(c) || CityWFC.initialDomain(c, tiles));
    if (res) { result = Array.from(res.result); return diff(before); }
    pins.delete(cellId); // could not fit it anywhere: undo
    return null;
  }

  function diff(before) {
    const changed = [];
    for (let i = 0; i < result.length; i++) if (result[i] !== before[i]) changed.push(i);
    return changed;
  }

  function canBuild(kind, cellId) {
    const b = BUILDING_BY_ID[kind], cell = cells[cellId];
    if (!b || !cell || pins.has(cellId) || cell.avenue || cell.flanksAvenue || cell.ring === 0) return false;
    return b.zones.includes(cell.zone);
  }

  function tileAt(cellId) {
    const t = tiles[result[cellId]];
    const pinned = pins.get(cellId);
    const id = t.base || t.id;
    return { id, name: t.name, note: t.note, kind: pinned ? "building" : TILE_KIND[id] || "house", building: pinned || null };
  }

  // the cell under a point in city-local units (centre 0,0; outer wall radius RADII[last])
  function cellAt(x, y) {
    const r = Math.hypot(x, y);
    const ring = CityWFC.RADII.findIndex((r0, i) => i < CityWFC.RINGS.length && r >= r0 && r < CityWFC.RADII[i + 1]);
    if (ring < 0) return null;
    let a = Math.atan2(y, x); if (a < 0) a += Math.PI * 2;
    return cells.find((c) => c.ring === ring && a >= c.a0 && a < c.a1) || null;
  }

  first();
  return {
    cells, tiles, pins, CityWFC,
    outerRadius: CityWFC.RADII[CityWFC.RINGS.length],
    build, canBuild, tileAt, cellAt,
    zoneName: (z) => ZONE_NAMES[z] || z,
    centroid(cellId) {
      const c = cells[cellId], r = (c.r0 + c.r1) / 2, a = (c.a0 + c.a1) / 2;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    },
    quarterCentroid(qid) {
      const q = QUARTERS.find((x) => x.id === qid), a = ((q.from + q.to) / 2) * (Math.PI / 180), r = CityWFC.RADII[5];
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    },
  };
}
