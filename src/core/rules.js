// core/rules.js — the condition and effect language shared by events and conversations.
//
// Ported from Mandate's ScenarioSystem (systems/scenario.js), which had the same shape —
// `{ type, ... }` conditions with AND/OR/NOT, and `{ type, ... }` effects — but kept both lists
// closed inside the class and read NYC-specific district data. Here they are open registries
// that read only the StateStore, so new kinds of condition (the ecology ones below) are one
// entry each, and conversations can use the same language as events.
//
//   test(conditions, ctx)  -> boolean   (a list is an implicit AND; empty or missing is true)
//   apply(effects, ctx)                  (runs each effect in order)
//   ctx = { state, bus }
//
// Add a condition:  CONDITIONS.myThing = (c, ctx) => boolean
// Add an effect:    EFFECTS.myThing = (e, ctx) => { ... }

const get = (ctx, path, fallback) => ctx.state.get(path) ?? fallback;
const clamp = (v, lo = 0, hi = 10) => Math.max(lo, Math.min(hi, v));

export const CONDITIONS = {
  // time
  night: (c, ctx) => get(ctx, "night", 1) === c.value,
  nightAfter: (c, ctx) => get(ctx, "night", 1) > c.value,
  nightBefore: (c, ctx) => get(ctx, "night", 1) < c.value,

  // flags
  flag: (c, ctx) => get(ctx, "flags", []).includes(c.value),
  notFlag: (c, ctx) => !get(ctx, "flags", []).includes(c.value),

  // the town
  built: (c, ctx) => get(ctx, "built", []).filter((b) => b.kind === c.kind && (!c.quarter || b.quarter === c.quarter)).length >= (c.count || 1),
  notBuilt: (c, ctx) => !get(ctx, "built", []).some((b) => b.kind === c.kind && (!c.quarter || b.quarter === c.quarter)),
  coinAbove: (c, ctx) => get(ctx, "coin", 0) >= c.value,
  hopeAbove: (c, ctx) => get(ctx, "hope", 0) >= c.value,
  hopeBelow: (c, ctx) => get(ctx, "hope", 0) < c.value,
  dreadAbove: (c, ctx) => get(ctx, "dread", 0) >= c.value,
  dreadBelow: (c, ctx) => get(ctx, "dread", 0) < c.value,
  lens: (c, ctx) => get(ctx, `lenses.${c.lens}`, 0) >= (c.min ?? 1),

  // the old ones (readings are taken from the live sim at the end of every night)
  // share: live count as a share of the species' usual numbers (1 = as many as before the town grew)
  speciesBelow: (c, ctx) => get(ctx, `readings.share.${c.key}`, 1) < c.value,
  speciesAbove: (c, ctx) => get(ctx, `readings.share.${c.key}`, 1) >= c.value,
  inQuarter: (c, ctx) => get(ctx, `readings.quarters.${c.quarter}.${c.key}`, 0) >= (c.min ?? 1),
  absentFromQuarter: (c, ctx) => get(ctx, `readings.quarters.${c.quarter}.${c.key}`, 0) <= (c.max ?? 0),
  hungry: (c, ctx) => get(ctx, `eco.hungry.${c.key}`, 0) >= (c.nights ?? 1),
  intruding: (c, ctx) => get(ctx, `eco.intruders.${c.key}`, null) != null && (!c.quarter || get(ctx, `eco.intruders.${c.key}`) === c.quarter),

  // the town's stance toward the old ones
  stanceLeads: (c, ctx) => {
    const s = get(ctx, "stance", { kin: 1, ward: 1, bind: 1 });
    return Object.entries(s).sort((a, b) => b[1] - a[1])[0][0] === c.value;
  },
  stanceShare: (c, ctx) => {
    const s = get(ctx, "stance", { kin: 1, ward: 1, bind: 1 });
    return s[c.pull] / (s.kin + s.ward + s.bind) >= c.value;
  },

  // what you have learned and who you have heard
  clue: (c, ctx) => get(ctx, "clues", []).some((k) => k.id === c.value),
  clueCount: (c, ctx) => get(ctx, "clues", []).length >= c.value,
  talkedTo: (c, ctx) => (get(ctx, `talked.${c.character}`, 0)) >= (c.times ?? 1),
  threadDone: (c, ctx) => get(ctx, "threadsDone", []).includes(c.value),

  // the moon (state.moon is set at every dusk from content/moon.js)
  moonPhase: (c, ctx) => get(ctx, "moon.phase") === c.value,
  bloodMoon: (c, ctx) => !!get(ctx, "moon.blood", false),
  moonOmen: (c, ctx) => !!get(ctx, "moon.omen", false),
  nightsToFull: (c, ctx) => get(ctx, "moon.toFull", -1) === c.value,

  // combinators
  AND: (c, ctx) => (c.conditions || []).every((x) => evalOne(x, ctx)),
  OR: (c, ctx) => (c.conditions || []).some((x) => evalOne(x, ctx)),
  NOT: (c, ctx) => !evalOne(c.condition, ctx),
};

export const EFFECTS = {
  flag: (e, ctx) => ctx.state.update("flags", (f = []) => (f.includes(e.value) ? f : [...f, e.value])),
  removeFlag: (e, ctx) => ctx.state.update("flags", (f = []) => f.filter((x) => x !== e.value)),
  coin: (e, ctx) => ctx.state.update("coin", (v = 0) => Math.max(0, v + e.delta)),
  hope: (e, ctx) => ctx.state.update("hope", (v = 0) => clamp(v + e.delta)),
  dread: (e, ctx) => ctx.state.update("dread", (v = 0) => clamp(v + e.delta)),
  stance: (e, ctx) => ctx.state.update("stance", (s) => ({
    kin: s.kin + (e.kin || 0), ward: s.ward + (e.ward || 0), bind: s.bind + (e.bind || 0),
  })),
  lens: (e, ctx) => ctx.state.update(`lenses.${e.lens}`, (v = 0) => Math.min(3, v + (e.delta ?? 1))),
  clue: (e, ctx) => ctx.state.update("clues", (list = []) => list.some((k) => k.id === e.id) ? list
    : [...list, { id: e.id, text: e.text, lens: e.lens || null, source: e.source || null, night: get(ctx, "night", 1) }]),
  feed: (e, ctx) => ctx.state.update("feed", (list = []) => [...list, { night: get(ctx, "night", 1), text: e.text, tone: e.tone || "plain" }]),
  // multiply a species' population share (stacks with buildings' own multipliers)
  pop: (e, ctx) => ctx.state.update("eco.mult", (m = {}) => {
    const next = { ...m };
    for (const [k, v] of Object.entries(e.mult || {})) next[k] = (next[k] ?? 1) * v;
    return next;
  }),
  queue: (e, ctx) => ctx.bus.emit("scenario.queue", { eventId: e.event, delay: e.delay ?? 1 }),
};

function evalOne(c, ctx) {
  const fn = CONDITIONS[c.type];
  if (!fn) { console.warn(`rules: unknown condition '${c.type}'`); return false; }
  return !!fn(c, ctx);
}

export function test(conditions, ctx) {
  if (!conditions || !conditions.length) return true;
  return conditions.every((c) => evalOne(c, ctx));
}

export function apply(effects, ctx) {
  for (const e of effects || []) {
    const fn = EFFECTS[e.type];
    if (!fn) { console.warn(`rules: unknown effect '${e.type}'`); continue; }
    fn(e, ctx);
  }
}
