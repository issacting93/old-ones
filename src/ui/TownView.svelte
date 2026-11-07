<script>
  // TownView — the town from above, with the old ones drifting over it.
  // Two stacked canvases: the plan (2D, drawn from the WFC result) and the old ones (WebGL2,
  // interactions_library's EcologyRender, transparent so the plan shows through). The plan and
  // the sim share one coordinate space (world/ecology.js), so creatures circle the buildings
  // that draw them.
  import { onMount } from "svelte";
  import { QUARTERS } from "../content/town.js";
  import { BUILDING_BY_ID } from "../content/buildings.js";
  import { PHASES, BLOOD_PHASE } from "../content/moon.js";
  import MoonGlyph from "./MoonGlyph.svelte";

  let { game, snap, placing = null, selected = $bindable(null), onpick, progress = 0 } = $props();

  // ── the sky: the moon crosses the map as the night passes, and the night tints the town ──
  const moonIdx = $derived(Math.max(0, PHASES.findIndex((p) => p.id === snap.moon.phase)));
  const blood = $derived(!!snap.moon.blood);
  const light = $derived(blood ? BLOOD_PHASE.light : PHASES[moonIdx].light);
  // a full moon rises at dusk; a new one is down all night. Evening holds the moon at its
  // dusk position; while the night passes it runs along the arc toward dawn.
  const t = $derived.by(() => {
    const start = [0.05, 0.42, 0.55, 0.3, 0.1, 0.02, 0.0, 0.0][moonIdx];
    return snap.phase === "passing" ? start + (0.95 - start) * progress : start;
  });
  const moonPos = $derived({ x: size * (0.06 + 0.88 * t), y: size * (0.5 - 0.44 * Math.sin(Math.PI * Math.min(1, t))) });
  const moonUp = $derived(moonIdx !== 0 && t > 0.015 && t < 0.97);
  const tint = $derived.by(() => {
    if (blood) return "rgba(150, 38, 22, 0.42)";
    const dark = 1 - light;
    return snap.phase === "passing" ? `rgba(28, 40, 72, ${0.18 + 0.3 * dark})` : `rgba(120, 82, 40, ${0.08 + 0.12 * dark})`;
  });

  let wrap, plan, gl, fallback;
  let size = $state(600);
  let wrapW = $state(600), wrapH = $state(600);
  let hover = $state(null);
  let renderer = null;
  let dirty = true;

  const { town, eco } = game;
  const FILL = {
    street: "#3a342a", house: "#181512", market: "#2d251b", civic: "#30281c", shrine: "#4f3f22",
    water: "#123744", grove: "#17261b", wall: "#46413a", gate: "#7a6844", tower: "#5f4f31", court: "#181512",
  };

  // city-local → canvas px, through the same tank space the sim uses
  function px(p) {
    const t = eco.toTank(p), k = size / eco.sim.bounds.w;
    return { x: t.x * k, y: t.y * k };
  }
  function toCity(cx, cy) {
    const k = eco.sim.bounds.w / size;
    return eco.toCity({ x: cx * k, y: cy * k });
  }
  const scale = () => px({ x: 1, y: 0 }).x - px({ x: 0, y: 0 }).x;

  function sector(ctx, c, inset = 0) {
    const o = px({ x: 0, y: 0 }), s = scale();
    const r0 = Math.max(0, c.r0 * s + inset), r1 = c.r1 * s - inset;
    ctx.beginPath();
    if (c.ring === 0) { ctx.arc(o.x, o.y, r1, 0, Math.PI * 2); return; }
    ctx.arc(o.x, o.y, r1, c.a0, c.a1);
    ctx.arc(o.x, o.y, r0, c.a1, c.a0, true);
    ctx.closePath();
  }

  function drawPlan() {
    if (!plan) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    plan.width = size * dpr; plan.height = size * dpr;
    const ctx = plan.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0d0c0b"; ctx.fillRect(0, 0, size, size);
    const o = px({ x: 0, y: 0 }), s = scale();

    // faint outer ground and the quarter boundaries beyond the wall
    ctx.strokeStyle = "#221f1a"; ctx.lineWidth = 1;
    for (let r = town.outerRadius + 1.2; r < town.outerRadius * 1.25; r += 1.2) { ctx.beginPath(); ctx.arc(o.x, o.y, r * s, 0, Math.PI * 2); ctx.stroke(); }

    for (const c of town.cells) {
      const t = town.tileAt(c.id);
      sector(ctx, c);
      ctx.fillStyle = t.building ? BUILDING_BY_ID[t.building].color : FILL[t.kind] || FILL.house;
      ctx.globalAlpha = t.building ? 0.8 : 0.62; // keep the plan quiet so the old ones carry the light
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#0d0c0b"; ctx.lineWidth = 0.8; ctx.stroke();
    }

    // buildable cells for the building being placed
    if (placing) {
      ctx.setLineDash([2, 3]);
      for (const c of town.cells) {
        if (!town.canBuild(placing, c.id)) continue;
        sector(ctx, c, 1.5);
        ctx.strokeStyle = "rgba(201,169,110,.55)"; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // building marks
    for (const b of snap.built) {
      const p = px(town.centroid(b.cellId));
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2.5, s * 0.28), 0, Math.PI * 2);
      ctx.fillStyle = "#0d0c0b"; ctx.fill();
      ctx.strokeStyle = BUILDING_BY_ID[b.kind].color; ctx.lineWidth = 1.2; ctx.stroke();
    }

    // quarter names, outside the wall
    ctx.font = `${Math.max(11, size * 0.022)}px "IM Fell English SC", serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const q of QUARTERS) {
      const a = ((q.from + q.to) / 2) * (Math.PI / 180), r = town.outerRadius * 1.12;
      const p = px({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      ctx.fillStyle = q.id === "drowned" ? "#5b554b" : "#9d927c";
      ctx.fillText(q.name, p.x, p.y);
    }

    if (selected != null) {
      sector(ctx, town.cells[selected], 0.5);
      ctx.strokeStyle = "#e9e1cf"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (hover && hover.id !== selected) {
      sector(ctx, hover, 0.5);
      ctx.strokeStyle = "rgba(233,225,207,.5)"; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  function cellFromEvent(e) {
    const r = plan.getBoundingClientRect();
    const p = toCity(e.clientX - r.left, e.clientY - r.top);
    return town.cellAt(p.x, p.y);
  }

  function onmove(e) { const c = cellFromEvent(e); if (c?.id !== hover?.id) { hover = c; dirty = true; } }
  function onleave() { hover = null; dirty = true; }
  function onclick(e) {
    const c = cellFromEvent(e);
    if (!c) return;
    selected = c.id;
    dirty = true;
    onpick && onpick(c);
  }

  // redraw the plan when the town or the selection changes
  $effect(() => { snap; placing; selected; size; dirty = true; });
  $effect(() => game.bus.on("town.changed", () => (dirty = true)));

  onMount(() => {
    const ro = new ResizeObserver(([entry]) => {
      wrapW = entry.contentRect.width; wrapH = entry.contentRect.height;
      size = Math.floor(Math.min(wrapW, wrapH));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (renderer) window.EcologyRender.resize(renderer, size * dpr, size * dpr);
      if (fallback) { fallback.width = size * dpr; fallback.height = size * dpr; }
      dirty = true;
    });
    ro.observe(wrap);
    try {
      renderer = window.EcologyRender.create(gl, game.eco.ES);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      window.EcologyRender.resize(renderer, size * dpr, size * dpr); // framebuffers exist before the first frame
    } catch (err) {
      console.warn("WebGL2 unavailable, drawing the old ones as points", err);
      renderer = null;
    }

    let last = performance.now(), raf;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (game.state.get("phase") === "evening") eco.step(dt); // while the night passes, fastForward steps it
      if (dirty) { drawPlan(); dirty = false; }
      if (renderer) {
        window.EcologyRender.frame(renderer, {
          sim: eco.sim, time: now / 1000, worldW: eco.sim.bounds.w, worldH: eco.sim.bounds.h,
          dpr: Math.min(2, window.devicePixelRatio || 1),
          camera: { tilt: 0, yaw: 0, zoom: 1, panX: 0, panY: 0 },
          render: { carcasses: false, glow: 1.25, waterAlpha: 0.0, snow: true },
        });
      } else if (fallback) {
        const ctx = fallback.getContext("2d"), k = fallback.width / eco.sim.bounds.w;
        ctx.clearRect(0, 0, fallback.width, fallback.height);
        for (const f of eco.sim.fish) {
          if (f.dead) continue;
          ctx.fillStyle = "rgba(160,230,220,.8)";
          ctx.fillRect(f.x * k - 1.5, f.y * k - 1.5, 3, 3);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  });
</script>

<div class="wrap" bind:this={wrap}>
  <!-- the night's tint covers the whole view, not just the map's square -->
  <div class="sky tint" style="background:{tint}"></div>
  {#if blood}<div class="sky bloodglow"></div>{/if}
  {#if moonUp}
    <div class="sky moonlight" style="background:radial-gradient(circle at {moonPos.x + (wrapW - size) / 2}px {moonPos.y + (wrapH - size) / 2}px, {blood ? 'rgba(194,65,45,.22)' : `rgba(239,230,207,${0.05 + 0.12 * light})`}, transparent {size * 0.45}px)"></div>
  {/if}
  <div class="stage" style="width:{size}px;height:{size}px">
    <canvas class="plan" bind:this={plan} style="width:{size}px;height:{size}px"
      onmousemove={onmove} onmouseleave={onleave} onclick={onclick}></canvas>
    <canvas class="gl" bind:this={gl} style="width:{size}px;height:{size}px"></canvas>
    <canvas class="gl" bind:this={fallback} style="width:{size}px;height:{size}px"></canvas>
    {#if moonUp}
      <div class="moon" style="left:{moonPos.x}px;top:{moonPos.y}px"><MoonGlyph index={moonIdx} {blood} size={Math.max(22, size * 0.06)} glow /></div>
    {/if}
    {#if hover}
      {@const t = town.tileAt(hover.id)}
      <div class="tip">
        <span class="label">{hover.quarter ? QUARTERS.find((q) => q.id === hover.quarter).name : "The centre"} · {town.zoneName(hover.zone)}</span>
        <span class="name">{t.name}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .wrap { position: relative; width: 100%; height: 100%; display: grid; place-items: center; overflow: hidden; background: #0d0c0b; }
  .wrap > .stage { grid-area: 1 / 1; }
  .stage { position: relative; }
  canvas { position: absolute; inset: 0; display: block; }
  .plan { cursor: crosshair; }
  .gl { pointer-events: none; }
  .sky { position: absolute; inset: 0; pointer-events: none; }
  .tint { mix-blend-mode: multiply; transition: background 1.2s ease; z-index: 2; }
  .moonlight { mix-blend-mode: screen; z-index: 3; }
  .bloodglow { z-index: 2; background: radial-gradient(circle at 50% 50%, rgba(194, 65, 45, 0.28), transparent 42%); mix-blend-mode: screen; animation: pulse 4s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: 0.55; } }
  .moon { position: absolute; z-index: 3; transform: translate(-50%, -50%); pointer-events: none; transition: left 0.3s linear, top 0.3s linear; }
  .tip {
    position: absolute; z-index: 3; left: 12px; bottom: 12px; display: flex; flex-direction: column; gap: 2px;
    padding: 8px 10px; background: rgba(13, 12, 11, 0.82); border: 1px solid var(--hair); pointer-events: none;
  }
  .tip .name { font-size: 17px; }
</style>
