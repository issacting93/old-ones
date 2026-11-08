// core/graph.js — the brain: one causal graph per loop.
//
// Every link from the sentence you wrote to the person who went missing is recorded here as an
// edge: a word raised a building, the building thinned a species, the hungry species caused the
// disappearance, and the people who saw it hold the facts. Generators write the graph going
// forward; the reckoning reads it backwards to show you why it happened (design doc, "The brain").
//
// Nodes: { id, kind, label, ...data }. Edges: { from, to, rel }.
// Mandate's content graph (hazards that threaten, assets that mitigate) is the model.

export class Graph {
  nodes = new Map();
  edges = [];

  add(id, data) {
    if (!this.nodes.has(id)) this.nodes.set(id, { id, ...data });
    else Object.assign(this.nodes.get(id), data);
    return this.nodes.get(id);
  }

  has(id) { return this.nodes.has(id); }

  link(from, to, rel) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return;
    if (!this.edges.some((e) => e.from === from && e.to === to && e.rel === rel)) this.edges.push({ from, to, rel });
  }

  into(id) { return this.edges.filter((e) => e.to === id); }
  out(id) { return this.edges.filter((e) => e.from === id); }

  // Walk back from a node to its roots, breadth first. Returns layers: [[node], [causes], ...].
  causes(id, depth = 5) {
    const layers = [[this.nodes.get(id)]];
    const seen = new Set([id]);
    let frontier = [id];
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const n of frontier) for (const e of this.into(n)) {
        if (seen.has(e.from)) continue;
        seen.add(e.from);
        next.push(e.from);
      }
      if (!next.length) break;
      layers.push(next.map((n) => ({ ...this.nodes.get(n), rel: this.out(n).find((e) => frontier.includes(e.to))?.rel })));
      frontier = next;
    }
    return layers;
  }

  toJSON() { return { nodes: [...this.nodes.values()], edges: this.edges }; }
}
