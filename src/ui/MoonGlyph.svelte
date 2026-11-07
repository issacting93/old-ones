<script>
  // MoonGlyph — a moon drawn at its phase. `index` is the PHASES index (0 new … 4 full … 7),
  // `blood` turns it rust-red, `unknown` draws a full moon you can't read yet (a question mark).
  let { index = 0, blood = false, unknown = false, size = 28, glow = false } = $props();

  const r = 10;
  // lit region: one half of the disc plus or minus an elliptical terminator
  const path = $derived.by(() => {
    const p = index / 8; // 0 new, .5 full
    if (index === 0) return "";
    if (index === 4) return `M0,${-r} A${r},${r} 0 1 1 0,${r} A${r},${r} 0 1 1 0,${-r}Z`;
    const waxing = p < 0.5;
    const tx = Math.abs(Math.cos(2 * Math.PI * p)) * r; // terminator half-width
    const gibbous = Math.abs(p - 0.5) < 0.25;
    // outer limb: the lit side's semicircle; terminator: back along an ellipse
    const limbSweep = waxing ? 1 : 0;
    const termSweep = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1);
    return `M0,${-r} A${r},${r} 0 0 ${limbSweep} 0,${r} A${tx},${r} 0 0 ${termSweep} 0,${-r}Z`;
  });
  const lit = $derived(blood ? "#c2412d" : "#efe6cf");
  const dark = $derived(blood ? "#3a120d" : "#26231d");
</script>

<svg viewBox="-13 -13 26 26" width={size} height={size} aria-hidden="true" class:glow class:blood>
  <circle r={r} fill={dark} stroke={blood ? "#7a2418" : "#4a443a"} stroke-width="0.6" />
  {#if unknown}
    <text y="4" text-anchor="middle" font-size="11" fill="#9d927c" font-family="IM Fell English SC, serif">?</text>
  {:else if path}
    <path d={path} fill={lit} />
  {/if}
</svg>

<style>
  svg { display: block; overflow: visible; }
  .glow { filter: drop-shadow(0 0 4px rgba(239, 230, 207, 0.45)); }
  .glow.blood { filter: drop-shadow(0 0 6px rgba(194, 65, 45, 0.7)); }
</style>
