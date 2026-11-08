// game/case.js — the mystery generator.
//
// Reads the world a sentence grew (which buildings stand, which old ones thrive or starve),
// scores every cause in content/cases.js against it, picks one, and fills the cause's
// templates with this loop's people. Also writes the causal chain into the brain (core/graph.js):
// sentence words → buildings → species → the cause → the person who vanished → who knows what.

import { CASES } from "../content/cases.js";
import { FIRST, FAMILY, PRONOUNS, KIN, WITNESSES, GENERIC } from "../content/townsfolk.js";
import { QUARTERS } from "../content/town.js";
import { WORD_BY_ID } from "../content/sigils.js";
import { BUILDING_BY_ID } from "../content/buildings.js";
import { OLD_ONE_BY_KEY } from "../content/old-ones.js";

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pickOf = (rng, list) => list[Math.floor(rng() * list.length)];

function person(rng, used, base = {}) {
  let first = base.first, family = base.family;
  while (!first || used.has(first)) first = pickOf(rng, FIRST);
  if (!family) family = pickOf(rng, FAMILY);
  used.add(first);
  const pr = PRONOUNS[base.pronIdx ?? Math.floor(rng() * PRONOUNS.length)];
  return { first, family, name: `${first} ${family}`, ...pr, Pron: cap(pr.pron), pronIdx: PRONOUNS.indexOf(pr), initials: first[0] + family[0] };
}

// world: { share, hungry, built: {kind: n}, busiest, pressQuarter, words: {word: n} }
export function generateCase({ world, rng, carryVictim, avoidCause }) {
  const scored = CASES.map((c) => ({ c, s: c.score(world) + rng() * 0.8 - (c.id === avoidCause ? 0.7 : 0) })).sort((a, b) => b.s - a.s);
  const cause = scored[0].c;
  const used = new Set();
  const vr = pickOf(rng, cause.victimRoles);
  const V = { ...person(rng, used, carryVictim || {}), id: "victim", ...vr };
  const kp = person(rng, used, { family: V.family });
  const K = { ...kp, id: "kin", rel: pickOf(rng, KIN[kp.pron]) };
  const wit = pickOf(rng, WITNESSES);
  const W = { ...person(rng, used), id: "witness", role: wit.role, intro: wit.line };
  const q = cause.quarter(world);
  const Q = QUARTERS.find((x) => x.id === q)?.name || "town";
  const c = { V, K, W, q, Q };

  const placeId = (local) => `case:${local}`;
  const places = cause.places.map((p) => ({ id: placeId(p.id), name: p.name(c), quarter: p.quarter(c), blurb: p.blurb, words: [], caseOnly: true }));
  const holderOf = (h) => (h.startsWith("place:") && cause.places.some((p) => `place:${p.id}` === h) ? `place:${placeId(h.slice(6))}` : h);
  const introOf = (i) => (i?.startsWith("place:") ? placeId(i.slice(6)) : i);

  const facts = cause.facts.map((f) => ({
    id: f.id,
    holder: holderOf(f.holder),
    hidden: !!f.hidden,
    need: f.need ?? 2,
    says: f.says(c),
    clue: f.clue(c),
    concepts: f.concepts || [],
    ask: f.ask || "",
    triggers: f.triggers || [],
    introduces: introOf(f.introduces),
    found: !!f.found,
  }));
  const deductions = cause.deductions.map((d) => ({ id: d.id, needs: d.needs, text: d.text(c) }));
  const signs = cause.signs.map((s) => ({ species: s.species, text: s.text(c) }));

  // generated people, voiced generically, with their own few lines
  const kin = {
    ...K, role: `${V.first}'s ${K.rel}`, quarter: q, kind: "kin", ...GENERIC,
    greet: [`${K.first} has the look of someone who hasn't slept since ${V.first} went.`, `${K.first} is glad to see you, and tries not to show how glad.`, `${K.first} puts the kettle on before you've knocked.`, `${K.first} talks to you like family now.`],
    selfPrompt: `Ask about ${V.first}'s life.`,
    self: `${V.first} was a ${V.role}. ${V.Pron} used to ${V.habit}, every night the same. Never missed a night in nine years. ${V.Pron} wasn't one for the shrines, or the stories. ${V.Pron} said the old ones never bothered anyone who minded their own business.`,
    jump: "Don't. Everyone promises. Just find out what happened.",
  };
  const witness = {
    ...W, quarter: q, kind: "witness", ...GENERIC,
    selfPrompt: "Ask what they do at night.",
    self: `${W.intro} You see things, doing that. You learn not to say.`,
    jump: "You don't even know what you're promising.",
  };
  return { cause: cause.id, answer: cause.answer, words: cause.words, key: cause.key, V, K: kin, W: witness, q, Q, facts, deductions, signs, places, score: scored.map((x) => [x.c.id, +x.s.toFixed(2)]) };
}

// Write the loop's causal chain into the brain.
export function writeBrain(graph, { sentence, built, share, hungry, theCase }) {
  const counts = {};
  for (const w of sentence) counts[w] = (counts[w] || 0) + 1;
  for (const [w, n] of Object.entries(counts)) graph.add(`word:${w}`, { kind: "word", word: w, label: `“${WORD_BY_ID[w].meaning}”${n > 1 ? ` ×${n}` : ""}` });

  const byKind = {};
  for (const b of built) (byKind[b.kind] ||= []).push(b.quarter);
  for (const [kind, qs] of Object.entries(byKind)) {
    const name = BUILDING_BY_ID[kind].name.toLowerCase();
    const plural = qs.length > 1 ? (name.endsWith("y") ? name.slice(0, -1) + "ies" : name + "s") : name;
    graph.add(`built:${kind}`, { kind: "built", label: qs.length > 1 ? `${qs.length} ${plural}` : `a ${name}` });
    for (const w of Object.keys(counts)) if ((WORD_BY_ID[w].rule.pins || []).some((p) => p.kind === kind)) graph.link(`word:${w}`, `built:${kind}`, "raised");
  }
  for (const [key, s] of Object.entries(share)) {
    if (Math.abs(s - 1) < 0.15 && !hungry[key]) continue;
    const name = OLD_ONE_BY_KEY[key]?.name || key;
    graph.add(`species:${key}`, { kind: "species", label: `${name} at ${Math.round(s * 100)}%` });
    for (const kind of Object.keys(byKind)) if ((BUILDING_BY_ID[kind].pop || {})[key]) graph.link(`built:${kind}`, `species:${key}`, BUILDING_BY_ID[kind].pop[key] < 1 ? "thinned" : "fed");
    for (const w of Object.keys(counts)) if ((WORD_BY_ID[w].rule.pop || {})[key]) graph.link(`word:${w}`, `species:${key}`, WORD_BY_ID[w].rule.pop[key] < 1 ? "thinned" : "fed");
  }
  for (const [key, n] of Object.entries(hungry)) {
    if (!n) continue;
    graph.add(`hungry:${key}`, { kind: "hungry", label: `${OLD_ONE_BY_KEY[key]?.name || key} going hungry` });
    for (const prey of { eel: ["wisp"], koi: ["wisp"], swift: ["wisp"], jelly: ["wisp", "swift", "moth"] }[key] || []) graph.link(`species:${prey}`, `hungry:${key}`, "starved");
  }

  const t = theCase;
  graph.add(`cause:${t.cause}`, { kind: "cause", label: t.answer });
  // what drove it: only the parts of the world that actually point this way
  const low = (k, v) => share[k] != null && share[k] < v, high = (k, v) => share[k] != null && share[k] > v;
  const DRIVERS = {
    eel: [low("wisp", 0.8) && "species:wisp", hungry.eel && "hungry:eel", "built:foundry", "built:lamphouse"],
    sleep: [low("koi", 0.9) && "species:koi", hungry.koi && "hungry:koi"],
    veils: ["built:harvest", high("jelly", 1.1) && "species:jelly"],
    ward: ["built:wardstone"],
    guest: [high("wisp", 1.15) && "species:wisp", "built:shrine"],
  };
  for (const d of (DRIVERS[t.cause] || []).filter(Boolean)) graph.link(d, `cause:${t.cause}`, "caused");
  // nothing in the town drove it: the words invited it, or it is the town's own oldest habit
  if (!graph.into(`cause:${t.cause}`).length) for (const w of Object.keys(counts)) if (t.words.includes(w)) graph.link(`word:${w}`, `cause:${t.cause}`, "invited");
  if (!graph.into(`cause:${t.cause}`).length) {
    graph.add("habit", { kind: "habit", label: "the town's oldest habit: nothing new drove it" });
    graph.link("habit", `cause:${t.cause}`, "caused");
  }
  graph.add("victim", { kind: "person", label: t.V.name });
  graph.link(`cause:${t.cause}`, "victim", "took");
  for (const f of t.facts) {
    graph.add(`fact:${f.id}`, { kind: "fact", label: f.clue, holder: f.holder });
    graph.link("victim", `fact:${f.id}`, "left");
  }
  return graph;
}
