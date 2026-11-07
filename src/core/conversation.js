// core/conversation.js — Disco-style conversations, as plain logic with no UI attached.
//
// The script format is Mandate's conversations_v2.js (npc lines, lens interjections with
// follow-up questions, free choices with depth and solution-jump traps, lens checks that open
// a clue on a pass and different words on a fail). In Mandate the runner lived inside the
// ConversationOverlay.svelte component; here it is extracted so any view can drive it and it can
// be played in tests.
//
// What is new:
//   - scripts are split into `threads`, each with `requires` conditions (core/rules.js), so the
//     world — including the old ones — decides what a person has to say on a given night
//   - choices and threads can carry `effects`, so what you say can change the world back
//
// Usage:
//   const c = new Conversation(character, thread, { state, bus, roll })
//   c.log        everything said so far: { kind: 'npc'|'lens'|'you'|'check'|'clue'|'aside', ... }
//   c.choices    what you can say next (empty when c.done)
//   c.choose(i)  say it; appends to c.log and moves the conversation on
//   c.done, c.summary  { depth, clues, jumps } once finished

import { apply } from "./rules.js";

const MAX_INTERJECTIONS = 2;

export class Conversation {
  constructor(character, thread, { state, bus, roll }) {
    this.character = character;
    this.thread = thread;
    this.ctx = { state, bus };
    this.roll = roll;
    this.i = -1;
    this.depth = 0;
    this.jumps = 0;
    this.clues = [];
    this.log = [];
    this.choices = [];
    this.done = false;
    this.#next();
  }

  get exchange() { return this.thread.exchanges[this.i]; }
  get summary() { return { depth: this.depth, clues: this.clues, jumps: this.jumps }; }

  #lens(id) { return this.ctx.state.get(`lenses.${id}`) || 0; }

  #next() {
    this.i += 1;
    const ex = this.exchange;
    if (!ex) return this.#finish();
    this.log.push({ kind: "npc", text: ex.npc });

    // lens interjections: the deepest one each lens qualifies for, at most two, deepest first
    const best = new Map();
    for (const ij of ex.interjections || []) {
      if (this.#lens(ij.lens) < ij.minLevel) continue;
      const cur = best.get(ij.lens);
      if (!cur || ij.minLevel > cur.minLevel) best.set(ij.lens, ij);
    }
    const fired = [...best.values()].sort((a, b) => b.minLevel - a.minLevel).slice(0, MAX_INTERJECTIONS);
    for (const ij of fired) this.log.push({ kind: "lens", lens: ij.lens, level: ij.minLevel, text: ij.text });

    // lens checks: a pass opens a clue, a fail gives different words — never nothing
    for (const chk of ex.checks || []) {
      const r = this.roll(this.#lens(chk.lens), chk.difficulty);
      this.log.push({ kind: "check", lens: chk.lens, ...r });
      if (r.passed) {
        if (chk.pass.npc) this.log.push({ kind: "npc", text: chk.pass.npc });
        if (chk.pass.clue) this.#clue(chk.pass.clue, chk.lens);
        apply(chk.pass.effects, this.ctx);
      } else {
        if (chk.fail.npc) this.log.push({ kind: "npc", text: chk.fail.npc });
        if (chk.fail.clue) this.#clue(chk.fail.clue, chk.lens);
        apply(chk.fail.effects, this.ctx);
      }
    }

    this.choices = [
      ...fired.filter((ij) => ij.followUp).map((ij) => ({ text: ij.followUp, kind: "lens", lens: ij.lens, depth: 2, effects: ij.effects })),
      ...(ex.choices || []).map((c) => ({ ...c, kind: c.solutionJump ? "jump" : "free", depth: c.depth ?? 1 })),
    ];
    if (!this.choices.length) this.choices = [{ text: "Go on.", kind: "free", depth: 1 }];
  }

  choose(index) {
    const c = this.choices[index];
    if (!c || this.done) return;
    this.log.push({ kind: "you", text: c.text, lens: c.lens || null, jump: c.kind === "jump" });
    apply(c.effects, this.ctx);
    const ex = this.exchange;
    if (c.kind === "jump") {
      // Promising a fix before you have understood: they close up, and the exchange's clue is lost.
      this.jumps += 1;
      this.depth = Math.max(0, this.depth - 1);
      if (ex.jumpReply) this.log.push({ kind: "npc", text: ex.jumpReply });
      this.log.push({ kind: "aside", text: "You answered before you understood. Something was left unsaid." });
      apply([{ type: "dread", delta: 1 }], this.ctx);
    } else {
      this.depth += c.depth;
      if (c.reply) this.log.push({ kind: "npc", text: c.reply });
      if (ex.clue) this.#clue(ex.clue, c.lens);
    }
    if (c.end) return this.#finish();
    this.#next();
  }

  #clue(clue, lens) {
    const full = { ...clue, lens: clue.lens || lens || null, source: this.character.id };
    if (this.ctx.state.get("clues")?.some((k) => k.id === full.id)) return;
    apply([{ type: "clue", ...full }], this.ctx);
    this.clues.push(full);
    this.log.push({ kind: "clue", text: full.text, lens: full.lens });
  }

  #finish() {
    if (this.done) return;
    this.done = true;
    this.choices = [];
    apply(this.thread.onEnd, this.ctx);
    this.ctx.bus.emit("conversation.ended", { character: this.character.id, thread: this.thread.id, ...this.summary });
  }
}

// Which thread a character offers right now: the highest-priority thread whose conditions hold
// and that has not been heard yet. Repeatable threads (e.g. small talk) can be heard again.
export function pickThread(character, ctx, test) {
  const done = ctx.state.get("threadsDone") || [];
  return (character.threads || [])
    .filter((t) => (t.repeatable || !done.includes(t.id)) && test(t.requires, ctx))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0] || null;
}
