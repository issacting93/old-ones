// core/talk.js — talking to someone in Vesper.
//
// Mandate's conversation rules, rebuilt for a detective (see the design doc, "Talking to people"):
//   - Instead of a fixed script, you raise topics: the case, the person themselves, or a card you
//     show them. A visit lasts as long as their patience (three topics).
//   - What they say about the case comes from the facts this loop's case gave them
//     (content/cases.js). Surface facts come out when asked; hidden ones have to be drawn out.
//   - Sigil words are the lenses. When a hidden fact sits under what they just said and you know
//     the word for it, the word "interjects" and offers a follow-up question. If you misread the
//     word, the question comes out wrong, they look at you blankly, and the misreading is exposed.
//   - Listening raises their trust, and trust brings hidden facts out on its own. Pressing them
//     is a dice check (trust × 3 + 2d6 against 9); failing still tells you why they're guarded.
//   - Promising a fix before you understand ("I'll find her") is the one hard fail: trust drops,
//     dread rises, and the moment is lost.
//
// The game passes in `api` (game/engine.js makeTalkApi) so this file stays free of game state.
//
//   const t = new Talk(person, api)
//   t.log       everything said: { kind: npc | you | sigil | word | check | clue | aside | found }
//   t.choices   what you can do next: { kind, text, ... }
//   t.choose(i) do it
//   t.done

const PATIENCE = 3;
const PRESS_DIFFICULTY = 9;

export class Talk {
  constructor(person, api) {
    this.person = person;
    this.api = api;
    this.log = [];
    this.patience = person.id === "watcher" ? 1 : PATIENCE;
    this.choices = [];
    this.done = false;
    this.pending = null; // the exchange in progress, if any
    const t = api.trust(person.id);
    const greet = person.greet || [];
    this.log.push({ kind: "aside", text: greet[Math.min(t, greet.length - 1)] || "" });
    this.#menu();
  }

  get v() { return this.api.case.V; }

  // ── the topic menu ──────────────────────────────────────────
  #menu() {
    if (this.patience <= 0) return this.#end();
    const p = this.person, c = [];
    if (p.id === "watcher") {
      c.push({ kind: "watch", text: "Watch its halo." });
    } else {
      if (p.id !== this.api.case.V.id) c.push({ kind: "case", text: `Ask about ${this.v.first}.` });
      if (!this.api.asked(p.id, "self")) c.push({ kind: "self", text: p.selfPrompt || "Ask about them." });
      if (this.api.collection().length) c.push({ kind: "show", text: "Show them something." });
    }
    c.push({ kind: "leave", text: "Take your leave." });
    this.choices = c;
  }

  choose(i) {
    const ch = this.choices[i];
    if (!ch || this.done) return;
    if (ch.kind !== "card") this.log.push({ kind: "you", text: ch.text, tone: ch.kind });
    const fn = {
      case: () => this.#askCase(),
      self: () => this.#askSelf(),
      show: () => this.#showMenu(),
      card: () => this.#show(ch.card),
      back: () => this.#menu(),
      watch: () => this.#watch(),
      leave: () => this.#end(),
      sigil: () => this.#followSigil(ch),
      press: () => this.#press(),
      listen: () => this.#listen(),
      jump: () => this.#jump(),
    }[ch.kind];
    fn && fn();
  }

  #spend() {
    this.patience -= 1;
    this.pending = null;
    this.#menu();
  }

  // ── asking about the case ───────────────────────────────────
  #askCase() {
    const facts = this.api.factsOf(this.person.id).filter((f) => !this.api.revealed(f.id));
    const surface = facts.find((f) => !f.hidden);
    if (surface) {
      this.log.push({ kind: "npc", text: surface.says });
      this.#reveal(surface);
    } else {
      this.log.push({ kind: "npc", text: this.person.nothing });
    }
    this.#exchange(surface ? surface.concepts || [] : []);
  }

  // After they speak: sigil words interject, then you choose how to answer.
  #exchange(spokenConcepts) {
    const hidden = this.api.factsOf(this.person.id).filter((f) => f.hidden && !this.api.revealed(f.id));
    const choices = [];
    const heard = new Set();
    for (const f of hidden) {
      for (const w of f.concepts || []) {
        const entry = this.api.lexicon()[w];
        if (!entry || heard.has(w) || heard.size >= 2) continue;
        heard.add(w);
        const reading = this.api.meaning(entry.reading);
        const right = entry.reading === w;
        this.log.push({ kind: "sigil", word: w, reading, sure: entry.sure, text: `The word you read as “${reading}” moves under what ${this.person.pron || "they"} just said.` });
        choices.push({ kind: "sigil", word: w, fact: f, right, text: right ? f.ask : `Ask about ${reading}.` });
      }
    }
    if (hidden.length) choices.push({ kind: "press", text: "Press them on what they're not saying." });
    choices.push({ kind: "listen", text: "Say nothing. Let them go on." });
    choices.push({ kind: "jump", text: `I'll find ${this.v.first}. I promise you.` });
    this.pending = { spokenConcepts };
    this.choices = choices;
  }

  #followSigil(ch) {
    if (ch.right) {
      this.log.push({ kind: "npc", text: ch.fact.says });
      this.#reveal(ch.fact, "sigil");
      this.api.addTrust(this.person.id, 1);
    } else {
      const wrong = this.api.meaning(this.api.lexicon()[ch.word].reading);
      this.log.push({ kind: "npc", text: `They look at you blankly. “${capitalise(wrong)}? I didn't say anything about ${wrong}.”` });
      const r = this.api.exposeMisread(ch.word);
      this.log.push({ kind: "word", word: ch.word, text: `A misreading. From how they use it, the word doesn't mean “${wrong}”. It means “${r}”.` });
    }
    this.#spend();
  }

  #press() {
    const hidden = this.api.factsOf(this.person.id).filter((f) => f.hidden && !this.api.revealed(f.id));
    const r = this.api.roll(this.api.trust(this.person.id), PRESS_DIFFICULTY);
    this.log.push({ kind: "check", ...r, label: "Press" });
    if (r.passed && hidden[0]) {
      this.log.push({ kind: "npc", text: hidden[0].says });
      this.#reveal(hidden[0], "pressed");
    } else {
      this.log.push({ kind: "npc", text: this.person.guarded || "“You're not from here,” they say. “People who aren't from here ask, and then they leave.”" });
      this.api.addTrust(this.person.id, -1);
      this.api.note(`${this.person.name} won't be pushed by a stranger. Trust first.`);
    }
    this.#spend();
  }

  #listen() {
    const t = this.api.addTrust(this.person.id, 1);
    const ready = this.api.factsOf(this.person.id).find((f) => f.hidden && !this.api.revealed(f.id) && (f.need ?? 2) <= t);
    if (ready) {
      this.log.push({ kind: "aside", text: "You wait. After a while they go on." });
      this.log.push({ kind: "npc", text: ready.says });
      this.#reveal(ready, "listened");
    } else {
      this.log.push({ kind: "aside", text: "You wait. They look at you differently now, but they don't say more yet." });
    }
    this.#spend();
  }

  #jump() {
    this.log.push({ kind: "npc", text: this.person.jump || "“You haven't heard a word I said.”" });
    this.log.push({ kind: "aside", text: "You answered before you understood. Something was left unsaid." });
    this.api.addTrust(this.person.id, -1);
    this.api.dread(1);
    this.#spend();
  }

  // ── asking about them ───────────────────────────────────────
  #askSelf() {
    this.api.markAsked(this.person.id, "self");
    this.log.push({ kind: "npc", text: this.person.self });
    for (const w of this.person.shows || []) {
      const r = this.api.seeWord(w, `person:${this.person.id}`);
      if (r.kind === "again") continue;
      this.log.push({ kind: "word", word: w, text: wordLine(r, this.api.meaning) });
      break;
    }
    this.api.addTrust(this.person.id, 1);
    this.#spend();
  }

  // ── showing a card ──────────────────────────────────────────
  #showMenu() {
    const cards = this.api.collection();
    this.choices = [
      ...cards.slice().reverse().map((card) => ({ kind: "card", card, text: card.title })),
      { kind: "back", text: "Put it away." },
    ];
  }

  #show(card) {
    this.log.push({ kind: "you", text: `You show them: ${card.title}`, tone: "show" });
    const ref = card.ref;
    // evidence opens what trust can't
    const fact = this.api.factsOf(this.person.id).find((f) => !this.api.revealed(f.id) && (f.triggers || []).includes(ref));
    if (fact) {
      this.log.push({ kind: "npc", text: fact.says });
      this.#reveal(fact, "shown");
      return this.#spend();
    }
    if (card.kind === "memory") {
      this.api.addTrust(this.person.id, -1);
      this.log.push({ kind: "npc", text: this.person.reacts?.memory || "“How do you know that?”" });
      const same = this.api.factsOf(this.person.id).find((f) => !this.api.revealed(f.id) && f.id === card.factId);
      if (same) {
        this.log.push({ kind: "npc", text: same.says });
        this.#reveal(same, "remembered");
      }
      return this.#spend();
    }
    if (card.kind === "word" && (this.person.shows || []).includes(card.word)) {
      const r = this.api.seeWord(card.word, `person:${this.person.id}`);
      this.log.push({ kind: "npc", text: this.person.reacts?.word || "They know it." });
      if (r.kind !== "again") this.log.push({ kind: "word", word: card.word, text: wordLine(r, this.api.meaning) });
      return this.#spend();
    }
    this.log.push({ kind: "npc", text: this.person.reacts?.[card.kind] || this.person.reacts?.clue || "They shrug." });
    this.#spend();
  }

  // ── the Watcher ─────────────────────────────────────────────
  #watch() {
    this.log.push({ kind: "npc", text: this.person.says });
    const w = this.api.watcherWord();
    if (w) {
      const r = this.api.seeWord(w, "watcher");
      this.log.push({ kind: "word", word: w, text: wordLine(r, this.api.meaning) });
    } else {
      this.log.push({ kind: "aside", text: "It shows you nothing you have not already seen. It seems content to be looked at." });
    }
    this.#spend();
  }

  #reveal(fact, how) {
    const res = this.api.reveal(fact, this.person.id, how);
    this.log.push({ kind: res.found ? "found" : "clue", text: res.clue });
    for (const n of res.notes || []) this.log.push({ kind: "aside", text: n });
  }

  #end() {
    if (this.done) return;
    this.done = true;
    this.choices = [];
    this.log.push({ kind: "aside", text: this.patience <= 0 ? "They've said all they will for tonight." : "You leave them to their evening." });
    this.api.ended(this.person.id);
  }
}

function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function wordLine(r, meaning) {
  if (r.kind === "new") return `A new word. You read it as “${meaning(r.reading)}”, but you can't be sure yet.`;
  if (r.kind === "sure") return `You've seen this word before. Now you're sure: it means “${meaning(r.reading)}”.`;
  if (r.kind === "misread") return `You've seen this word before, and you had it wrong. It doesn't mean “${meaning(r.was)}”. It means “${meaning(r.reading)}”.`;
  return `You know this word: “${meaning(r.reading)}”.`;
}
