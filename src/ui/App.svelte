<script>
  import TownView from "./TownView.svelte";
  import ConversationPanel from "./ConversationPanel.svelte";
  import StanceMark from "./StanceMark.svelte";
  import MoonGlyph from "./MoonGlyph.svelte";
  import { PHASES, BLOOD_PHASE, MOON, phaseFor } from "../content/moon.js";
  import { gameStore } from "./store.js";
  import { TOWN, QUARTERS, LENSES } from "../content/town.js";
  import { BUILDINGS, BUILDING_BY_ID, FUND_LENS_COST } from "../content/buildings.js";
  import { OLD_ONES } from "../content/old-ones.js";
  import { STANCES, readStance } from "../content/stance.js";

  let { game } = $props();
  const s = gameStore(game);

  let tab = $state("town");
  let convo = $state(null);
  let placing = $state(null);
  let pendingCell = $state(null);
  let selected = $state(null);
  let notice = $state("");
  let progress = $state(0);
  let showDusk = $state(true);

  const quarterName = (id) => QUARTERS.find((q) => q.id === id)?.name || "the centre";
  const passing = $derived($s.phase === "passing");
  const ended = $derived($s.phase === "ended");
  const reading = $derived(readStance($s.stance));
  const moonIdx = $derived(Math.max(0, PHASES.findIndex((p) => p.id === $s.moon.phase)));
  const moon = $derived($s.moon.blood ? BLOOD_PHASE : PHASES[moonIdx]);
  // the almanac: every night of the slice, and whether the coming full moon can be read yet
  const almanac = $derived(Array.from({ length: TOWN.nights }, (_, i) => {
    const night = i + 1, ph = phaseFor(night), idx = PHASES.indexOf(ph);
    const past = night < $s.night, now = night === $s.night;
    const isFull = ph.id === "full";
    const bloodKnown = isFull && (now ? $s.moon.blood : past ? $s.flags.includes("blood-moon") : $s.flags.includes("blood-omen"));
    const unreadable = isFull && !past && !now && !$s.flags.includes("blood-omen") && ($s.lenses.SHRINE || 0) < MOON.blood.foreseenAt;
    return { night, ph, idx, past, now, blood: bloodKnown, unknown: unreadable };
  }));

  // where each old one is thickest right now
  function haunt(key) {
    let best = null, n = 0;
    for (const [q, counts] of Object.entries($s.readings.quarters || {})) if ((counts[key] || 0) > n) { n = counts[key]; best = q; }
    return best ? quarterName(best) : "beyond the wall";
  }

  function visit(id) {
    const c = game.visit(id);
    if (c) { convo = c; notice = ""; }
  }
  function closeConvo() { convo = null; }

  function startPlacing(id) {
    placing = placing === id ? null : id;
    pendingCell = null;
    notice = placing ? `Choose a place for the ${BUILDING_BY_ID[id].name.toLowerCase()} — the dotted cells can take it.` : "";
  }
  function onpick(cell) {
    if (!placing) return;
    if (!game.town.canBuild(placing, cell.id)) { notice = "It can't stand there."; pendingCell = null; return; }
    pendingCell = cell.id;
    notice = "";
  }
  function confirmBuild() {
    const r = game.build(placing, pendingCell);
    if (!r.ok) { notice = r.reason; return; }
    placing = null; pendingCell = null; notice = "";
  }
  function fund(lens) { const r = game.fundLens(lens); if (!r.ok) notice = "The council can't fund that tonight."; }

  async function endNight() {
    placing = null; pendingCell = null; notice = ""; progress = 0;
    await game.endNight((p) => (progress = p));
    showDusk = true;
  }
</script>

<div class="app">
  <header class="bar">
    <div class="title">
      <span class="town">{TOWN.name}</span>
      <span class="label">Night {$s.night} of {TOWN.nights}</span>
    </div>
    <div class="moonnow" class:blood={$s.moon.blood} title={moon.line}>
      <MoonGlyph index={moonIdx} blood={$s.moon.blood} size={30} glow />
      <div>
        <div class="mname">{moon.name}</div>
        <span class="label">Lunar day {$s.moon.day}{$s.moon.toFull > 0 ? ` · full in ${$s.moon.toFull}` : ""}</span>
      </div>
    </div>
    <div class="stats">
      <div><span class="label">Coin</span><b>{$s.coin}</b></div>
      <div><span class="label">Hope</span><b class="hope">{$s.hope}</b></div>
      <div><span class="label">Dread</span><b class="dread">{$s.dread}</b></div>
      <div><span class="label">Visits</span><b>{$s.visitsLeft}</b></div>
      <div class="stance" title={reading.line}><StanceMark stance={$s.stance} size={30} /><span class="label">{reading.label}</span></div>
    </div>
    <button class="btn primary" disabled={passing || ended} onclick={endNight}>{passing ? "The night passes…" : "End the night"}</button>
  </header>

  <main>
    <section class="map">
      <TownView {game} snap={$s} {placing} bind:selected {onpick} {progress} />
      {#if passing}
        <div class="passing"><span class="label">The night passes</span><div class="bar-track"><div class="bar-fill" style="width:{progress * 100}%"></div></div></div>
      {/if}
      {#if notice}<div class="notice">{notice}</div>{/if}
      {#if placing && pendingCell != null}
        <div class="confirm">
          <span>Raise the {BUILDING_BY_ID[placing].name.toLowerCase()} in the {quarterName(game.town.cells[pendingCell].quarter)}?</span>
          <button class="btn primary" onclick={confirmBuild}>Build · {BUILDING_BY_ID[placing].coin} coin</button>
          <button class="btn" onclick={() => (pendingCell = null)}>Not there</button>
        </div>
      {/if}
    </section>

    <aside class="side">
      <nav>
        {#each [["town", "Town"], ["council", "Council"], ["ledger", "Ledger"]] as [id, label]}
          <button class:on={tab === id} onclick={() => (tab = id)}>{label}</button>
        {/each}
      </nav>

      <div class="content">
        {#if tab === "town"}
          <h3 class="label">Townsfolk</h3>
          {#each game.characters as c (c.id)}
            {@const t = ($s, game.threadFor(c.id))}
            <div class="person">
              <div>
                <div class="pname">{c.name}</div>
                <div class="label">{c.role} · {quarterName(c.quarter)}</div>
                {#if t}<div class="thread" class:new={(t.priority || 0) >= 0}>{(t.priority || 0) >= 0 ? `“${t.title}”` : "Nothing new tonight"}</div>{/if}
              </div>
              <button class="btn" disabled={!t || $s.visitsLeft <= 0 || passing || ended} onclick={() => visit(c.id)}>Visit</button>
            </div>
          {/each}

          <h3 class="label">The old ones</h3>
          {#each OLD_ONES as o (o.key)}
            {@const share = $s.readings.share?.[o.key] ?? 1}
            <div class="old">
              <div class="row">
                <span class="oname">{o.name}</span>
                {#if $s.eco.hungry?.[o.key]}<span class="tag omen">hungry</span>{/if}
                {#if $s.eco.intruders?.[o.key]}<span class="tag omen">inside the wall</span>{/if}
              </div>
              <div class="meter"><div style="width:{Math.min(100, share * 50)}%" class:low={share < 0.75} class:high={share > 1.15}></div></div>
              <div class="label">{Math.round(share * 100)}% of their old numbers · most seen over {haunt(o.key)}</div>
            </div>
          {/each}

        {:else if tab === "council"}
          <p class="hint">{$s.councilUsed ? "The council has decided for tonight." : "One decision a night: raise something, or fund a way of paying attention."}</p>
          {#each BUILDINGS as b (b.id)}
            <button class="building" class:on={placing === b.id} style="--c:{b.color}" disabled={$s.councilUsed || $s.coin < b.coin || passing || ended} onclick={() => startPlacing(b.id)}>
              <div class="row"><span class="bname">{b.name}</span><span class="label">{b.coin} coin{b.income ? ` · +${b.income}/night` : ""}</span></div>
              <div class="blurb">{b.blurb}</div>
              <div class="effects">
                {#each Object.entries(b.stance) as [k, v]}<span class="tag" style="color:{STANCES[k].color}">{STANCES[k].name} +{v}</span>{/each}
                {#each Object.entries(b.pop) as [k, v]}<span class="tag">{OLD_ONES.find((o) => o.key === k)?.short} {v > 1 ? "↑" : "↓"}</span>{/each}
                {#if b.draws.length}<span class="tag">draws {b.draws.map((k) => OLD_ONES.find((o) => o.key === k)?.short).join(", ")}</span>{/if}
                {#if b.wards}<span class="tag">wards them off</span>{/if}
              </div>
            </button>
          {/each}
          <h3 class="label">Lenses</h3>
          {#each Object.entries(LENSES) as [id, l]}
            <div class="lensrow">
              <div><span class="lname" style="color:{l.color}">{l.name}</span> <span class="label">level {$s.lenses[id] || 0}</span><div class="blurb">{l.blurb}</div></div>
              <button class="btn" disabled={$s.councilUsed || $s.coin < FUND_LENS_COST || ($s.lenses[id] || 0) >= 3 || passing || ended} onclick={() => fund(id)}>Fund · {FUND_LENS_COST}</button>
            </div>
          {/each}

        {:else}
          <h3 class="label">Almanac</h3>
          <div class="almanac">
            {#each almanac as a (a.night)}
              <div class="aday" class:now={a.now} class:past={a.past}>
                <MoonGlyph index={a.idx} blood={a.blood} unknown={a.unknown} size={26} />
                <span class="label">{a.night}</span>
              </div>
            {/each}
          </div>
          <p class="hint">{moon.line}</p>
          <h3 class="label">Stance</h3>
          <div class="stancebig"><StanceMark stance={$s.stance} size={96} labels /></div>
          <p class="hint">{reading.line}</p>
          <h3 class="label">Clues</h3>
          {#if !$s.clues.length}<p class="hint">Nothing yet. Go and listen.</p>{/if}
          {#each [...$s.clues].reverse() as k (k.id)}
            <div class="clue"><span class="label">Night {k.night}{k.lens ? ` · ${LENSES[k.lens]?.name}` : ""}</span>{k.text}</div>
          {/each}
          <h3 class="label">The town's nights</h3>
          {#each [...$s.feed].reverse() as f, i (i)}
            <div class="feed {f.tone}"><span class="label">Night {f.night}</span>{f.text}</div>
          {/each}
        {/if}
      </div>

      {#if convo}<ConversationPanel {convo} onclose={closeConvo} />{/if}
    </aside>
  </main>

  {#if showDusk && $s.dusk.length && !passing && !ended}
    <div class="overlay" role="dialog">
      <div class="card">
        <div class="duskhead"><MoonGlyph index={moonIdx} blood={$s.moon.blood} size={22} glow /><span class="label">Dusk · night {$s.night} · {moon.name}</span></div>
        {#each $s.dusk as d (d.eventId)}
          <div class="event {d.tone}">
            <h2>{d.headline}</h2>
            <p>{d.narrative}</p>
          </div>
        {/each}
        <button class="btn primary" onclick={() => (showDusk = false)}>Go out into the town</button>
      </div>
    </div>
  {/if}

  {#if ended}
    <div class="overlay" role="dialog">
      <div class="card">
        <span class="label">The council sits</span>
        <h2>{reading.lead ? STANCES[reading.lead].name : "Undecided"}</h2>
        <StanceMark stance={$s.stance} size={120} labels />
        <p>{reading.line} After {TOWN.nights} nights, {TOWN.name} has {$s.built.length} new {$s.built.length === 1 ? "building" : "buildings"}, {$s.clues.length} clues in its ledger, hope at {$s.hope} and dread at {$s.dread}.</p>
        <p class="hint">This is the end of the first slice. {$s.flags.includes("drowned-bell") ? "Somewhere in the Drowned Quarter, a bell is still ringing." : ""}</p>
        <button class="btn primary" onclick={() => location.reload()}>Begin again</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .app { height: 100%; display: flex; flex-direction: column; }
  .bar { display: flex; align-items: center; gap: 20px; padding: 10px 18px; border-bottom: 1px solid var(--hair); }
  .title { display: flex; flex-direction: column; }
  .town { font: 26px/1 var(--title); letter-spacing: 0.04em; }
  .stats { display: flex; gap: 18px; margin-left: auto; align-items: center; }
  .stats > div { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .stats b { font: 500 18px var(--mono); }
  .hope { color: var(--grace); } .dread { color: var(--omen); }
  .stats .stance { flex-direction: row; gap: 8px; }

  main { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 400px; }
  .map { position: relative; min-height: 0; }
  .side { position: relative; border-left: 1px solid var(--hair); display: flex; flex-direction: column; min-height: 0; background: var(--panel); }
  nav { display: flex; border-bottom: 1px solid var(--hair); }
  nav button { flex: 1; background: none; border: 0; padding: 12px; font: 500 11px var(--mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); cursor: pointer; border-bottom: 1px solid transparent; }
  nav button.on { color: var(--gold); border-bottom-color: var(--gold); }
  .content { flex: 1; overflow-y: auto; padding: 14px 18px 24px; display: flex; flex-direction: column; gap: 10px; }
  h3 { margin: 12px 0 0; }
  .hint { color: var(--ink-3); margin: 0; font-style: italic; }

  .person { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--hair); }
  .pname { font-size: 19px; }
  .thread { color: var(--ink-3); font-style: italic; }
  .thread.new { color: var(--gold); }

  .old { display: flex; flex-direction: column; gap: 4px; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .oname { font-size: 17px; }
  .meter { height: 3px; background: var(--hair); }
  .meter div { height: 100%; background: var(--ink-2); }
  .meter div.low { background: var(--omen); } .meter div.high { background: var(--grace); }
  .tag { font: 500 9px var(--mono); letter-spacing: 0.12em; text-transform: uppercase; border: 1px solid var(--hair-2); padding: 2px 5px; color: var(--ink-2); }
  .tag.omen { color: var(--omen); border-color: var(--omen); }

  .building { text-align: left; background: none; border: 1px solid var(--hair); border-left: 3px solid var(--c); padding: 10px 12px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
  .building:hover:not(:disabled), .building.on { border-color: var(--c); }
  .building:disabled { opacity: 0.4; cursor: default; }
  .bname { font-size: 19px; }
  .blurb { color: var(--ink-2); font-size: 16px; }
  .effects { display: flex; flex-wrap: wrap; gap: 4px; }
  .lensrow { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
  .lname { font-size: 18px; }

  .stancebig { display: flex; flex-direction: column; align-items: center; }
  .clue, .feed { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border: 1px solid var(--hair); }
  .feed.omen { border-left: 2px solid var(--omen); } .feed.grace { border-left: 2px solid var(--grace); } .feed.blood { border-left: 2px solid #c2412d; }

  .passing { position: absolute; left: 50%; top: 16px; transform: translateX(-50%); display: flex; flex-direction: column; gap: 6px; align-items: center; }
  .bar-track { width: 220px; height: 2px; background: var(--hair); }
  .bar-fill { height: 100%; background: var(--gold); }
  .notice, .confirm { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); background: rgba(13,12,11,.9); border: 1px solid var(--hair-2); padding: 10px 14px; display: flex; gap: 10px; align-items: center; max-width: calc(100% - 32px); }
  .confirm { bottom: 18px; }

  .overlay { position: fixed; inset: 0; background: rgba(8, 7, 6, 0.72); display: grid; place-items: center; z-index: 50; padding: 16px; }
  .card { max-width: 560px; background: var(--panel); border: 1px solid var(--hair-2); padding: 26px 28px; display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
  .card h2 { font: 30px/1.1 var(--title); margin: 0; font-weight: normal; }
  .card p { margin: 0; }
  .event { display: flex; flex-direction: column; gap: 6px; padding-left: 12px; border-left: 2px solid var(--hair-2); }
  .event.omen { border-left-color: var(--omen); } .event.grace { border-left-color: var(--grace); }
  .event.blood { border-left-color: #c2412d; } .event.blood h2 { color: #d9654f; }
  .duskhead { display: flex; gap: 8px; align-items: center; }
  .moonnow { display: flex; gap: 10px; align-items: center; margin-left: 18px; }
  .mname { font-size: 18px; line-height: 1.1; }
  .moonnow.blood .mname { color: #d9654f; }
  .almanac { display: flex; justify-content: space-between; padding: 6px 0; }
  .aday { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 4px; border: 1px solid transparent; }
  .aday.now { border-color: var(--gold); }
  .aday.past { opacity: 0.45; }

  @media (max-width: 900px) {
    main { grid-template-columns: 1fr; grid-template-rows: 55vh 1fr; }
    .side { border-left: 0; border-top: 1px solid var(--hair); }
    .stats { gap: 10px; }
    .bar { flex-wrap: wrap; gap: 10px; }
  }
</style>
