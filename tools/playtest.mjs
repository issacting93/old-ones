// tools/playtest.mjs — play the slice headless, with no browser, to check the loop holds together.
//
//   node tools/playtest.mjs [route]
//
// Routes are scripted strategies: "industry" builds the foundry first, "kin" builds shrines and
// cisterns, "ward" raises wardstones. Prints each night's dusk events, the old ones' readings and
// what everyone said, so a change to content can be checked by reading one log.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
for (const f of ["city-wfc.js", "ecology-species.slim.js", "ecology-sim.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(root, "public/vendor/forge", f), "utf8"), { filename: f });
}
const { createGame } = await import("../src/game/engine.js");
const { BUILDING_BY_ID } = await import("../src/content/buildings.js");

const ROUTES = {
  industry: [["foundry", "cinder"], ["lamphouse", "cinder"], ["foundry", "cinder"], ["harvest", "drowned"], [null], [null]],
  kin: [["shrine", "lantern"], ["cistern", "cistern"], ["shrine", "cistern"], ["shrine", "drowned"], [null], [null]],
  ward: [["foundry", "cinder"], ["wardstone", "cinder"], [null], ["wardstone", "cistern"], [null], [null]],
};
const routeName = process.argv[2] || "industry";
const route = ROUTES[routeName];
Math.random = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })(); // repeatable dice

const g = createGame({ CityWFC: window.CityWFC, EcologySim: window.EcologySim, EcologySpecies: window.EcologySpecies, seed: 1907 });
const S = (p) => g.state.get(p);
const fmt = (o) => Object.entries(o).map(([k, v]) => `${k} ${typeof v === "number" ? v.toFixed(2) : v}`).join(", ");

console.log(`route: ${routeName}`);
for (let n = 0; n < route.length; n++) {
  console.log(`\n══ night ${S("night")} ══  coin ${S("coin")}  hope ${S("hope")}  dread ${S("dread")}  stance ${fmt(S("stance"))}`);
  for (const d of S("dusk")) console.log(`  dusk · ${d.headline}`);
  // visit whoever has the most pressing thread
  const ranked = g.characters.map((c) => ({ c, t: g.threadFor(c.id) })).filter((x) => x.t).sort((a, b) => (b.t.priority || 0) - (a.t.priority || 0));
  for (const { c } of ranked.slice(0, 2)) {
    const convo = g.visit(c.id);
    if (!convo) continue;
    while (!convo.done) {
      // listen: prefer a lens follow-up, else the first non-jump choice
      const i = Math.max(0, convo.choices.findIndex((ch) => ch.kind === "lens"), convo.choices.findIndex((ch) => ch.kind === "free"));
      convo.choose(convo.choices.findIndex((ch) => ch.kind === "lens") >= 0 ? convo.choices.findIndex((ch) => ch.kind === "lens") : i);
    }
    console.log(`  visit · ${c.name} — "${convo.thread.title}" (depth ${convo.depth}, clues ${convo.clues.map((k) => k.id).join(" ") || "none"})`);
  }
  const [kind, quarter] = route[n];
  if (kind) {
    const ring = BUILDING_BY_ID[kind].zones.includes("housing") ? 5 : 7;
    const options = g.town.cells.filter((c) => c.quarter === quarter && c.ring === ring && g.town.canBuild(kind, c.id));
    const cell = options[Math.floor(options.length / 2)];
    const r = g.build(kind, cell.id);
    console.log(`  council · ${kind} in ${quarter}: ${r.ok ? `built (${r.changed.length} cells regrew)` : r.reason}`);
  }
  await g.endNight();
  console.log(`  night · share ${fmt(S("readings.share"))}`);
  const hungry = Object.entries(S("eco.hungry")).filter(([, v]) => v).map(([k, v]) => `${k}×${v}`);
  if (hungry.length) console.log(`  night · hungry ${hungry.join(", ")}; intruders ${fmt(Object.fromEntries(Object.entries(S("eco.intruders")).filter(([, v]) => v)))}`);
}
console.log(`\nended: ${S("phase")} · clues ${S("clues").length} · flags ${S("flags").join(" ")}`);
