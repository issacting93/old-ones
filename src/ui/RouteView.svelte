<script>
  // RouteView — the town staged the Kentucky Route Zero way (world/route-stage.js): the game's
  // own WFC town built from creature parts, Spire Forge towers where the sentence put buildings,
  // ridges and pines behind, the old ones flying over it, one lantern. Pointing at a card moves
  // the lantern to that place. Falls back to the flat plan (TownView) without WebGL2.
  import { onMount } from "svelte";
  import { QUARTERS } from "../content/town.js";
  import { PHASES } from "../content/moon.js";
  import { createStage, loadStageParts } from "../world/route-stage.js";

  let { game, snap, focus = [], progress = 0, onfail } = $props();

  // ── the sky: the same arc the plan's moon runs (TownView) ──
  const moonIdx = $derived(Math.max(0, PHASES.findIndex((p) => p.id === snap.moon?.phase)));
  const blood = $derived(!!snap.moon?.blood);
  const passing = $derived(snap.phase === "passing");
  const t = $derived.by(() => {
    const start = [0.05, 0.42, 0.55, 0.3, 0.1, 0.02, 0.0, 0.0][moonIdx];
    return passing ? start + (0.95 - start) * progress : start;
  });
  const moonUp = $derived(moonIdx !== 0 && t > 0.015 && t < 0.97);

  let canvas;
  let labels = $state([]);
  let stage = $state(null);
  let raising = $state(true);
  let hover = $state(null);
  let stale = true;

  $effect(() => game.bus.on("town.changed", () => (stale = true)));
  $effect(() => { if (stage) stage.setSky({ index: moonIdx, blood, passing, t, up: moonUp }); });
  $effect(() => { if (stage) stage.setFocus(focus); });

  function rebuild() {
    if (!stage || !game.town || !game.eco) return;
    stale = false;
    raising = true;
    // let the curtain paint before the (synchronous) build
    requestAnimationFrame(() => setTimeout(() => {
      try { stage.build(game); } catch (err) { console.warn("[route] could not raise the set", err); onfail && onfail(); return; }
      stage.setFocus(focus);
      raising = false;
    }, 20));
  }

  function onFrame() {
    if (!stage) return;
    if (game.town && game.eco && (stale || stage.town !== game.town || stage.eco !== game.eco) && !raising) rebuild();
    const town = stage.town;
    if (!town) return;
    QUARTERS.forEach((q, i) => {
      const el = labels[i]; if (!el) return;
      const a = ((q.from + q.to) / 2) * (Math.PI / 180), r = town.outerRadius + 2.6;
      const p = stage.project(Math.cos(a) * r, 0, Math.sin(a) * r);
      // keep every name on screen: slide it in from the edge it would fall off
      const w = el.offsetWidth / 2 + 10, x = Math.max(w, Math.min(canvas.clientWidth - w, p.x)), y = Math.max(16, Math.min(canvas.clientHeight - 16, p.y));
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
  }

  function onmove(e) {
    if (!stage || stage.dragging) return;
    const c = stage.pick(e.clientX, e.clientY);
    if (c?.id !== hover?.id) { hover = c; stage.setHover(c ? c.id : null); }
  }
  function onleave() { hover = null; stage && stage.setHover(null); }

  onMount(() => {
    let s = null, dead = false;
    (async () => {
      try {
        await loadStageParts(new URL("vendor/forge/creature-parts.json", document.baseURI).href);
        if (dead) return;
        s = createStage(canvas, { onFrame });
        s.stepSim = (dt) => { if (game.eco && game.state.get("phase") === "evening") game.eco.step(dt); }; // while the night passes, fastForward steps it
        stage = s;
        if (import.meta.env.DEV) window.__stage = s;
        rebuild();
      } catch (err) {
        console.warn("[route] no stage, falling back to the plan", err);
        onfail && onfail();
      }
    })();
    return () => { dead = true; s && s.dispose(); };
  });
</script>

<div class="wrap">
  <canvas bind:this={canvas} onpointermove={onmove} onpointerleave={onleave}
    aria-label="The town at night, staged flat: its streets and towers drawn in thin lines, ridges and pines behind, the old ones flying over"></canvas>
  {#each QUARTERS as q, i (q.id)}
    <div class="qname" class:drowned={q.id === "drowned"} bind:this={labels[i]}>{q.name}</div>
  {/each}
  {#if hover && game.town}
    {@const tile = game.town.tileAt(hover.id)}
    <div class="tip">
      <span class="label">{hover.quarter ? QUARTERS.find((x) => x.id === hover.quarter).name : "The centre"} · {game.town.zoneName(hover.zone)}</span>
      <span class="name">{tile.name}</span>
    </div>
  {/if}
  <div class="curtain" class:down={raising} aria-hidden="true"><span class="label">Raising the set…</span></div>
</div>

<style>
  .wrap { position: relative; width: 100%; height: 100%; overflow: hidden; background: #26302c; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
  canvas:active { cursor: grabbing; }
  .qname {
    position: absolute; left: 0; top: 0; pointer-events: none; white-space: nowrap;
    font: 12px "IM Fell English SC", serif; letter-spacing: 0.18em; text-transform: uppercase;
    color: rgba(233, 225, 207, 0.72); text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
  }
  @media (max-width: 600px) { .qname { font-size: 10px; letter-spacing: 0.1em; } }
  .qname.drowned { color: rgba(233, 225, 207, 0.4); }
  .tip {
    position: absolute; z-index: 3; left: 12px; bottom: 12px; display: flex; flex-direction: column; gap: 2px;
    padding: 8px 10px; background: rgba(13, 12, 11, 0.82); border: 1px solid var(--hair); pointer-events: none;
  }
  .tip .name { font-size: 17px; }
  .curtain { position: absolute; inset: 0; z-index: 4; display: grid; place-items: center; background: #0d0c0b; opacity: 0; pointer-events: none; transition: opacity 0.7s ease; }
  .curtain.down { opacity: 1; }
</style>
