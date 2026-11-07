// world/ecology.js — the old ones, living over the town.
//
// Runs interactions_library's creature simulation (window.EcologySim, shared/ecology/
// ecology-sim.js, vendored unmodified) in a square "tank" the town sits inside. The town and the
// sim share one space: city-local units (the solver's, wall radius ~15.3) map onto tank units by
// a fixed scale, so a building at a cell is a landmark at the same spot in the water.
//
// What the town does to the old ones:
//   population  each species' share = its default share × (buildings' pop) × (story multipliers)
//   draws       buildings pull species into orbit around them (the sim's own local vortices);
//               the moon gathers species to the Old Tower the same way, with a wider pull
//   intruders   a hungry apex is drawn into the busiest quarter (also a vortex, a big one)
//   wards       old ones inside a ward's radius are pushed back out (applied here after each step;
//               the sim has no repel of its own)
//
// What the town reads back (readings): each species' share of its usual numbers, and how many of
// each are in each quarter right now.

const TANK_VW = 450; // EcologySim.resize units; the tank is 4× this (1800 × 1800)
const CITY_FILL = 0.86; // the wall's radius as a share of half the tank

// the same settings Forge's Ecology screen (forge/web/ecology.html) runs its city with
export const SIM_CONFIG = {
  species: "mixed", beh: "on", dz: 0.8, flow: "free", swirl: 1.2, vradius: 0.8, count: 150, size: 70,
  sep: 2.4, align: 1, coh: 0.8, speed: 1, wiggle: 0.03, flex: 18, bank: 0.6, ptr: "ignore",
};

export function createEcology({ Sim, ES, outerRadius }) {
  const sim = Sim.create({ ...SIM_CONFIG });
  Sim.resize(sim, TANK_VW, TANK_VW);
  Sim.setSpecies(sim, "mixed");
  const W = sim.bounds.w, H = sim.bounds.h;
  const scale = (Math.min(W, H) / 2) * CITY_FILL / outerRadius;
  const keys = sim.speciesRT.map((s) => s.key);
  const keyIdx = Object.fromEntries(keys.map((k, i) => [k, i]));
  const baseline = Sim.desired(sim).slice();
  let wards = [];

  const toTank = (p) => ({ x: W / 2 + p.x * scale, y: H / 2 + p.y * scale });
  const toCity = (p) => ({ x: (p.x - W / 2) / scale, y: (p.y - H / 2) / scale });

  // Rebuild every lever from the town's current state. Cheap; call after any change.
  function apply({ multipliers, landmarks, intruders, wardList }) {
    const pop = {};
    for (const k of keys) pop[k] = Math.max(0.02, (sim.POP_DEFAULT[k] || 0) * (multipliers[k] ?? 1));
    Sim.setPop(sim, pop);
    const vortices = [];
    for (const lm of landmarks) {
      if (!lm.draws.length) continue;
      const t = toTank(lm.at);
      vortices.push({ x: t.x, y: t.y, radius: lm.radius || 230, strength: lm.strength || 0.85, species: new Set(lm.draws.map((k) => keyIdx[k]).filter((i) => i != null)) });
    }
    for (const it of intruders) {
      const t = toTank(it.at);
      vortices.push({ x: t.x, y: t.y, radius: 520, strength: 1.2, species: new Set([keyIdx[it.key]]) });
    }
    Sim.setVortices(sim, vortices);
    wards = wardList.map((w) => ({ ...toTank(w.at), radius: w.radius }));
  }

  function step(dt) {
    Sim.step(sim, dt);
    if (!wards.length) return;
    for (const f of sim.fish) {
      if (f.dead) continue;
      for (const w of wards) {
        const dx = f.x - w.x, dy = f.y - w.y, d = Math.hypot(dx, dy) || 1;
        if (d >= w.radius) continue;
        const k = (1 - d / w.radius) * 900 * dt;
        f.vx += (dx / d) * k; f.vy += (dy / d) * k;
      }
    }
  }

  // Run the sim forward without drawing — "the night passes". Yields to the browser between
  // chunks so the page keeps painting; onProgress(0..1).
  async function fastForward(seconds, onProgress) {
    const dt = 1 / 20, steps = Math.round(seconds / dt), chunk = 10;
    for (let i = 0; i < steps; i += chunk) {
      for (let j = 0; j < chunk && i + j < steps; j++) step(dt);
      onProgress && onProgress(Math.min(1, (i + chunk) / steps));
      await new Promise((r) => (typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));
    }
  }

  // quarterOf: (cityPoint) -> quarter id | null
  function readings(quarterOf) {
    const target = Sim.desired(sim);
    const share = {};
    keys.forEach((k, i) => (share[k] = baseline[i] ? +(target[i] / baseline[i]).toFixed(3) : 0));
    const quarters = {}, live = {};
    for (const f of sim.fish) {
      if (f.dead) continue;
      const k = keys[f.sp];
      live[k] = (live[k] || 0) + 1;
      const q = quarterOf(toCity(f));
      if (!q) continue;
      (quarters[q] ||= {})[k] = (quarters[q][k] || 0) + 1;
    }
    return { share, live, quarters };
  }

  return { sim, ES, keys, toTank, toCity, apply, step, fastForward, readings, get wards() { return wards; } };
}
