// core/scenario.js — events that fire at dusk when their conditions hold.
//
// Same model as Mandate's ScenarioSystem: each event has conditions and effects; events in a
// `pool` compete (one picked, weighted by priority); events without a pool all fire, highest
// priority first; `chains` queue follow-ups a number of nights later; an event fires once
// unless `repeatable`. Unlike Mandate, a chained event re-checks its own conditions when it
// comes due, and is dropped if they no longer hold. The difference is that conditions and effects come from core/rules.js,
// so anything the rules can read — including the old ones — can start an event.
//
// Listens for `night.start` and emits `scenario.triggered` for each event that fires.

import { test, apply } from "./rules.js";

export class ScenarioSystem {
  #bus; #state; #events; #fired = new Set(); #queued = [];

  constructor(bus, state, events) {
    this.#bus = bus;
    this.#state = state;
    this.#events = events;
    bus.on("night.start", ({ night }) => this.evaluate(night));
    bus.on("scenario.queue", ({ eventId, delay }) => this.#queued.push({ eventId, at: (state.get("night") || 1) + delay }));
  }

  get fired() { return [...this.#fired]; }

  evaluate(night) {
    const ctx = { state: this.#state, bus: this.#bus };
    const fired = [];

    const due = this.#queued.filter((q) => q.at <= night);
    this.#queued = this.#queued.filter((q) => q.at > night);
    for (const q of due) {
      const evt = this.#events.find((e) => e.id === q.eventId);
      // a chained event still has to make sense when it arrives: if it has conditions, they must hold
      if (evt && (!this.#fired.has(evt.id) || evt.repeatable) && test(evt.conditions, ctx)) fired.push(this.#trigger(evt, ctx));
    }

    const pools = new Map(), loose = [];
    for (const evt of this.#events) {
      if (this.#fired.has(evt.id) && !evt.repeatable) continue;
      if (evt.queuedOnly) continue;
      if (!test(evt.conditions, ctx)) continue;
      if (evt.pool) (pools.get(evt.pool) || pools.set(evt.pool, []).get(evt.pool)).push(evt);
      else loose.push(evt);
    }
    loose.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    for (const evt of loose) fired.push(this.#trigger(evt, ctx));
    for (const list of pools.values()) {
      const pick = weighted(list);
      if (pick) fired.push(this.#trigger(pick, ctx));
    }
    return fired;
  }

  #trigger(evt, ctx) {
    this.#fired.add(evt.id);
    apply(evt.effects, ctx);
    for (const ch of evt.chains || []) this.#queued.push({ eventId: ch.event, at: (this.#state.get("night") || 1) + ch.delay });
    const out = { eventId: evt.id, headline: evt.headline, narrative: evt.narrative, quarter: evt.quarter || null, tone: evt.tone || "plain" };
    this.#bus.emit("scenario.triggered", out);
    return out;
  }
}

function weighted(list) {
  const total = list.reduce((a, e) => a + (e.priority || 1), 0);
  let r = Math.random() * total;
  for (const e of list) { r -= e.priority || 1; if (r <= 0) return e; }
  return list[list.length - 1];
}
