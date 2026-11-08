<script>
  // Reckoning — the full moon. Name what happened; see why, read back through the brain; then
  // write the sentence the next town grows from. A word does what it truly means, so a misread
  // word writes something you didn't intend.
  import { CASES } from "../content/cases.js";
  import { WORDS, WORD_BY_ID } from "../content/sigils.js";
  import Sigil from "./Sigil.svelte";
  import MoonGlyph from "./MoonGlyph.svelte";

  let { game, snap, onregrow } = $props();
  let chosen = $state(null);
  let sentence = $state([]);
  let writing = $state(false);

  const v = $derived(snap.verdict);
  const slots = $derived(game.sentenceSlots());
  const known = $derived(WORDS.filter((w) => snap.lexicon[w.id]));
  const reading = (id) => snap.lexicon[id]?.reading;
  const meaning = (id) => WORD_BY_ID[id]?.meaning;

  function accuse() { if (chosen) game.accuse(chosen); }
  function toggle(id) {
    if (sentence.length < slots) sentence = [...sentence, id];
  }
  function removeAt(i) { sentence = sentence.filter((_, j) => j !== i); }
  async function write() {
    writing = true;
    await onregrow(sentence);
  }
  const REL = { raised: "raised", fed: "fed", thinned: "thinned", starved: "starved", caused: "led to", invited: "invited", took: "took" };
</script>

<div class="overlay" role="dialog" aria-label="The full moon">
  <div class="sheet">
    <div class="head">
      <MoonGlyph index={4} blood={snap.moon.blood} size={36} glow />
      <div>
        <span class="label">Night 8 · {snap.moon.blood ? "Blood moon" : "Full moon"}</span>
        <h2>{v ? "What happened" : `Where is ${snap.case.V.first}?`}</h2>
      </div>
    </div>

    {#if !v}
      <p class="lead">The moon is full and the town will not last the night as it is. Name what happened to {snap.case.V.name}.</p>
      {#if snap.deductions.length}
        <div class="known">
          <span class="label">What you worked out</span>
          {#each snap.deductions as d (d.id)}<p>{d.text}</p>{/each}
        </div>
      {:else}
        <p class="hint">You haven't put anything together. You can still guess.</p>
      {/if}
      <div class="answers" role="radiogroup">
        {#each CASES as c (c.id)}
          <button role="radio" aria-checked={chosen === c.id} class:on={chosen === c.id} onclick={() => (chosen = c.id)}>{c.answer}</button>
        {/each}
      </div>
      <button class="btn primary" disabled={!chosen} onclick={accuse}>Say it at the Old Tower</button>
    {:else}
      <div class="verdict" class:right={v.correct}>
        <span class="label">{v.correct ? "You were right" : "You were wrong"}</span>
        <p class="big">{v.answer}</p>
        {#if v.found}<p>{snap.case.V.name} is home, and will not remember any of this in the next town.</p>
        {:else}<p>{snap.case.V.name} was never found.</p>{/if}
        {#if v.taken}<p class="blood">Under the blood moon, {v.taken.name} went out looking and did not come back. In the next town, {v.taken.first} will be the one who is missing.</p>{/if}
      </div>

      {#if v.why.length}
        <div class="why">
          <span class="label">Why it happened, read back through the town</span>
          <div class="chain">
            {#each [...v.why].reverse() as layer, i}
              <div class="layer">
                {#each layer as n}
                  <div class="node {n.kind}">
                    {#if n.kind === "word"}<Sigil word={n.word} size={30} />{/if}
                    <span>{n.label}</span>
                  </div>
                {/each}
                <span class="rel label">{REL[layer[0]?.rel] || ""} →</span>
              </div>
            {/each}
            <div class="layer"><div class="node person"><span>{snap.case.V.name}</span></div></div>
          </div>
        </div>
      {/if}

      {#if v.fragment}
        <div class="fragment">
          <span class="label">{v.fragment.question}</span>
          <p>{v.fragment.answer}</p>
        </div>
      {/if}

      <div class="write">
        <span class="label">Write your sentence · {sentence.length} of {slots} words</span>
        <p class="hint">The next town grows from these words, and from nothing else you did here. A word does what it truly means.</p>
        <div class="slots">
          {#each Array(slots) as _, i}
            {#if sentence[i]}
              <button class="slot filled" onclick={() => removeAt(i)} aria-label="Remove {meaning(reading(sentence[i]))}">
                <Sigil word={sentence[i]} size={52} glow />
                <span class="label">{meaning(reading(sentence[i]))}{snap.lexicon[sentence[i]].sure ? "" : "?"}</span>
              </button>
            {:else}
              <div class="slot"><Sigil size={52} state="unseen" /></div>
            {/if}
          {/each}
        </div>
        <div class="palette">
          {#each known as w (w.id)}
            {@const e = snap.lexicon[w.id]}
            <button class="word" disabled={sentence.length >= slots} onclick={() => toggle(w.id)}>
              <Sigil word={w.id} size={40} state={e.sure ? "sure" : "guess"} />
              <span>{meaning(e.reading)}{e.sure ? "" : "?"}</span>
              <span class="label">{WORD_BY_ID[e.reading].writes}</span>
            </button>
          {/each}
        </div>
        <button class="btn primary" disabled={!sentence.length || writing} onclick={write}>{writing ? "The town regrows…" : "Write it on the tower door"}</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(8, 7, 6, 0.82); display: grid; place-items: start center; overflow-y: auto; z-index: 60; padding-block: 32px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
  .sheet { width: min(760px, 100%); background: var(--panel); border: 1px solid var(--hair-2); padding: 26px 28px 30px; display: flex; flex-direction: column; gap: 18px; }
  .head { display: flex; gap: 14px; align-items: center; }
  h2 { font: 32px/1.05 var(--title); margin: 2px 0 0; font-weight: normal; text-wrap: balance; }
  p { margin: 0; }
  .lead { font-size: 20px; }
  .hint { color: var(--ink-3); font-style: italic; }
  .known { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid var(--hair); }
  .known p { color: var(--grace); }
  .answers { display: flex; flex-direction: column; gap: 6px; }
  .answers button { text-align: left; font-size: 19px; background: none; border: 1px solid var(--hair); padding: 10px 14px; cursor: pointer; color: var(--ink); }
  .answers button:hover, .answers button:focus-visible { border-color: var(--gold); outline: none; }
  .answers button.on { border-color: var(--gold); color: var(--gold); background: var(--ground-2); }
  .btn { align-self: flex-start; }
  .verdict { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border-left: 2px solid var(--omen); background: var(--ground-2); }
  .verdict.right { border-left-color: var(--grace); }
  .verdict .big { font: 24px/1.2 var(--title); }
  .blood { color: #d9654f; }
  .why { display: flex; flex-direction: column; gap: 10px; }
  .chain { display: flex; flex-wrap: wrap; gap: 8px; align-items: stretch; }
  .layer { display: flex; flex-direction: column; gap: 6px; justify-content: center; position: relative; padding-right: 54px; }
  .layer:last-child { padding-right: 0; }
  .rel { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); white-space: nowrap; color: var(--gold); }
  .node { display: flex; gap: 6px; align-items: center; padding: 6px 10px; border: 1px solid var(--hair-2); font-size: 15px; max-width: 220px; }
  .node.word { border-color: var(--gold); }
  .node.cause { border-color: var(--omen); }
  .node.person { border-color: var(--ink-2); font-family: var(--title); }
  .fragment { padding: 14px 16px; border: 1px solid var(--gold); display: flex; flex-direction: column; gap: 6px; }
  .fragment .label { color: var(--gold); }
  .fragment p { font-size: 20px; font-style: italic; }
  .write { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--hair); padding-top: 18px; }
  .slots { display: flex; gap: 10px; flex-wrap: wrap; }
  .slot { width: 92px; display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: 1px dashed var(--hair-2); padding: 8px 4px; color: var(--ink); }
  .slot.filled { border-style: solid; border-color: var(--gold); cursor: pointer; }
  .palette { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
  .word { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 8px; align-items: center; text-align: left; background: var(--ground-2); border: 1px solid var(--hair); padding: 8px 10px; cursor: pointer; color: var(--ink); font-size: 16px; }
  .word :global(svg) { grid-row: span 2; }
  .word .label { text-transform: none; letter-spacing: 0.02em; font-size: 10.5px; }
  .word:hover:not(:disabled), .word:focus-visible { border-color: var(--gold); outline: none; }
  .word:disabled { opacity: 0.45; cursor: default; }
  @media (max-width: 600px) { .sheet { padding: 20px 16px; } .layer { padding-right: 0; padding-bottom: 22px; } .rel { top: auto; bottom: 2px; right: auto; left: 0; transform: none; } }
</style>
