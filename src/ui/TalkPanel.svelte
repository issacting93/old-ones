<script>
  // TalkPanel — a conversation (core/talk.js), drawn. Topics, the sigil words that move under
  // what someone says, checks, clues, and showing them a card from what you know.
  import { QUARTERS } from "../content/town.js";
  import Sigil from "./Sigil.svelte";

  let { talk, onclose } = $props();
  let tick = $state(0);
  let scroller;

  const log = $derived((tick, talk.log.slice()));
  const choices = $derived((tick, talk.choices.slice()));
  const done = $derived((tick, talk.done));
  const showing = $derived(choices.some((c) => c.kind === "card"));
  const patience = $derived((tick, talk.patience));

  function choose(i) {
    talk.choose(i);
    tick++;
    queueMicrotask(() => scroller && (scroller.scrollTop = scroller.scrollHeight));
  }
  const where = (q) => (q === "centre" ? "The Old Tower" : QUARTERS.find((x) => x.id === q)?.name || "");
  const KIND_LABEL = { clue: "Clue", deduction: "Deduction", sighting: "Sighting", word: "Word", person: "Person", place: "Place", memory: "Memory" };
</script>

<aside class="panel" aria-label="Conversation with {talk.person.name}">
  <header>
    <div class="badge" class:watcher={talk.person.id === "watcher"}>{talk.person.initials}</div>
    <div class="who">
      <div class="name">{talk.person.name}</div>
      <div class="label">{talk.person.role}{talk.person.quarter ? ` · ${where(talk.person.quarter)}` : ""}</div>
    </div>
    <div class="patience" title="Topics left before they've said all they will tonight">
      {#each Array(talk.person.id === "watcher" ? 1 : 3) as _, i}<span class:spent={i >= patience}></span>{/each}
    </div>
  </header>

  <div class="log" bind:this={scroller}>
    {#each log as e, i (i)}
      {#if e.kind === "npc"}
        <p class="npc">{e.text}</p>
      {:else if e.kind === "you"}
        <p class="you" class:jump={e.tone === "jump"}>— {e.text}</p>
      {:else if e.kind === "aside"}
        <p class="aside">{e.text}</p>
      {:else if e.kind === "sigil"}
        <div class="sigilnote">
          <Sigil word={e.word} size={40} state={e.sure ? "sure" : "guess"} glow />
          <p>{e.text}</p>
        </div>
      {:else if e.kind === "word"}
        <div class="wordnote">
          <Sigil word={e.word} size={52} glow />
          <p>{e.text}</p>
        </div>
      {:else if e.kind === "check"}
        <p class="check">
          <span class="label">{e.label}</span>
          <span class="dice"><b>{e.dice[0]}</b><b>{e.dice[1]}</b></span>
          <span class="label">trust {e.base / 3} × 3 + {e.dice[0] + e.dice[1]} = {e.roll} against {e.target} · {e.passed ? "they give way" : "they close up"}</span>
        </p>
      {:else if e.kind === "clue"}
        <p class="clue"><span class="label">Noted</span>{e.text}</p>
      {:else if e.kind === "found"}
        <p class="clue found"><span class="label">Found</span>{e.text}</p>
      {/if}
    {/each}
  </div>

  <footer>
    {#if !done}
      {#if showing}<div class="label pickhead">Show them…</div>{/if}
      <div class="choices" class:cards={showing}>
        {#each choices as c, i (i)}
          {#if c.kind === "card"}
            <button class="card {c.card.kind}" onclick={() => choose(i)}>
              <span class="label">{KIND_LABEL[c.card.kind]}</span>
              {#if c.card.kind === "word"}<Sigil word={c.card.word} size={28} />{/if}
              <span class="ctext">{c.text}</span>
            </button>
          {:else}
            <button class="choice {c.kind}" onclick={() => choose(i)}>
              {#if c.kind === "sigil"}<Sigil word={c.word} size={22} />{/if}
              <span>{c.text}</span>
            </button>
          {/if}
        {/each}
      </div>
    {:else}
      <button class="btn primary" onclick={onclose}>Back to the night</button>
    {/if}
  </footer>
</aside>

<style>
  .panel { position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--panel); z-index: 20; }
  header { padding: 16px 18px 12px; border-bottom: 1px solid var(--hair); display: flex; gap: 12px; align-items: center; }
  .badge { width: 40px; height: 40px; flex: none; display: grid; place-items: center; border: 1px solid var(--gold); color: var(--gold); font: 15px var(--title); border-radius: 50%; }
  .badge.watcher { font-size: 22px; }
  .who { flex: 1; min-width: 0; }
  .name { font: 22px/1.1 var(--title); }
  .patience { display: flex; gap: 4px; }
  .patience span { width: 7px; height: 7px; border-radius: 50%; background: var(--gold); }
  .patience span.spent { background: var(--hair-2); }

  .log { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
  p { margin: 0; }
  .npc { font-size: 19px; }
  .you { color: var(--gold); }
  .you.jump { color: var(--omen); }
  .aside { color: var(--ink-3); font-style: italic; }
  .sigilnote, .wordnote { display: flex; gap: 10px; align-items: center; color: var(--ink-2); font-style: italic; }
  .wordnote { padding: 8px 10px; border: 1px solid var(--hair-2); background: var(--ground-2); font-style: normal; color: var(--ink); }
  .check { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 6px 10px; border: 1px solid var(--hair); }
  .dice { display: flex; gap: 3px; }
  .dice b { width: 20px; height: 20px; display: grid; place-items: center; border: 1px solid var(--ink-2); border-radius: 3px; font: 500 12px var(--mono); }
  .clue { padding: 8px 10px; border: 1px solid var(--hair-2); background: var(--ground-2); display: flex; flex-direction: column; gap: 4px; }
  .clue .label { color: var(--gold); }
  .clue.found { border-color: var(--grace); }
  .clue.found .label { color: var(--grace); }

  footer { padding: 10px 14px 16px; border-top: 1px solid var(--hair); max-height: 45%; overflow-y: auto; }
  .pickhead { margin: 2px 4px 8px; }
  .choices { display: flex; flex-direction: column; gap: 2px; }
  .choice { display: flex; gap: 8px; align-items: center; text-align: left; background: transparent; border: 0; padding: 7px 6px; cursor: pointer; color: var(--ink); font-size: 18px; }
  .choice:hover, .choice:focus-visible { color: var(--gold); outline: none; }
  .choice.jump { color: var(--ink-2); }
  .choice.jump:hover { color: var(--omen); }
  .choice.sigil { color: var(--gold); }
  .choice.leave, .choice.back { color: var(--ink-3); font-size: 16px; }
  .choices.cards { gap: 6px; }
  .card { display: grid; grid-template-columns: auto auto 1fr; gap: 8px; align-items: center; text-align: left; background: var(--ground-2); border: 1px solid var(--hair); border-left: 2px solid var(--k, var(--hair-2)); padding: 7px 10px; cursor: pointer; color: var(--ink); font-size: 15px; }
  .card:hover, .card:focus-visible { border-color: var(--gold); outline: none; }
  .card .ctext { min-width: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .card.clue { --k: var(--gold); } .card.deduction { --k: var(--grace); } .card.sighting { --k: var(--kin-blue, #7fa6b8); }
  .card.word { --k: var(--ink-2); } .card.memory { --k: var(--bind); } .card.place, .card.person { --k: var(--hair-2); }
</style>
