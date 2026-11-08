// game/engine.js — loops and nights.
//
// One loop is one lunar month, eight nights (design doc, "The loop", "A night", "A month"):
//   regrow   the town grows from the last sentence (world/town-map.js), the old ones settle into
//            it (world/ecology.js), and the mystery generator reads that world and picks what
//            happened to someone (game/case.js). The brain records why (core/graph.js).
//   night    dusk events fire, you notice sightings, the town deals you a hand of people and
//            places, you play two of them (talk, core/talk.js; or search), you combine what you
//            know into deductions, and the night passes while the old ones move.
//   night 8  the full moon, clear or red. You name what happened, a blood moon takes someone,
//            and you write a sentence in the old ones' words. The next town grows from it.
// What you keep between loops (the "carry": lexicon, memories, stance, the next missing person,
// how far into the larger mystery you are) is saved in the browser.
//
// Like Mandate's engine.js, this is the only file that knows every system. All play state is in
// the StateStore; content files are read-only.

import { EventBus } from "../core/bus.js";
import { StateStore } from "../core/state.js";
import { rollCheck } from "../core/dice.js";
import { test, apply } from "../core/rules.js";
import { ScenarioSystem } from "../core/scenario.js";
import { Graph } from "../core/graph.js";
import { Talk } from "../core/talk.js";
import { createTownMap } from "../world/town-map.js";
import { createEcology } from "../world/ecology.js";
import { generateCase, writeBrain } from "./case.js";
import { TOWN, QUARTERS } from "../content/town.js";
import { BUILDING_BY_ID } from "../content/buildings.js";
import { STARTING_STANCE } from "../content/stance.js";
import { CHARACTERS, WATCHER } from "../content/characters.js";
import { EVENTS } from "../content/events.js";
import { HUNGER, DIET, HUNGRY_INTRUDERS } from "../content/ecology-rules.js";
import { MOON, BLOOD_PHASE, phaseFor, lunarDay, nightsToFull } from "../content/moon.js";
import { WORDS, WORD_BY_ID, FIRST_SENTENCE, compileSentence, sentenceSlots } from "../content/sigils.js";
import { PLACES, PLACE_BY_ID } from "../content/places.js";
import { OLD_ONE_BY_KEY } from "../content/old-ones.js";
import { QUESTIONS, ARRIVAL } from "../content/lore.js";

const SAVE_KEY = "old-ones.carry.v1";
const CORE_PRONOUNS = { ondine: "she", corwin: "he", maren: "she" };

// ── what carries between loops ────────────────────────────────
export function freshCarry() {
  return {
    version: 1, loop: 1, lexicon: {}, memories: [], stance: { ...STARTING_STANCE },
    sentence: [...FIRST_SENTENCE], nextVictim: null, solved: 0, history: [], lastCause: null,
  };
}
export function loadCarry(storage) {
  try {
    const c = JSON.parse(storage?.getItem(SAVE_KEY) || "null");
    return c && c.version === 1 ? c : null;
  } catch { return null; }
}
function saveCarry(storage, carry) {
  try { storage?.setItem(SAVE_KEY, JSON.stringify(carry)); } catch { /* private window: keep playing */ }
}
function clearCarry(storage) {
  try { storage?.removeItem(SAVE_KEY); } catch { /* nothing saved */ }
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame({ CityWFC, EcologySim, EcologySpecies, storage = null, random = Math.random }) {
  const bus = new EventBus();
  const state = new StateStore(bus, { loop: 1, phase: "regrowing", night: 0, moon: {}, built: [], flags: [], feed: [], dusk: [] });
  const ctx = { state, bus };
  const scenario = new ScenarioSystem(bus, state, EVENTS);
  let town = null, eco = null, theCase = null, graph = null, people = {}, carry = null, rng = random;

  const S = (p) => state.get(p);
  const meaning = (id) => WORD_BY_ID[id]?.meaning || id;

  function quarterOf(p) {
    const r = Math.hypot(p.x, p.y);
    if (r > town.outerRadius) return null;
    if (r < town.CityWFC.RADII[2]) return "centre";
    let a = Math.atan2(p.y, p.x) * (180 / Math.PI); if (a < 0) a += 360;
    return (QUARTERS.find((q) => a >= q.from && a < q.to) || QUARTERS[0]).id;
  }
  const quarterName = (q) => (q === "centre" ? "the Old Tower" : QUARTERS.find((x) => x.id === q)?.name || "the town");

  // ── the town → the old ones ─────────────────────────────────
  function syncEcology() {
    const multipliers = {};
    const base = S("eco.base") || {}, story = S("eco.mult") || {};
    for (const k of eco.keys) multipliers[k] = (base[k] ?? 1) * (story[k] ?? 1);
    for (const b of S("built")) for (const [k, m] of Object.entries(BUILDING_BY_ID[b.kind].pop || {})) multipliers[k] = (multipliers[k] ?? 1) * m;
    const moon = S("moon") || {}, phase = phaseFor(S("night") || 1);
    for (const [k, m] of Object.entries(moon.blood ? MOON.blood.pop : phase.pop || {})) multipliers[k] = (multipliers[k] ?? 1) * m;
    const gather = [...new Set([...(moon.blood ? MOON.blood.gather : phase.gather || []), ...(S("gather") || [])])];
    const wardScale = moon.blood ? MOON.blood.wardStrength : 1;
    const built = S("built");
    const landmarks = built.map((b) => ({ at: town.centroid(b.cellId), draws: BUILDING_BY_ID[b.kind].draws || [] }));
    if (gather.length) landmarks.push({ at: { x: 0, y: 0 }, draws: gather, radius: moon.blood ? 900 : 420, strength: moon.blood ? 1.1 : 0.7 });
    const wardList = built.filter((b) => BUILDING_BY_ID[b.kind].wards).map((b) => ({ at: town.centroid(b.cellId), radius: BUILDING_BY_ID[b.kind].wards * wardScale }));
    const intruders = Object.entries(S("eco.intruders") || {}).filter(([, q]) => q).map(([key, q]) => ({ key, at: town.quarterCentroid(q) }));
    eco.apply({ multipliers, landmarks, intruders, wardList });
  }

  function takeReadings() { state.set("readings", eco.readings(quarterOf)); }

  function busiestQuarter() {
    const counts = {};
    for (const b of S("built")) if (b.quarter) counts[b.quarter] = (counts[b.quarter] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "cinder";
  }

  // The slow story: who goes hungry, and where the hungry go.
  function runHunger() {
    const share = S("readings.share");
    const hungry = { ...(S("eco.hungry") || {}) }, mult = { ...(S("eco.mult") || {}) };
    for (const [k, prey] of Object.entries(DIET)) {
      const food = prey.reduce((a, p) => a + (share[p] ?? 1), 0) / prey.length;
      if (food < HUNGER.threshold) { hungry[k] = (hungry[k] || 0) + 1; mult[k] = (mult[k] ?? 1) * HUNGER.decline; }
      else { hungry[k] = 0; mult[k] = (mult[k] ?? 1) + (1 - (mult[k] ?? 1)) * HUNGER.recovery; }
    }
    const busiest = busiestQuarter(), intruders = {};
    for (const k of HUNGRY_INTRUDERS) intruders[k] = hungry[k] ? busiest : null;
    state.set("eco.hungry", hungry);
    state.set("eco.mult", mult);
    state.set("eco.intruders", intruders);
  }

  // ── a loop ──────────────────────────────────────────────────
  async function startLoop(next, onProgress) {
    carry = structuredClone(next);
    const rules = compileSentence(carry.sentence, carry.loop);
    rng = mulberry(rules.seed * 7919 + carry.loop);
    state.restore({ loop: carry.loop, phase: "regrowing", night: 0, built: [], moon: {}, flags: [], feed: [], dusk: [] });
    bus.emit("state.changed", { path: "" });

    // the town regrows from the sentence
    town = createTownMap(CityWFC, rules.seed, { weights: rules.weights });
    const built = [];
    for (const [kind, count] of Object.entries(rules.pins)) {
      for (let i = 0; i < count; i++) {
        const options = town.cells.filter((c) => town.canBuild(kind, c.id) && !built.some((b) => b.quarter === c.quarter && b.kind === kind));
        const pool = options.length ? options : town.cells.filter((c) => town.canBuild(kind, c.id));
        if (!pool.length) continue;
        const cell = pool[Math.floor(rng() * pool.length)];
        if (town.build(kind, cell.id)) built.push({ kind, cellId: cell.id, quarter: cell.quarter });
      }
    }
    eco = createEcology({ Sim: EcologySim, ES: EcologySpecies, outerRadius: town.outerRadius });
    scenario.reset();

    const lexicon = carry.lexicon || {};
    state.restore({
      loop: carry.loop, night: 0, phase: "regrowing",
      dread: Math.max(0, TOWN.startingDread + rules.dread),
      stance: { kin: carry.stance.kin + rules.stance.kin, ward: carry.stance.ward + rules.stance.ward, bind: carry.stance.bind + rules.stance.bind },
      flags: [], feed: [], dusk: [], moon: {},
      eco: { base: rules.pop, mult: {}, hungry: {}, intruders: {} },
      readings: { share: {}, live: {}, quarters: {} },
      built, gather: rules.gather, sentence: carry.sentence,
      hand: [], actionsLeft: 0, available: { people: [], places: [] }, fresh: [],
      trust: {}, asked: {}, met: [], searched: [],
      clues: [], deductions: [], sightings: [], attempts: [],
      lexicon, insight: Object.keys(lexicon).length,
      memories: carry.memories || [], solved: carry.solved || 0, history: carry.history || [],
      case: null, verdict: null, found: false, arrival: "",
    });
    bus.emit("town.changed", {});
    bus.emit("state.changed", { path: "" });

    // the old ones settle into it
    syncEcology();
    await eco.fastForward(5, onProgress);
    takeReadings();
    runHunger();
    syncEcology();

    // the mystery comes out of that world
    const counts = (list) => list.reduce((o, x) => ((o[x] = (o[x] || 0) + 1), o), {});
    const world = {
      share: S("readings.share"), hungry: S("eco.hungry"), built: counts(built.map((b) => b.kind)),
      busiest: busiestQuarter(), pressQuarter: built.find((b) => b.kind === "harvest")?.quarter, words: counts(carry.sentence),
    };
    theCase = generateCase({ world, rng, carryVictim: carry.nextVictim, avoidCause: carry.lastCause });
    graph = writeBrain(new Graph(), { sentence: carry.sentence, built, share: world.share, hungry: world.hungry, theCase });

    people = {};
    for (const ch of CHARACTERS) people[ch.id] = { ...ch, pron: CORE_PRONOUNS[ch.id] };
    people.kin = { ...theCase.K };
    people.witness = { ...theCase.W };
    people.watcher = { ...WATCHER, pron: "it", greet: WATCHER.greet };

    const pub = (p) => ({ id: p.id, name: p.name, first: p.first, role: p.role, rel: p.rel, quarter: p.quarter, initials: p.initials });
    state.set("case", { V: pub(theCase.V), K: pub(theCase.K), W: pub(theCase.W), q: theCase.q, Q: theCase.Q, places: theCase.places, cause: theCase.cause });
    state.set("available", { people: ["kin", "ondine", "corwin", "maren"], places: PLACES.map((p) => p.id) });
    state.set("fresh", ["kin"]);
    state.set("arrival", (carry.loop === 1 ? ARRIVAL.first : ARRIVAL.again)({ V: theCase.V, K: theCase.K }));
    apply([{ type: "feed", text: `${theCase.V.name} is missing.`, tone: "case" }], ctx);
    dusk(1);
  }

  // ── a night ─────────────────────────────────────────────────
  function updateMoon(night) {
    const phase = phaseFor(night);
    const strained = test([{ type: "OR", conditions: MOON.blood.when }], ctx) && !test([{ type: "OR", conditions: MOON.blood.unless || [] }], ctx);
    const toFull = nightsToFull(night);
    const prev = S("moon") || {};
    state.set("moon", {
      day: lunarDay(night), phase: phase.id, toFull,
      omen: toFull === 1 ? strained : toFull === 0 ? !!prev.omen : false,
      blood: phase.id === "full" && strained,
    });
  }

  function dusk(night) {
    state.set("night", night);
    updateMoon(night);
    syncEcology();
    const fired = scenario.evaluate(night);
    for (const f of fired) apply([{ type: "feed", text: f.headline, tone: f.tone }], ctx);
    state.set("dusk", fired);
    notice(night);
    if (night >= TOWN.nights) {
      state.set("hand", []);
      state.set("actionsLeft", 0);
      state.set("phase", "reckoning");
      return;
    }
    deal();
    state.set("actionsLeft", TOWN.actionsPerNight);
    state.set("phase", "evening");
  }

  // what you notice at dusk: the case's own signs, and where the old ones are thickest
  function notice(night) {
    const add = [];
    if ([2, 5].includes(night)) for (const s of theCase.signs) add.push({ species: s.species, text: s.text, sign: true });
    if (night > 1) {
      const quarters = S("readings.quarters") || {};
      const before = new Set(S("sightings").map((s) => `${s.species}@${s.q}`));
      const best = [];
      for (const [q, counts] of Object.entries(quarters)) for (const [k, n] of Object.entries(counts)) best.push({ q, k, n });
      best.sort((a, b) => b.n - a.n);
      const fresh = best.filter((b) => !before.has(`${b.k}@${b.q}`) && (b.q !== "centre" || b.k === "halo-eyed-seraph"));
      const picked = [];
      for (const b of fresh) if (picked.length < (S("insight") >= 3 ? 2 : 1) && !picked.some((p) => p.k === b.k)) picked.push(b);
      for (const b of picked) {
        const o = OLD_ONE_BY_KEY[b.k];
        if (o) add.push({ species: b.k, q: b.q, text: `${o.name.charAt(0).toUpperCase() + o.name.slice(1)}, thick over ${quarterName(b.q)}.` });
      }
    }
    if (!add.length) return;
    state.update("sightings", (list) => [...list, ...add.map((s, i) => ({ ...s, night, id: `${night}-${i}` }))]);
  }

  function deal() {
    const av = S("available"), fresh = new Set(S("fresh"));
    const pool = [
      ...av.people.map((id) => ({ ref: `person:${id}`, w: id === "witness" || id === "kin" ? 2 : 1.4, person: true })),
      ...av.places.map((id) => ({ ref: `place:${id}`, w: S("searched").includes(id) ? 0.4 : id.startsWith("case:") ? 3 : 1 })),
    ];
    if (S("insight") >= WATCHER.insightNeeded) pool.push({ ref: "person:watcher", w: 1.6, person: true });
    const hand = [...fresh].map((id) => (S("available.people").includes(id) ? `person:${id}` : `place:${id}`)).slice(0, 2);
    const draw = (filter) => {
      const opts = pool.filter((p) => filter(p) && !hand.includes(p.ref));
      const total = opts.reduce((a, p) => a + p.w, 0);
      let r = rng() * total;
      for (const p of opts) { r -= p.w; if (r <= 0) return hand.push(p.ref); }
    };
    const people = () => hand.filter((r) => r.startsWith("person:")).length, places = () => hand.length - people();
    while (people() < 2 && pool.some((p) => p.person && !hand.includes(p.ref))) draw((p) => p.person);
    while (places() < 2 && pool.some((p) => !p.person && !hand.includes(p.ref))) draw((p) => !p.person);
    while (hand.length < Math.min(TOWN.handSize, pool.length)) draw(() => true);
    state.set("hand", hand);
    state.set("fresh", []);
  }

  function personCard(id) {
    const p = people[id];
    return { ref: `person:${id}`, kind: "person", id, name: p.name, role: p.role, quarter: p.quarter, initials: p.initials };
  }
  function placeCard(id) {
    const p = PLACE_BY_ID[id] || S("case").places.find((x) => x.id === id);
    return { ref: `place:${id}`, kind: "place", id, name: p.name, blurb: p.blurb, quarter: p.quarter, caseOnly: !!p.caseOnly };
  }
  function card(ref) {
    const [kind, ...rest] = ref.split(":"), id = rest.join(":");
    return kind === "person" ? personCard(id) : placeCard(id);
  }

  // play a card from tonight's hand: a person to talk to, or a place to search
  function play(ref) {
    if (S("phase") !== "evening" || S("actionsLeft") <= 0 || !S("hand").includes(ref)) return null;
    state.update("hand", (h) => h.filter((x) => x !== ref));
    state.update("actionsLeft", (n) => n - 1);
    const c = card(ref);
    if (c.kind === "person") return { kind: "talk", talk: new Talk(people[c.id], talkApi) };
    return { kind: "search", result: search(c.id) };
  }

  function cellsOf(place) {
    if (place.quarter === "centre") return town.cells.filter((c) => c.ring <= 1);
    if (place.id === "groves") return town.cells.filter((c) => c.zone === "garden");
    if (place.id === "wall") return town.cells.filter((c) => c.zone === "wall");
    return town.cells.filter((c) => c.quarter === place.quarter);
  }

  function search(placeId) {
    const place = PLACE_BY_ID[placeId] || S("case").places.find((x) => x.id === placeId);
    state.update("searched", (s) => (s.includes(placeId) ? s : [...s, placeId]));
    const names = [], seen = new Set();
    for (const c of cellsOf(place)) {
      const t = town.tileAt(c.id);
      const label = t.building ? BUILDING_BY_ID[t.building].name : ["shrine", "water", "civic", "tower"].includes(t.kind) ? t.name : null;
      if (label && !seen.has(label)) { seen.add(label); names.push({ label, building: !!t.building }); }
    }
    names.sort((a, b) => b.building - a.building);
    const counts = place.quarter ? S(`readings.quarters.${place.quarter}`) || {} : S("readings.live") || {};
    const near = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => ({ key: k, name: OLD_ONE_BY_KEY[k]?.name || k, n }));
    let word = null;
    for (const w of place.words || []) {
      const r = seeWord(w, `place:${placeId}`);
      if (r.kind !== "again") { word = { id: w, r }; break; }
    }
    const finds = [];
    for (const f of theCase.facts.filter((f) => f.holder === `place:${placeId}` && !revealed(f.id))) {
      finds.push({ says: f.says, ...reveal(f, `place:${placeId}`, "searched") });
    }
    return { place, stands: names.slice(0, 4), near, word, finds };
  }

  async function endNight(onProgress) {
    if (S("phase") !== "evening") return;
    state.set("phase", "passing");
    state.set("hand", []);
    await eco.fastForward(6, onProgress);
    takeReadings();
    runHunger();
    syncEcology();
    dusk(S("night") + 1);
  }

  // ── what you know ───────────────────────────────────────────
  function revealed(id) { return S("clues").some((c) => c.id === id); }

  function reveal(fact, holder, how) {
    if (revealed(fact.id)) return { clue: fact.clue, notes: [] };
    const notes = [];
    state.update("clues", (list) => [...list, { id: fact.id, text: fact.clue, holder, night: S("night"), how }]);
    if (fact.introduces) {
      const isPerson = !!people[fact.introduces];
      const list = isPerson ? "people" : "places";
      if (!S(`available.${list}`).includes(fact.introduces)) {
        state.update(`available.${list}`, (l) => [...l, fact.introduces]);
        state.update("fresh", (l) => [...l, fact.introduces]);
        const name = isPerson ? people[fact.introduces].name : S("case").places.find((p) => p.id === fact.introduces)?.name;
        notes.push(`New lead: ${name}. ${isPerson ? "They" : "It"} will turn up in your hand.`);
      }
    }
    if (fact.found && !S("found")) {
      state.set("found", true);
      apply([{ type: "flag", value: "found" }, { type: "dread", delta: -3 }, { type: "feed", text: `${theCase.V.name} was found alive.`, tone: "grace" }], ctx);
      notes.push(`${theCase.V.first} is alive. You bring ${theCase.V.obj} home.`);
      return { clue: fact.clue, notes, found: true };
    }
    return { clue: fact.clue, notes };
  }

  function seeWord(id, source) {
    const lex = S("lexicon") || {};
    const e = lex[id];
    let r;
    if (!e) {
      const reading = rng() < 0.7 ? id : WORD_BY_ID[id].decoy;
      state.set(`lexicon.${id}`, { reading, sure: false, sources: [source] });
      r = { kind: "new", reading };
    } else if (!e.sources.includes(source)) {
      const was = e.reading;
      state.set(`lexicon.${id}`, { reading: id, sure: true, sources: [...e.sources, source] });
      r = !e.sure && was !== id ? { kind: "misread", was, reading: id } : { kind: e.sure ? "again" : "sure", reading: id };
    } else r = { kind: "again", reading: e.reading };
    state.set("insight", Object.keys(S("lexicon")).length);
    return r;
  }

  function collection() {
    const out = [];
    for (const c of S("clues")) out.push({ ref: `clue:${c.id}`, kind: "clue", title: c.text, night: c.night });
    for (const d of S("deductions")) out.push({ ref: `deduction:${d.id}`, kind: "deduction", title: d.text });
    for (const s of S("sightings")) out.push({ ref: `sighting:${s.species}`, kind: "sighting", title: s.text, night: s.night, species: s.species });
    for (const [id, e] of Object.entries(S("lexicon"))) out.push({ ref: `word:${id}`, kind: "word", word: id, title: `The word for “${meaning(e.reading)}”${e.sure ? "" : "?"}` });
    for (const id of S("met")) if (people[id]) out.push({ ref: `person:${id}`, kind: "person", title: people[id].name });
    for (const id of S("searched")) out.push({ ref: `place:${id}`, kind: "place", title: placeCard(id).name });
    S("memories").forEach((m, i) => out.push({ ref: `memory:${i}`, kind: "memory", factId: m.factId, title: `Remembered: ${m.text}` }));
    return out;
  }

  // two things you know, put together
  function combine(a, b) {
    const known = new Set([...S("clues").map((c) => c.id), ...S("deductions").map((d) => d.id)]);
    if (!known.has(a) || !known.has(b) || a === b) return { ok: false };
    const d = theCase.deductions.find((x) => x.needs.includes(a) && x.needs.includes(b));
    if (!d) return { ok: false, text: "They don't fit together. Not yet, anyway." };
    if (S("deductions").some((x) => x.id === d.id)) return { ok: false, text: "You've already put those together." };
    state.update("deductions", (l) => [...l, { id: d.id, text: d.text, key: d.id === theCase.key, night: S("night") }]);
    apply([{ type: "feed", text: `Deduced: ${d.text}`, tone: "case" }], ctx);
    return { ok: true, deduction: d };
  }

  // ── the full moon ───────────────────────────────────────────
  function accuse(causeId) {
    if (S("phase") !== "reckoning") return null;
    const correct = causeId === theCase.cause, found = S("found"), blood = !!S("moon.blood");
    let fragment = null;
    if (correct) {
      const solved = S("solved") + 1;
      state.set("solved", solved);
      fragment = QUESTIONS[Math.min(solved, QUESTIONS.length) - 1];
    }
    apply([{ type: "dread", delta: correct ? -2 : 2 }], ctx);
    // a blood moon takes someone: the one who went looking, or, if the lost were found, a witness
    const taken = blood ? (found ? theCase.W : theCase.K) : null;
    const verdict = { causeId, correct, found, blood, answer: theCase.answer, fragment, taken: taken ? { name: taken.name, first: taken.first } : null, why: explain() };
    state.set("verdict", verdict);
    state.update("history", (h) => [...h, { loop: S("loop"), victim: theCase.V.name, cause: theCase.cause, answer: theCase.answer, correct, found, blood, sentence: S("sentence") }]);
    state.set("phase", "writing");
    return verdict;
  }

  // the brain, read backwards: why this happened
  function explain() {
    return graph.causes("victim", 5).slice(1).map((layer) => layer.filter((n) => n.kind !== "fact").map((n) => ({ label: n.label, rel: n.rel, kind: n.kind, word: n.word })));
  }

  async function write(words, onProgress) {
    if (S("phase") !== "writing") return;
    const slots = sentenceSlots(S("lexicon"));
    const sentence = words.filter((w) => S(`lexicon.${w}`)).slice(0, slots);
    const v = S("verdict");
    const memories = [...S("memories"), ...S("clues").map((c) => ({ factId: c.id, text: c.text, loop: S("loop") }))].slice(-12);
    const taken = v?.taken ? (theCase.K.name === v.taken.name ? theCase.K : theCase.W) : null;
    const next = {
      version: 1, loop: S("loop") + 1, lexicon: S("lexicon"), memories, stance: S("stance"),
      sentence: sentence.length ? sentence : [...FIRST_SENTENCE],
      nextVictim: taken ? { first: taken.first, family: taken.family, pronIdx: taken.pronIdx } : null,
      solved: S("solved"), history: S("history"), lastCause: theCase.cause,
    };
    saveCarry(storage, next);
    await startLoop(next, onProgress);
  }

  async function reset(onProgress) {
    clearCarry(storage);
    await startLoop(freshCarry(), onProgress);
  }

  // ── what a conversation can reach ───────────────────────────
  const talkApi = {
    get case() { return { V: theCase.V }; },
    factsOf: (holder) => theCase.facts.filter((f) => f.holder === holder),
    revealed,
    reveal: (fact, holder, how) => reveal(fact, holder, how),
    lexicon: () => S("lexicon"),
    meaning,
    trust: (id) => S(`trust.${id}`) || 0,
    addTrust: (id, d) => { const t = Math.max(0, Math.min(3, (S(`trust.${id}`) || 0) + d)); state.set(`trust.${id}`, t); return t; },
    asked: (id, topic) => !!S(`asked.${id}.${topic}`),
    markAsked: (id, topic) => state.set(`asked.${id}.${topic}`, true),
    collection,
    roll: (trust, difficulty) => rollCheck(trust, difficulty),
    note: (text) => apply([{ type: "feed", text, tone: "plain" }], ctx),
    dread: (d) => apply([{ type: "dread", delta: d }], ctx),
    seeWord,
    exposeMisread: (id) => { state.set(`lexicon.${id}`, { ...S(`lexicon.${id}`), reading: id, sure: true }); return meaning(id); },
    watcherWord: () => [...theCase.words, ...WORDS.map((w) => w.id)].find((w) => !S(`lexicon.${w}`)) || null,
    ended: (id) => state.update("met", (m) => (m.includes(id) ? m : [...m, id])),
  };

  return {
    bus, state, ctx,
    get town() { return town; },
    get eco() { return eco; },
    get graph() { return graph; },
    get theCase() { return theCase; },
    startLoop, endNight, play, card, combine, accuse, write, reset, collection, explain, quarterOf, seeWord,
    cellsOfPlace: (id) => { const p = PLACE_BY_ID[id] || S("case")?.places.find((x) => x.id === id); return p && town ? cellsOf(p).map((c) => c.id) : []; },
    cellsOfQuarter: (q) => (town ? (q === "centre" ? town.cells.filter((c) => c.ring <= 1) : town.cells.filter((c) => c.quarter === q)).map((c) => c.id) : []),
    person: (id) => people[id],
    sentenceSlots: () => sentenceSlots(S("lexicon")),
    moonPhase: () => (S("moon")?.blood ? BLOOD_PHASE : phaseFor(S("night") || 1)),
    questions: () => QUESTIONS,
  };
}
