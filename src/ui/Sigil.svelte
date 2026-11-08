<script>
  // Sigil — a word of the old ones' language, drawn as an Arrival-style logogram: the glyph from
  // Sigil Forge (content/sigil-glyphs.js) inside an inked ring whose blots and tendrils are
  // seeded by the word, so each word's ring is its own. `state`: "sure" | "guess" | "unseen".
  import { GLYPHS } from "../content/sigil-glyphs.js";

  let { word = null, size = 56, state = "sure", glow = false } = $props();

  function seeded(str) {
    let h = 2166136261;
    for (const ch of str || "x") h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => ((h = Math.imul(h ^ (h >>> 13), 1274126177)) >>> 0) / 4294967296;
  }

  // the ring: arcs of uneven weight with a few gaps, and short tendrils of ink
  const ring = $derived.by(() => {
    const R = seeded(word), arcs = [], tendrils = [];
    let a = R() * Math.PI * 2;
    const end = a + Math.PI * 2;
    while (a < end - 0.2) {
      const len = 0.5 + R() * 1.3, gap = R() < 0.35 ? 0.06 + R() * 0.12 : 0.015;
      const b = Math.min(end, a + len);
      const r = 44 + (R() - 0.5) * 1.6;
      arcs.push({ d: `M${50 + r * Math.cos(a)} ${50 + r * Math.sin(a)}A${r} ${r} 0 0 1 ${50 + r * Math.cos(b)} ${50 + r * Math.sin(b)}`, w: 1.4 + R() * 2.6 });
      if (R() < 0.45) {
        const t = a + (b - a) * R(), out = R() < 0.5 ? 1 : -1, l = 2 + R() * 5;
        tendrils.push({ d: `M${50 + 44 * Math.cos(t)} ${50 + 44 * Math.sin(t)}L${50 + (44 + out * l) * Math.cos(t + 0.02)} ${50 + (44 + out * l) * Math.sin(t + 0.02)}`, w: 0.8 + R() * 1.4 });
      }
      a = b + gap;
    }
    return { arcs, tendrils };
  });
</script>

<svg viewBox="0 0 100 100" width={size} height={size} class="sigil {state}" class:glow aria-hidden="true">
  {#each ring.arcs as arc}
    <path d={arc.d} fill="none" stroke="currentColor" stroke-width={arc.w} stroke-linecap="round" />
  {/each}
  {#each ring.tendrils as t}
    <path d={t.d} fill="none" stroke="currentColor" stroke-width={t.w} stroke-linecap="round" />
  {/each}
  {#if state !== "unseen" && word && GLYPHS[word]}
    <g transform="translate(50 50) scale(0.86) translate(-50 -50)">{@html GLYPHS[word]}</g>
  {/if}
</svg>

<style>
  .sigil { display: block; overflow: visible; color: var(--ink); }
  .guess { color: var(--ink-2); }
  .unseen { color: var(--hair-2); }
  .glow { filter: drop-shadow(0 0 5px rgba(201, 169, 110, 0.35)); }
</style>
