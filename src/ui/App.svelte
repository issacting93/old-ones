<script>
  import TownView from "./TownView.svelte";
  import RouteView from "./RouteView.svelte";
  import TalkPanel from "./TalkPanel.svelte";
  import Reckoning from "./Reckoning.svelte";
  import StanceMark from "./StanceMark.svelte";
  import MoonGlyph from "./MoonGlyph.svelte";
  import Sigil from "./Sigil.svelte";
  import { gameStore } from "./store.js";
  import { TOWN, QUARTERS } from "../content/town.js";
  import { PHASES, BLOOD_PHASE, MOON, phaseFor } from "../content/moon.js";
  import { WORDS, WORD_BY_ID } from "../content/sigils.js";
  import { QUESTIONS } from "../content/lore.js";
  import { WATCHER } from "../content/characters.js";
  import { STANCES, readStance } from "../content/stance.js";

  let { game, firstVisit = false } = $props();
  const s = gameStore(game);

  let tab = $state("tonight");
  let talk = $state(null);
  let found = $state(null);
  let progress = $state(0);
  let regrow = $state(0);
  let showDusk = $state(true);
  let focus = $state([]);
  let pick = $state([]);
  let combineMsg = $state("");
  let started = $state(!firstVisit);
  let confirmReset = $state(false);

  // the map: the town staged Route Zero style, or the flat plan (remembered per browser)
  const VIEW_KEY = "old-ones.view";
  let view = $state((() => { try { return localStorage.getItem(VIEW_KEY) || "stage"; } catch { return "stage"; } })());
  let stageFailed = $state(false);
  function setView(v) { view = v; try { localStorage.setItem(VIEW_KEY, v); } catch {} }

  game.bus.on("regrow.progress", ({ p }) => (regrow = p));

  const ready = $derived(!!$s.case && $s.phase !== "regrowing");
  const night = $derived($s.night || 1);
  const moonIdx = $derived(Math.max(0, PHASES.findIndex((p) => p.id === $s.moon?.phase)));
  const moon = $derived($s.moon?.blood ? BLOOD_PHASE : PHASES[moonIdx]);
  const passing = $derived($s.phase === "passing");
  const reading = $derived(readStance($s.stance || { kin: 1, ward: 1, bind: 1 }));
  const hand = $derived(ready ? ($s.hand || []).map((r) => game.card(r)) : []);
  const tonight = $derived(($s.sightings || []).filter((x) => x.night === night));
  const quarterName = (q) => (q === "centre" ? "The Old Tower" : q ? QUARTERS.find((x) => x.id === q)?.name : "Across the town");
  const meaning = (id) => WORD_BY_ID[id]?.meaning;

  function play(ref) {
    const r = game.play(ref);
    if (!r) return;
    focus = [];
    if (r.kind === "talk") talk = r.talk;
    else found = r.result;
  }
  function hover(c) {
    if (!c) return (focus = []);
    focus = c.kind === "place" ? game.cellsOfPlace(c.id) : game.cellsOfQuarter(c.quarter);
  }
  async function endNight() {
    talk = null; found = null; progress = 0;
    await game.endNight((p) => (progress = p));
    showDusk = true;
  }
  function togglePick(id) {
    combineMsg = "";
    pick = pick.includes(id) ? pick.filter((x) => x !== id) : [...pick.slice(-1), id];
  }
  function combine() {
    const r = game.combine(pick[0], pick[1]);
    combineMsg = r.ok ? `You put it together: ${r.deduction.text}` : r.text || "Those don't fit together.";
    if (r.ok) pick = [];
  }
  async function regrowFrom(words) {
    regrow = 0;
    await game.write(words, (p) => (regrow = p));
    tab = "tonight"; pick = []; combineMsg = ""; showDusk = true;
  }
  async function beginAgain() {
    confirmReset = false; talk = null; found = null; regrow = 0;
    await game.reset((p) => (regrow = p));
    tab = "tonight"; pick = []; showDusk = true;
  }

  const almanac = $derived(Array.from({ length: TOWN.nights }, (_, i) => {
    const n = i + 1, ph = phaseFor(n), idx = PHASES.indexOf(ph), isFull = ph.id === "full";
    const blood = isFull && (n === night ? $s.moon?.blood : ($s.flags || []).includes("blood-omen"));
    const unknown = isFull && n > night && !($s.flags || []).includes("blood-omen") && ($s.insight || 0) < MOON.blood.foreseenAt;
    return { n, ph, idx, blood, unknown, past: n < night, now: n === night };
  }));
</script>

<div class="app">
  <header class="bar">
    <div class="title">
      <span class="town">{TOWN.name}</span>
      <span class="label">Loop {$s.loop || 1} · Night {night} of {TOWN.nights}</span>
    </div>
    {#if ready}
      <div class="moonnow" class:blood={$s.moon?.blood} title={moon.line}>
        <MoonGlyph index={moonIdx} blood={$s.moon?.blood} size={28} glow />
        <div>
          <div class="mname">{moon.name}</div>
          <span class="label">{$s.moon?.toFull > 0 ? `Full moon in ${$s.moon.toFull}` : "The reckoning"}</span>
        </div>
      </div>
      <div class="stats">
        <div title="How afraid the town is. High dread brings a blood moon."><span class="label">Dread</span><b class="dread">{$s.dread}</b></div>
        <div title="How much of the old ones you can perceive: one for every word you know."><span class="label">Insight</span><b>{$s.insight}</b></div>
        <div title="Cards you can still play tonight"><span class="label">Tonight</span><b class="acts">{#each Array(TOWN.actionsPerNight) as _, i}<i class:used={i >= $s.actionsLeft}></i>{/each}</b></div>
        <div class="stance" title={reading.line}><StanceMark stance={$s.stance} size={28} /><span class="label">{reading.label}</span></div>
      </div>
      <button class="btn primary end" disabled={$s.phase !== "evening" || !!talk} onclick={endNight}>{passing ? "The night passes…" : "End the night"}</button>
    {/if}
  </header>

  <main>
    <section class="map">
      {#if view === "stage" && !stageFailed}
        <RouteView {game} snap={$s} {focus} {progress} onfail={() => (stageFailed = true)} />
      {:else}
        <TownView {game} snap={$s} {focus} {progress} />
      {/if}
      {#if !stageFailed}
        <button class="viewswitch" onclick={() => setView(view === "stage" ? "plan" : "stage")}
          title={view === "stage" ? "See the town as a flat plan" : "See the town staged at night"}>{view === "stage" ? "Plan" : "Stage"}</button>
      {/if}
      {#if passing}
        <div class="passing"><span class="label">The night passes</span><div class="track"><div class="fill" style="width:{progress * 100}%"></div></div></div>
      {/if}
    </section>

    <aside class="side">
      <nav>
        {#each [["tonight", "Tonight"], ["case", "Case"], ["lexicon", "Lexicon"], ["ledger", "Ledger"]] as [id, label]}
          <button class:on={tab === id} onclick={() => (tab = id)}>{label}{#if id === "case" && ($s.clues || []).length}<span class="count">{$s.clues.length}</span>{/if}</button>
        {/each}
      </nav>

      <div class="content">
        {#if !ready}
          <p class="hint">The town is still growing.</p>

        {:else if tab === "tonight"}
          {#if $s.phase === "reckoning"}
            <div class="callout">
              <span class="label">The full moon</span>
              <p>The moon is up. There is nothing left to do but name what happened.</p>
              <button class="btn primary" onclick={() => (showDusk = false)}>Go to the Old Tower</button>
            </div>
          {:else}
            <div class="row"><h3 class="label">Tonight's hand</h3><span class="label">{$s.actionsLeft} of {TOWN.actionsPerNight} left</span></div>
            <div class="hand">
              {#each hand as c (c.ref)}
                <button class="hcard {c.kind}" class:lead={c.caseOnly || c.id === "witness"} disabled={$s.actionsLeft <= 0 || passing}
                  onclick={() => play(c.ref)} onmouseenter={() => hover(c)} onmouseleave={() => hover(null)} onfocus={() => hover(c)} onblur={() => hover(null)}>
                  <span class="kind label">{c.kind === "person" ? "Talk to" : "Search"}</span>
                  {#if c.kind === "person"}
                    <span class="badge" class:watcher={c.id === "watcher"}>{c.initials}</span>
                  {/if}
                  <span class="cname">{c.name}</span>
                  <span class="csub">{c.kind === "person" ? c.role : c.blurb}</span>
                  <span class="label">{quarterName(c.quarter)}</span>
                </button>
              {/each}
            </div>
            {#if $s.actionsLeft <= 0}<p class="hint">You've done what you can tonight. End the night when you're ready.</p>{/if}
          {/if}
          {#if tonight.length}
            <h3 class="label">Seen at dusk</h3>
            {#each tonight as x (x.id)}<p class="seen" class:sign={x.sign}>{x.text}</p>{/each}
          {/if}

        {:else if tab === "case"}
          <div class="missing">
            <span class="label">Missing</span>
            <div class="cname">{$s.case.V.name}</div>
            <div class="csub">{$s.case.V.role}, reported by {$s.case.K.name}, {$s.case.V.first}'s {$s.case.K.rel}</div>
            {#if $s.found}<div class="foundtag">Found alive</div>{/if}
          </div>
          <p class="hint">Choose two things you know to put them together.</p>
          {#if ($s.deductions || []).length}
            <h3 class="label">Worked out</h3>
            {#each $s.deductions as d (d.id)}
              <button class="item deduction" class:picked={pick.includes(d.id)} onclick={() => togglePick(d.id)}>{d.text}</button>
            {/each}
          {/if}
          <h3 class="label">Clues</h3>
          {#if !($s.clues || []).length}<p class="hint">Nothing yet. Go and listen.</p>{/if}
          {#each [...($s.clues || [])].reverse() as c (c.id)}
            <button class="item" class:picked={pick.includes(c.id)} onclick={() => togglePick(c.id)}><span class="label">Night {c.night}</span>{c.text}</button>
          {/each}
          {#if pick.length || combineMsg}
            <div class="combinebar">
              {#if combineMsg}<p class:hint={!combineMsg.startsWith("You put")} class="combinemsg">{combineMsg}</p>{/if}
              {#if pick.length}
                <button class="btn primary" disabled={pick.length < 2} onclick={combine}>{pick.length < 2 ? "Choose one more" : "Put these two together"}</button>
              {/if}
            </div>
          {/if}
          {#if ($s.memories || []).length}
            <h3 class="label">Remembered from other towns</h3>
            {#each $s.memories.slice().reverse() as m}
              <p class="memory"><span class="label">Loop {m.loop}</span>{m.text}</p>
            {/each}
          {/if}

        {:else if tab === "lexicon"}
          <p class="hint">Insight {$s.insight}. Every word you know lets you see more of the old ones. At {WATCHER.insightNeeded} the Watcher will come down to you. At 6 they notice you back.</p>
          <div class="lexicon">
            {#each WORDS as w (w.id)}
              {@const e = $s.lexicon?.[w.id]}
              <div class="lex" class:unseen={!e}>
                <Sigil word={w.id} size={64} state={e ? (e.sure ? "sure" : "guess") : "unseen"} />
                {#if e}
                  <span class="lmean">“{meaning(e.reading)}”{e.sure ? "" : "?"}</span>
                  <span class="label">{e.sure ? `Sure · seen in ${e.sources.length} places` : "A guess · seen once"}</span>
                {:else}
                  <span class="label">Not yet seen</span>
                {/if}
              </div>
            {/each}
          </div>
          <p class="hint">Your next sentence can hold {game.sentenceSlots()} words: two, and one more for every three you are sure of.</p>

        {:else}
          <h3 class="label">This month</h3>
          <div class="almanac">
            {#each almanac as a (a.n)}
              <div class="aday" class:now={a.now} class:past={a.past}><MoonGlyph index={a.idx} blood={a.blood} unknown={a.unknown} size={24} /><span class="label">{a.n}</span></div>
            {/each}
          </div>
          <h3 class="label">Where the town stands</h3>
          <div class="stancebig"><StanceMark stance={$s.stance} size={88} labels /><p class="hint">{reading.line}</p></div>
          <h3 class="label">The larger mystery</h3>
          {#each QUESTIONS as q, i}
            {#if i < ($s.solved || 0)}
              <div class="question done"><span class="label">{q.question}</span><p>{q.answer}</p></div>
            {:else if i === ($s.solved || 0)}
              <div class="question"><span class="label">Unanswered</span><p>{q.question}</p></div>
            {/if}
          {/each}
          {#if ($s.history || []).length}
            <h3 class="label">Towns you have known</h3>
            {#each [...$s.history].reverse() as h}
              <div class="past">
                <span class="label">Loop {h.loop} · written from {h.sentence.map((w) => `“${WORD_BY_ID[w].meaning}”`).join(" ")}</span>
                <p>{h.victim}: {h.correct ? h.answer : "never understood"}{h.found ? " Found alive." : ""}{h.blood ? " Blood moon." : ""}</p>
              </div>
            {/each}
          {/if}
          <h3 class="label">This loop</h3>
          {#each [...($s.feed || [])].reverse() as f, i (i)}<p class="feed {f.tone}">{f.text}</p>{/each}
          <div class="reset">
            {#if confirmReset}
              <p>Forget every town and every word, and start from the first loop?</p>
              <div class="row"><button class="btn" onclick={beginAgain}>Forget everything</button><button class="btn" onclick={() => (confirmReset = false)}>Keep playing</button></div>
            {:else}
              <button class="btn" onclick={() => (confirmReset = true)}>Begin again from the first loop</button>
            {/if}
          </div>
        {/if}
      </div>

      {#if talk}<TalkPanel {talk} onclose={() => (talk = null)} />{/if}
    </aside>
  </main>

  {#if found}
    <div class="overlay" role="dialog" aria-label="Searching {found.place.name}">
      <div class="card">
        <span class="label">You search</span>
        <h2>{found.place.name}</h2>
        <p class="hint">{found.place.blurb}</p>
        {#if found.stands.length}<div><span class="label">What stands here</span><p>{found.stands.map((x) => x.label).join(" · ")}</p></div>{/if}
        <div><span class="label">The old ones near</span><p>{found.near.length ? found.near.map((n) => n.name).join(", ") : "None tonight."}</p></div>
        {#if found.word}
          <div class="wordfind"><Sigil word={found.word.id} size={60} glow /><p>Carved here: {found.word.r.kind === "new" ? `a word you've never seen. You read it as “${meaning(found.word.r.reading)}”, but you can't be sure.` : found.word.r.kind === "misread" ? `a word you had wrong. It doesn't mean “${meaning(found.word.r.was)}”; it means “${meaning(found.word.r.reading)}”.` : `a word you'd seen once. Now you're sure: “${meaning(found.word.r.reading)}”.`}</p></div>
        {/if}
        {#each found.finds as f}
          <div class="find" class:alive={f.found}><p>{f.says}</p>{#each f.notes || [] as n}<p class="hint">{n}</p>{/each}</div>
        {/each}
        {#if !found.word && !found.finds.length}<p class="hint">Nothing here that wasn't here before.</p>{/if}
        <button class="btn primary" onclick={() => (found = null)}>Back to the night</button>
      </div>
    </div>
  {/if}

  {#if !started}
    <div class="overlay title" role="dialog" aria-label="The Old Ones">
      <div class="card">
        <span class="label">A gothic mystery in loops</span>
        <h1>The Old Ones</h1>
        <p>Vesper is a walled town built on water the old ones lived on long before anyone laid a stone. People there go missing. Each month you have eight nights to find out why, talking to people who have never met you, and learning the old ones' language one word at a time.</p>
        <p>At every full moon the town forgets. You don't. You write a sentence in their words on the tower door, and the next town grows from it.</p>
        <button class="btn primary" onclick={() => (started = true)}>Arrive</button>
      </div>
    </div>
  {:else if !ready}
    <div class="overlay" role="status">
      <div class="card regrow">
        <span class="label">{($s.loop || 1) === 1 ? "Arriving" : "The town regrows"}</span>
        <p>{($s.loop || 1) === 1 ? "The road comes over the last hill, and there is the wall." : "The streets grow back around the words you wrote."}</p>
        {#if ($s.sentence || []).length}<div class="sentence">{#each $s.sentence as w}<Sigil word={w} size={44} glow />{/each}</div>{/if}
        <div class="track"><div class="fill" style="width:{regrow * 100}%"></div></div>
      </div>
    </div>
  {:else if showDusk && ($s.phase === "evening" || $s.phase === "reckoning") && ($s.dusk.length || night === 1 || tonight.length)}
    <div class="overlay" role="dialog" aria-label="Dusk">
      <div class="card">
        <div class="duskhead"><MoonGlyph index={moonIdx} blood={$s.moon?.blood} size={22} glow /><span class="label">Dusk · night {night} · {moon.name}</span></div>
        {#if night === 1}<p class="arrival">{$s.arrival}</p>{/if}
        {#each $s.dusk as d (d.eventId)}
          <div class="event {d.tone}"><h2>{d.headline}</h2><p>{d.narrative}</p></div>
        {/each}
        {#if tonight.length}
          <div><span class="label">You notice</span>{#each tonight as x (x.id)}<p class="seen" class:sign={x.sign}>{x.text}</p>{/each}</div>
        {/if}
        <button class="btn primary" onclick={() => (showDusk = false)}>{$s.phase === "reckoning" ? "Go to the Old Tower" : "Go out into the town"}</button>
      </div>
    </div>
  {:else if !showDusk && ($s.phase === "reckoning" || $s.phase === "writing")}
    <Reckoning {game} snap={$s} onregrow={regrowFrom} />
  {/if}
</div>

<style>
  .app { height: 100%; display: flex; flex-direction: column; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); background: var(--ground); }
  .bar { display: flex; align-items: center; gap: 18px; padding-block: 10px; border-bottom: 1px solid var(--hair); flex-wrap: wrap; }
  .title { display: flex; flex-direction: column; }
  .town { font: 26px/1 var(--title); letter-spacing: 0.04em; }
  .moonnow { display: flex; gap: 10px; align-items: center; }
  .mname { font-size: 18px; line-height: 1.1; }
  .moonnow.blood .mname { color: #d9654f; }
  .stats { display: flex; gap: 18px; margin-left: auto; align-items: center; }
  .stats > div { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .stats b { font: 500 18px var(--mono); font-variant-numeric: tabular-nums; }
  .dread { color: var(--omen); }
  .acts { display: flex; gap: 4px; height: 22px; align-items: center; }
  .acts i { width: 9px; height: 9px; border-radius: 50%; background: var(--gold); }
  .acts i.used { background: var(--hair-2); }
  .stats .stance { flex-direction: row; gap: 8px; }

  main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 420px; }
  .map { position: relative; min-height: 0; min-width: 0; }
  .side { position: relative; border-left: 1px solid var(--hair); display: flex; flex-direction: column; min-height: 0; min-width: 0; background: var(--panel); }
  nav { display: flex; border-bottom: 1px solid var(--hair); }
  nav button { flex: 1; background: none; border: 0; padding: 12px 4px; font: 500 11px var(--mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); cursor: pointer; border-bottom: 1px solid transparent; }
  nav button.on { color: var(--gold); border-bottom-color: var(--gold); }
  .count { margin-left: 6px; color: var(--ink-2); }
  .content { flex: 1; overflow-y: auto; padding: 14px 18px 24px; display: flex; flex-direction: column; gap: 10px; }
  h3 { margin: 10px 0 0; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .hint { color: var(--ink-3); margin: 0; font-style: italic; }
  p { margin: 0; }

  .hand { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .hcard { position: relative; text-align: left; background: var(--ground-2); border: 1px solid var(--hair); padding: 10px 12px 12px; cursor: pointer; color: var(--ink); display: flex; flex-direction: column; gap: 4px; min-height: 132px; }
  .viewswitch { position: absolute; top: 12px; right: 12px; z-index: 6; font: 500 11px var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); background: rgba(13, 12, 11, .6); border: 1px solid var(--hair-2); padding: 6px 10px; cursor: pointer; backdrop-filter: blur(4px); }
  .viewswitch:hover, .viewswitch:focus-visible { border-color: var(--gold); color: var(--gold); outline: none; }
  .hcard:hover:not(:disabled), .hcard:focus-visible { border-color: var(--gold); outline: none; }
  .hcard:disabled { opacity: 0.4; cursor: default; }
  .hcard.lead { border-color: var(--gold); }
  .hcard .kind { color: var(--gold); }
  .hcard.place .kind { color: var(--ink-2); }
  .badge { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; display: grid; place-items: center; border: 1px solid var(--hair-2); border-radius: 50%; font: 12px var(--title); color: var(--ink-2); }
  .badge.watcher { font-size: 16px; color: var(--gold); border-color: var(--gold); }
  .cname { font: 19px/1.15 var(--title); padding-right: 28px; }
  .csub { color: var(--ink-2); font-size: 15px; line-height: 1.3; flex: 1; }
  .seen { padding: 6px 10px; border-left: 2px solid var(--hair-2); color: var(--ink-2); }
  .seen.sign { border-left-color: var(--gold); color: var(--ink); }
  .callout { display: flex; flex-direction: column; gap: 10px; padding: 14px; border: 1px solid var(--gold); }

  .missing { display: flex; flex-direction: column; gap: 3px; padding: 12px 14px; border: 1px solid var(--hair-2); background: var(--ground-2); }
  .foundtag { margin-top: 6px; color: var(--grace); font: 500 11px var(--mono); letter-spacing: 0.12em; text-transform: uppercase; }
  .item { text-align: left; background: none; border: 1px solid var(--hair); padding: 8px 10px; cursor: pointer; color: var(--ink); font-size: 16px; display: flex; flex-direction: column; gap: 3px; }
  .item:hover, .item:focus-visible { border-color: var(--hair-2); outline: none; }
  .item.deduction { border-left: 2px solid var(--grace); color: var(--grace); }
  .item.picked { border-color: var(--gold); background: var(--ground-2); }
  .memory { color: var(--ink-3); display: flex; flex-direction: column; gap: 2px; padding: 6px 0; border-bottom: 1px solid var(--hair); }
  .combinebar { position: sticky; bottom: -24px; padding: 12px 0; background: var(--panel); display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--hair); }
  .combinemsg { color: var(--grace); }

  .lexicon { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 10px; }
  .lex { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px; border: 1px solid var(--hair); text-align: center; }
  .lex.unseen { border-style: dashed; }
  .lmean { font-size: 16px; }

  .almanac { display: flex; justify-content: space-between; }
  .aday { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 3px; border: 1px solid transparent; }
  .aday.now { border-color: var(--gold); }
  .aday.past { opacity: 0.45; }
  .stancebig { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .question { padding: 10px 12px; border: 1px dashed var(--hair-2); display: flex; flex-direction: column; gap: 4px; }
  .question.done { border: 1px solid var(--gold); }
  .question.done p { font-style: italic; }
  .past { display: flex; flex-direction: column; gap: 3px; padding: 6px 0; border-bottom: 1px solid var(--hair); }
  .feed { color: var(--ink-2); font-size: 15px; }
  .feed.omen { color: var(--omen); } .feed.grace { color: var(--grace); } .feed.blood { color: #d9654f; } .feed.case { color: var(--gold); }
  .reset { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }

  .passing { position: absolute; left: 50%; top: 16px; transform: translateX(-50%); display: flex; flex-direction: column; gap: 6px; align-items: center; z-index: 5; }
  .track { width: 220px; max-width: 100%; height: 2px; background: var(--hair); }
  .fill { height: 100%; background: var(--gold); transition: width 0.2s; }

  .overlay { position: fixed; inset: 0; background: rgba(8, 7, 6, 0.78); display: grid; place-items: center; z-index: 50; overflow-y: auto; padding-block: 24px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
  .overlay.title { background: rgba(8, 7, 6, 0.9); }
  .card { width: min(580px, 100%); background: var(--panel); border: 1px solid var(--hair-2); padding: 26px 28px; display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
  .card h1 { font: 56px/1 var(--title); margin: 0; font-weight: normal; letter-spacing: 0.02em; }
  .card h2 { font: 28px/1.1 var(--title); margin: 0; font-weight: normal; text-wrap: balance; }
  .card > div { display: flex; flex-direction: column; gap: 4px; }
  .arrival { font-size: 20px; }
  .event { padding-left: 12px; border-left: 2px solid var(--hair-2); display: flex; flex-direction: column; gap: 6px; }
  .event.omen { border-left-color: var(--omen); } .event.grace { border-left-color: var(--grace); }
  .event.blood { border-left-color: #c2412d; } .event.blood h2 { color: #d9654f; }
  .duskhead { flex-direction: row !important; gap: 8px !important; align-items: center; }
  .wordfind { flex-direction: row !important; gap: 12px !important; align-items: center; padding: 10px; border: 1px solid var(--hair-2); background: var(--ground-2); width: 100%; }
  .find { padding: 12px; border: 1px solid var(--gold); width: 100%; }
  .find.alive { border-color: var(--grace); background: var(--ground-2); }
  .regrow .sentence { flex-direction: row; display: flex; gap: 10px; }
  .regrow .track { width: 100%; }

  @media (max-width: 900px) {
    main { grid-template-columns: minmax(0, 1fr); grid-template-rows: 48vh minmax(0, 1fr); }
    .side { border-left: 0; border-top: 1px solid var(--hair); }
    .stats { gap: 12px; margin-left: 0; flex-wrap: wrap; }
    .end { width: 100%; }
    .side :global(.panel) { position: fixed; z-index: 40; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); padding-left: env(safe-area-inset-left, 0px); padding-right: env(safe-area-inset-right, 0px); }
  }
  @media (max-width: 420px) { .hand { grid-template-columns: 1fr; } .hcard { min-height: 0; } }
</style>
