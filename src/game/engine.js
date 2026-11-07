// game/engine.js — one night at a time.
//
// The loop for this slice:
//   dusk     events fire (core/scenario.js) from the state the last night left behind
//   evening  visit up to TOWN.visitsPerNight townsfolk (core/conversation.js)
//   council  one decision: build something (world/town-map.js) or fund a lens
//   night    the old ones live with what you decided (world/ecology.js), then the hunger rule
//            runs and the town reads where everything ended up
// After TOWN.nights nights the slice ends with where the town stands.
//
// Like Mandate's engine.js, this is the only file that knows about every system; systems talk
// through the bus and keep their state in the StateStore. Unlike Mandate, nothing lives in
// mutable shared content arrays — content files are read-only, and all play state is in the store.

import { EventBus } from "../core/bus.js";
import { StateStore } from "../core/state.js";
import { rollCheck } from "../core/dice.js";
import { test, apply } from "../core/rules.js";
import { ScenarioSystem } from "../core/scenario.js";
import { Conversation, pickThread } from "../core/conversation.js";
import { createTownMap } from "../world/town-map.js";
import { createEcology } from "../world/ecology.js";
import { TOWN, QUARTERS, STARTING_LENSES } from "../content/town.js";
import { BUILDING_BY_ID, FUND_LENS_COST } from "../content/buildings.js";
import { STARTING_STANCE } from "../content/stance.js";
import { CHARACTERS, CHARACTER_BY_ID } from "../content/characters.js";
import { EVENTS } from "../content/events.js";
import { HUNGER, DIET, HUNGRY_INTRUDERS } from "../content/ecology-rules.js";

export function initialState() {
  return {
    night: 1,
    phase: "evening", // evening | passing | ended
    coin: TOWN.startingCoin,
    hope: 4,
    dread: 2,
    stance: { ...STARTING_STANCE },
    lenses: { ...STARTING_LENSES },
    visitsLeft: TOWN.visitsPerNight,
    councilUsed: false,
    built: [],
    flags: [],
    clues: [],
    feed: [],
    talked: {},
    threadsDone: [],
    eco: { mult: {}, hungry: {}, intruders: {} },
    readings: { share: {}, live: {}, quarters: {} },
    dusk: [], // events that fired at the start of this night
  };
}

export function createGame({ CityWFC, EcologySim, EcologySpecies, seed = 1907 }) {
  const bus = new EventBus();
  const state = new StateStore(bus, initialState());
  const ctx = { state, bus };
  const town = createTownMap(CityWFC, seed);
  const eco = createEcology({ Sim: EcologySim, ES: EcologySpecies, outerRadius: town.outerRadius });
  const scenario = new ScenarioSystem(bus, state, EVENTS);
  const roll = (level, difficulty) => rollCheck(level, difficulty);

  function quarterOf(p) {
    const r = Math.hypot(p.x, p.y);
    if (r > town.outerRadius || r < town.CityWFC.RADII[1]) return null;
    let a = Math.atan2(p.y, p.x) * (180 / Math.PI); if (a < 0) a += 360;
    return (QUARTERS.find((q) => a >= q.from && a < q.to) || QUARTERS[0]).id;
  }

  // ── the town → the old ones ─────────────────────────────────
  function buildingMultipliers() {
    const out = {};
    const banked = state.get("flags").includes("fires-banked");
    for (const b of state.get("built")) {
      const def = BUILDING_BY_ID[b.kind];
      for (const [k, m] of Object.entries(def.pop || {})) {
        const eff = banked && b.kind === "foundry" && m < 1 ? 1 - (1 - m) / 2 : m; // banked fires halve the harm
        out[k] = (out[k] ?? 1) * eff;
      }
    }
    return out;
  }

  function syncEcology() {
    const bm = buildingMultipliers(), sm = state.get("eco.mult") || {};
    const multipliers = {};
    for (const k of eco.keys) multipliers[k] = (bm[k] ?? 1) * (sm[k] ?? 1);
    const built = state.get("built");
    const landmarks = built.map((b) => ({ at: town.centroid(b.cellId), draws: BUILDING_BY_ID[b.kind].draws || [] }));
    const wardList = built.filter((b) => BUILDING_BY_ID[b.kind].wards).map((b) => ({ at: town.centroid(b.cellId), radius: BUILDING_BY_ID[b.kind].wards }));
    const intruders = Object.entries(state.get("eco.intruders") || {}).filter(([, q]) => q).map(([key, q]) => ({ key, at: town.quarterCentroid(q) }));
    eco.apply({ multipliers, landmarks, intruders, wardList });
  }

  function takeReadings() {
    state.set("readings", eco.readings(quarterOf));
  }

  // The slow story: who goes hungry, and where the hungry go.
  function runHunger() {
    const share = state.get("readings.share");
    const hungry = { ...(state.get("eco.hungry") || {}) };
    const mult = { ...(state.get("eco.mult") || {}) };
    for (const [k, prey] of Object.entries(DIET)) {
      const food = prey.reduce((a, p) => a + (share[p] ?? 1), 0) / prey.length;
      if (food < HUNGER.threshold) {
        hungry[k] = (hungry[k] || 0) + 1;
        mult[k] = (mult[k] ?? 1) * HUNGER.decline;
      } else {
        hungry[k] = 0;
        mult[k] = (mult[k] ?? 1) + (1 - (mult[k] ?? 1)) * HUNGER.recovery;
      }
    }
    // a hungry apex comes inside the wall, toward the quarter with the most building
    const counts = {};
    for (const b of state.get("built")) counts[b.quarter] = (counts[b.quarter] || 0) + 1;
    const busiest = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "cinder";
    const intruders = {};
    for (const k of HUNGRY_INTRUDERS) intruders[k] = hungry[k] ? busiest : null;
    state.set("eco.hungry", hungry);
    state.set("eco.mult", mult);
    state.set("eco.intruders", intruders);
  }

  // ── evening: visiting ───────────────────────────────────────
  function threadFor(characterId) {
    return pickThread(CHARACTER_BY_ID[characterId], ctx, test);
  }

  function visit(characterId) {
    if (state.get("phase") !== "evening" || state.get("visitsLeft") <= 0) return null;
    const ch = CHARACTER_BY_ID[characterId];
    const thread = threadFor(characterId);
    if (!ch || !thread) return null;
    state.update("visitsLeft", (v) => v - 1);
    state.update(`talked.${characterId}`, (v = 0) => v + 1);
    return new Conversation(ch, thread, { state, bus, roll });
  }

  bus.on("conversation.ended", ({ thread }) => {
    state.update("threadsDone", (d) => (d.includes(thread) ? d : [...d, thread]));
  });

  // ── council: one decision a night ───────────────────────────
  function build(kind, cellId) {
    const def = BUILDING_BY_ID[kind];
    if (!def || state.get("councilUsed") || state.get("coin") < def.coin) return { ok: false, reason: "not now" };
    if (!town.canBuild(kind, cellId)) return { ok: false, reason: "can't build there" };
    const changed = town.build(kind, cellId);
    if (!changed) return { ok: false, reason: "the streets won't fit it there" };
    const cell = town.cells[cellId];
    state.update("coin", (c) => c - def.coin);
    state.update("built", (b) => [...b, { kind, cellId, quarter: cell.quarter, night: state.get("night") }]);
    state.set("councilUsed", true);
    apply([
      { type: "stance", ...def.stance },
      ...Object.entries(def.lens || {}).map(([lens, delta]) => ({ type: "lens", lens, delta })),
      { type: "feed", text: `The council raised a ${def.name.toLowerCase()} in the ${QUARTERS.find((q) => q.id === cell.quarter).name}.`, tone: "council" },
    ], ctx);
    syncEcology();
    bus.emit("town.changed", { cells: changed, cellId });
    return { ok: true, changed };
  }

  function fundLens(lens) {
    if (state.get("councilUsed") || state.get("coin") < FUND_LENS_COST || (state.get(`lenses.${lens}`) || 0) >= 3) return { ok: false };
    state.update("coin", (c) => c - FUND_LENS_COST);
    state.set("councilUsed", true);
    apply([{ type: "lens", lens, delta: 1 }, { type: "feed", text: `The council funded ${lens.toLowerCase()} work.`, tone: "council" }], ctx);
    return { ok: true };
  }

  // ── night ───────────────────────────────────────────────────
  async function endNight(onProgress) {
    if (state.get("phase") !== "evening") return;
    state.set("phase", "passing");
    const income = TOWN.tithe + (state.get("hope") >= TOWN.hopefulAt ? TOWN.hopefulTithe : 0)
      + state.get("built").reduce((a, b) => a + (BUILDING_BY_ID[b.kind].income || 0), 0);
    if (income) apply([{ type: "coin", delta: income }], ctx);
    await eco.fastForward(8, onProgress);
    takeReadings();
    runHunger();
    syncEcology();
    const next = state.get("night") + 1;
    if (next > TOWN.nights) { state.set("phase", "ended"); bus.emit("game.ended", {}); return; }
    state.set("night", next);
    state.set("visitsLeft", TOWN.visitsPerNight);
    state.set("councilUsed", false);
    dusk(next);
    state.set("phase", "evening");
  }

  function dusk(night) {
    const fired = scenario.evaluate(night);
    for (const f of fired) apply([{ type: "feed", text: f.headline, tone: f.tone }], ctx);
    state.set("dusk", fired);
  }

  // first night
  syncEcology();
  takeReadings();
  dusk(1);

  return {
    bus, state, town, eco, ctx,
    characters: CHARACTERS,
    threadFor, visit, build, fundLens, endNight, quarterOf,
  };
}
