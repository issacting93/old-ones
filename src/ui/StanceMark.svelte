<script>
  // StanceMark — where the town stands with the old ones: a point inside a triangle whose
  // corners are Kinship, Distance and Dominion (content/stance.js).
  import { STANCES, readStance } from "../content/stance.js";
  let { stance, size = 64, labels = false } = $props();

  const corners = { kin: [0.5, 0.08], ward: [0.08, 0.86], bind: [0.92, 0.86] };
  const reading = $derived(readStance(stance));
  const dot = $derived.by(() => {
    const s = reading.shares;
    return Object.keys(corners).reduce((p, k) => [p[0] + corners[k][0] * s[k], p[1] + corners[k][1] * s[k]], [0, 0]);
  });
</script>

<svg viewBox="0 0 1 1" width={size} height={size} role="img" aria-label="Stance: {reading.label}">
  <polygon points="0.5,0.08 0.08,0.86 0.92,0.86" fill="none" stroke="var(--hair-2)" stroke-width="0.015" />
  {#each Object.entries(corners) as [k, [x, y]]}
    <circle cx={x} cy={y} r="0.035" fill={STANCES[k].color} />
  {/each}
  <circle cx={dot[0]} cy={dot[1]} r="0.06" fill="var(--ink)" />
</svg>
{#if labels}
  <div class="legend">
    {#each Object.entries(STANCES) as [k, s]}
      <span class="label" style="color:{s.color}">{s.name} {Math.round(reading.shares[k] * 100)}%</span>
    {/each}
  </div>
{/if}

<style>
  svg { display: block; overflow: visible; }
  .legend { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
</style>
