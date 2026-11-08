// tools/playtest.mjs — play loops headless, with no browser, to check the game holds together.
//
//   node tools/playtest.mjs [loops] [style]
//
// Styles are scripted detectives: "listener" listens, follows sigil words and shows evidence;
// "hasty" promises fixes and presses strangers. Prints each night's dusk, what was played and
// learned, and each full moon's reckoning, so a change to content can be checked in one log.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.window = globalThis;
for (const f of ["city-wfc.js", "ecology-species.slim.js", "ecology-sim.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(root, "public/vendor/forge", f), "utf8"), { filename: f });
}
const { createGame, freshCarry } = await import("../src/game/engine.js");
const { CASES } = await import("../src/content/cases.js");

const loops = Number(process.argv[2]) || 2;
const style = process.argv[3] || "listener";
let seed = 11;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random; // dice

const memory = new Map();
const storage = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) };
const g = createGame({ CityWFC: window.CityWFC, EcologySim: window.EcologySim, EcologySpecies: window.EcologySpecies, storage, random });
const S = (p) => g.state.get(p);

function talkThrough(talk) {
  let guard = 0;
  while (!talk.done && guard++ < 40) {
    const ch = talk.choices;
    const find = (k) => ch.findIndex((c) => c.kind === k);
    let i;
    if (style === "hasty") i = [find("jump"), find("press"), find("case"), find("leave")].find((x) => x >= 0);
    else {
      // listen first; ask about the case; follow sigils; show the freshest evidence once
      const shown = talk.log.some((l) => l.tone === "show");
      i = [find("sigil"), find("case") >= 0 && !talk.log.some((l) => l.tone === "case") ? find("case") : -1, find("listen"), !shown ? find("show") : -1, find("self"), find("watch"), find("leave")].find((x) => x >= 0);
      if (ch[i]?.kind === "show") {
        talk.choose(i);
        const cards = talk.choices;
        const pickIdx = cards.findIndex((c) => c.card && ["sighting", "clue"].includes(c.card.kind));
        talk.choose(pickIdx >= 0 ? pickIdx : cards.length - 1);
        continue;
      }
    }
    talk.choose(i ?? ch.length - 1);
  }
  return talk;
}

function tryDeductions() {
  const ids = [...S("clues").map((c) => c.id), ...S("deductions").map((d) => d.id)];
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
    const r = g.combine(ids[a], ids[b]);
    if (r.ok) console.log(`    deduced · ${r.deduction.text}`);
  }
}

await g.startLoop(freshCarry());
for (let L = 0; L < loops; L++) {
  const c = g.theCase;
  console.log(`\n████ loop ${S("loop")} · sentence: ${S("sentence").join(" ")} · built: ${S("built").map((b) => b.kind).join(", ")}`);
  console.log(`  case: ${c.cause} (scores ${c.score.map((x) => x.join(" ")).join(", ")}) · ${c.V.name}, ${c.V.role} · reported by ${c.K.name} (${c.K.rel}) · quarter ${c.Q}`);
  while (S("phase") === "evening") {
    console.log(`\n  ── night ${S("night")} · ${g.moonPhase().name} · dread ${S("dread")} · insight ${S("insight")}`);
    for (const d of S("dusk")) console.log(`    dusk · ${d.headline}`);
    for (const s of S("sightings").filter((s) => s.night === S("night"))) console.log(`    seen · ${s.text}`);
    console.log(`    hand · ${S("hand").map((r) => g.card(r).name).join(" | ")}`);
    // play: prefer fresh leads and the case's own places, then people
    const rank = (ref) => (ref.includes("case:") ? 5 : ref === "person:witness" ? 4 : ref === "person:kin" ? 3 : ref.startsWith("person:") ? 2 : 1);
    for (let a = 0; a < 2; a++) {
      const ref = [...S("hand")].sort((x, y) => rank(y) - rank(x))[0];
      if (!ref) break;
      const before = S("clues").length;
      const r = g.play(ref);
      if (r.kind === "talk") {
        talkThrough(r.talk);
        const jumps = r.talk.log.filter((l) => l.tone === "jump").length;
        console.log(`    talk · ${r.talk.person.name}: +${S("clues").length - before} clue${jumps ? `, ${jumps} jump` : ""}${r.talk.log.filter((l) => l.kind === "word").map((l) => ` [word ${l.word}]`).join("")}`);
      } else {
        const res = r.result;
        console.log(`    search · ${res.place.name}: ${res.stands.map((s) => s.label).join(", ") || "nothing of note"}; near: ${res.near.map((n) => n.name).join(", ")}${res.word ? ` [word ${res.word.id}: ${res.word.r.kind}]` : ""}${res.finds.map((f) => ` FIND: ${f.clue}`).join("")}`);
      }
    }
    tryDeductions();
    await g.endNight();
  }
  console.log(`\n  ── night 8 · ${g.moonPhase().name} · dread ${S("dread")}`);
  for (const d of S("dusk")) console.log(`    dusk · ${d.headline}`);
  const key = S("deductions").find((d) => d.key);
  const answer = key ? c.cause : CASES[Math.floor(random() * CASES.length)].id;
  const v = g.accuse(answer);
  console.log(`  reckoning · named ${answer}: ${v.correct ? "right" : "wrong"} · found ${v.found} · blood ${v.blood} · taken ${v.taken?.name || "nobody"}`);
  if (v.fragment) console.log(`  answered · ${v.fragment.question} — ${v.fragment.answer}`);
  console.log(`  why · ${v.why.map((layer) => layer.map((n) => `${n.label}${n.rel ? ` (${n.rel})` : ""}`).join(" + ")).join("  ←  ")}`);
  const lex = S("lexicon");
  console.log(`  lexicon · ${Object.entries(lex).map(([w, e]) => `${w}${e.reading !== w ? `→misread as ${e.reading}` : ""}${e.sure ? "" : "?"}`).join(", ")} · slots ${g.sentenceSlots()}`);
  // write: the words you're sure of that keep the old ones fed and the water still
  const prefer = ["water", "light", "kin", "tower", "open", "sleep", "take", "iron", "hunger", "fire"];
  const words = prefer.filter((w) => lex[w]).slice(0, g.sentenceSlots());
  console.log(`  writes · ${words.join(" ")}${words.some((w) => lex[w].reading !== w) ? " (with a misreading in it)" : ""}`);
  await g.write(words);
}
