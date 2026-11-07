<script>
  // ConversationPanel — the evening's visit, Disco-style: the person speaks, the lenses you have
  // funded speak up, and you choose what to say. The logic is core/conversation.js; this only
  // draws it.
  import { LENSES, QUARTERS } from "../content/town.js";
  
  let { convo, onclose } = $props();
  let tick = $state(0);
  let scroller;

  const log = $derived((tick, convo.log.slice()));
  const choices = $derived((tick, convo.choices.slice()));
  const done = $derived((tick, convo.done));

  function choose(i) {
    convo.choose(i);
    tick++;
    queueMicrotask(() => scroller && (scroller.scrollTop = scroller.scrollHeight));
  }
  const lensName = (id) => LENSES[id]?.name || id;
  const lensColor = (id) => LENSES[id]?.color || "var(--ink-2)";
</script>

<aside class="panel">
  <header>
    <div class="who">
      <div class="badge">{convo.character.initials}</div>
      <div>
        <div class="name">{convo.character.name}</div>
        <div class="label">{convo.character.role} · {QUARTERS.find((q) => q.id === convo.character.quarter).name}</div>
      </div>
    </div>
    <div class="label thread">{convo.thread.title}</div>
  </header>

  <div class="log" bind:this={scroller}>
    {#each log as e, i (i)}
      {#if e.kind === "npc"}
        <p class="npc">{e.text}</p>
      {:else if e.kind === "lens"}
        <p class="lens" style="--c:{lensColor(e.lens)}"><span class="label" style="color:var(--c)">{lensName(e.lens)} {e.level}</span> {e.text}</p>
      {:else if e.kind === "you"}
        <p class="you">— {e.text}</p>
      {:else if e.kind === "check"}
        <p class="check" style="--c:{lensColor(e.lens)}">
          <span class="label" style="color:var(--c)">{lensName(e.lens)} check</span>
          <span class="dice"><b>{e.dice[0]}</b><b>{e.dice[1]}</b></span>
          <span class="label">{e.base} + {e.dice[0] + e.dice[1]} = {e.roll} against {e.target} · {e.passed ? "success" : "failure"}</span>
        </p>
      {:else if e.kind === "clue"}
        <p class="clue"><span class="label">Noted in the ledger</span>{e.text}</p>
      {:else if e.kind === "aside"}
        <p class="aside">{e.text}</p>
      {/if}
    {/each}
  </div>

  <footer>
    {#if !done}
      {#each choices as c, i (i)}
        <button class="choice" style="--c:{c.lens ? lensColor(c.lens) : 'var(--ink-2)'}" onclick={() => choose(i)}>
          <span class="n">{i + 1}.</span>
          {#if c.lens}<span class="label" style="color:var(--c)">{lensName(c.lens)}</span>{/if}
          <span>{c.text}</span>
        </button>
      {/each}
    {:else}
      <button class="btn primary" onclick={onclose}>Take your leave</button>
    {/if}
  </footer>
</aside>

<style>
  .panel {
    position: absolute; inset: 0 0 0 auto; width: min(460px, 100%); display: flex; flex-direction: column;
    background: var(--panel); border-left: 1px solid var(--hair); z-index: 20;
  }
  header { padding: 18px 20px 12px; border-bottom: 1px solid var(--hair); display: flex; flex-direction: column; gap: 10px; }
  .who { display: flex; gap: 12px; align-items: center; }
  .badge {
    width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid var(--gold); color: var(--gold);
    font: 16px var(--title); border-radius: 50%;
  }
  .name { font: 22px/1.1 var(--title); }
  .log { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
  p { margin: 0; }
  .npc { font-size: 19px; }
  .lens { padding-left: 10px; border-left: 2px solid var(--c); color: var(--ink-2); font-style: italic; }
  .lens .label { font-style: normal; margin-right: 6px; }
  .you { color: var(--gold); }
  .check { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 6px 10px; border: 1px solid var(--hair); }
  .dice { display: flex; gap: 3px; }
  .dice b { width: 20px; height: 20px; display: grid; place-items: center; border: 1px solid var(--ink-2); border-radius: 3px; font: 500 12px var(--mono); }
  .clue { padding: 8px 10px; border: 1px solid var(--hair-2); background: #1c1913; display: flex; flex-direction: column; gap: 4px; }
  .clue .label { color: var(--gold); }
  .aside { color: var(--omen); font-style: italic; }
  footer { padding: 12px 16px 18px; border-top: 1px solid var(--hair); display: flex; flex-direction: column; gap: 6px; }
  .choice {
    display: flex; gap: 8px; align-items: baseline; text-align: left; background: transparent; border: 0;
    padding: 6px 4px; cursor: pointer; color: var(--ink); font-size: 18px;
  }
  .choice:hover { color: var(--gold); }
  .choice .n { color: var(--ink-3); font: 12px var(--mono); }
</style>
