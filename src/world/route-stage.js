// world/route-stage.js — the town staged the Kentucky Route Zero way, in three.js.
//
// A port of interactions_library's Route Scene (tools/world-scene/route-scene.html), fed by this
// game's world instead of its own:
//
//   camera    orthographic, fixed framing; a drag turns the set a little and tilts it, never orbits
//   surfaces  unlit flat fills; colour comes only from stepped depth bands (StyleRecipes' shader)
//   light     ONE amber lantern, falling off with distance in hard steps. It hangs in the Old
//             Tower's crown, and moves to whatever place you're pointing at
//   lines     the town drawn from creature parts (creature-city.js) as thin pencil lines over
//             the solids; buildings and the tower are Spire Forge towers (creature-spire.js)
//   stage     the town on a flat floor, cut-out ridges and pines behind it, the road you came in
//             by, a moon at its phase on a painted backdrop
//   old ones  the game's own ecology sim (world/ecology.js), each creature its own Cybernetic
//             Ecology drawing, bent along its spine on the GPU like ecology-render.js FISH_VS
//
// Coordinates: the town's city-local frame (x, y on the ground; wall radius ~15.3) is three's
// (x, z), with y up. That is creature-city.js's own frame, so its meshes need no transform.
//
// Needs the classic scripts StyleRecipes, CityWFC, CreatureArch, CreatureSpire, CreatureCity,
// EcologySpecies and EcologySim on window (index.html loads them).

import * as THREE from "three";
import { SIM_CONFIG } from "./ecology.js";

const TAU = Math.PI * 2;
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// the looks, all Route Zero: sage dusk while you work, ultramarine while the night passes, rust
// under a blood moon (style-recipes.js recipes; the last is this game's own)
const LOOKS = {
  dusk: "route-zero",
  night: "route-blue",
  blood: { id: "blood", base: "route-zero", palette: { ink: "#1e0d08", fog: "#7c3b22", line: "#e8bfa4", warm: "#ff7a3c", sky: ["#140705", "#48190d", "#8c3b1c"], moon: "#d8391f" } },
};

// what stands on a building's cell: a Spire Forge template, its height, and whether it's lit
const BUILT = {
  shrine: { tpl: "shrine", h: 3.4, lit: true },
  cistern: { tpl: "hive", h: 2.6, lit: false },
  lamphouse: { tpl: "lighthouse", h: 4.6, lit: true },
  foundry: { tpl: "spire", h: 3.8, lit: true },
  wardstone: { tpl: "shrine", h: 2.2, lit: false },
  harvest: { tpl: "hive", h: 3.2, lit: true },
};
const WATER = new Set(["qanat", "ab-anbar", "pool-garden", "garden-canal", "fountain"]);

const VIEW = { az: -0.55, el: 0.1, h: 25, target: new THREE.Vector3(0, 5.4, 0) };
const LINE_W = 0.03;          // creature stroke width on stage, world units
const ECO_Y = [2.4, 11];      // the creatures' height band: the tank's depth, bottom to top
const K = 20;                 // joints along a creature's spine
const CREATURE_SCALE = 0.62;  // the sim's creatures are drawn for a top view; on stage they read smaller

// ── the one shader: StyleRecipes' shading chunk; flat fill from stepped depth ──────────────────
const VS = /* glsl */ `
  varying vec3 vW; varying float vD; varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const fsOf = (SR) => /* glsl */ `
  ${SR.GLSL}
  uniform float uTone, uLine, uBandFix;
  varying vec3 vW; varying float vD; varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(stShade(vW, vec3(0.0), uLine, uTone, uBandFix), 1.0);
    #include <colorspace_fragment>
  }`;

function geomFromLines(pos) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); return g; }
function geomFromMesh(m) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(m.positions, 3)); g.setIndex(new THREE.BufferAttribute(m.indices, 1)); return g; }
// city line groups are instanced (one variant, many matrices): bake them into one flat buffer
function bakeGroups(groups) {
  let n = 0; for (const g of groups) n += g.geom.positions.length * g.matrices.length;
  const out = new Float32Array(n); let o = 0;
  for (const g of groups) { const p = g.geom.positions; for (const m of g.matrices) for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    out[o++] = m[0] * x + m[4] * y + m[8] * z + m[12]; out[o++] = m[1] * x + m[5] * y + m[9] * z + m[13]; out[o++] = m[2] * x + m[6] * y + m[10] * z + m[14]; } }
  return out;
}
// lighter line work: keep the longest segments (the drawing's structure), drop the finest grain
function thin(seg, budget) {
  const n = seg.length / 6; if (n <= budget) return seg;
  const len = new Float32Array(n);
  for (let i = 0; i < n; i++) { const o = i * 6; len[i] = Math.hypot(seg[o + 3] - seg[o], seg[o + 4] - seg[o + 1], seg[o + 5] - seg[o + 2]); }
  const cut = Float32Array.from(len).sort()[n - budget];
  const out = new Float32Array(budget * 6); let k = 0;
  for (let i = 0; i < n && k < budget; i++) if (len[i] >= cut) { out.set(seg.subarray(i * 6, i * 6 + 6), k * 6); k++; }
  return out.subarray(0, k * 6);
}
// a ridge as a vertical cut-out band along an arc: flat card, ragged top
function ridgeBand(R, radius, a0, a1, hMin, hMax, n) {
  const ph = [R() * TAU, R() * TAU, R() * TAU], k = [1 + R() * 2, 3 + R() * 3, 8 + R() * 6], pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + (a1 - a0) * t, v = 0.55 * Math.sin(t * k[0] * Math.PI + ph[0]) + 0.3 * Math.sin(t * k[1] * Math.PI + ph[1]) + 0.15 * Math.sin(t * k[2] * Math.PI + ph[2]);
    const edge = Math.min(1, Math.min(t, 1 - t) * 5), h = (hMin + (hMax - hMin) * (0.5 + 0.5 * v)) * Math.sin((edge * Math.PI) / 2);
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    pos.push(x, -0.2, z, x, h, z);
    if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
// pines: flat spikes, each a single card turned to face the default view
function pineGeom(R, pts, face) {
  const pos = [], idx = [];
  for (const [x, z, h] of pts) {
    const w = h * (0.2 + R() * 0.07), tiers = 6 + Math.floor(R() * 4), ux = Math.cos(face), uz = -Math.sin(face), outline = [[0, h]];
    const right = [], left = [];
    for (let i = 1; i <= tiers; i++) { const t = i / tiers, y = h - h * 0.9 * t, tw = w * Math.pow(t, 0.85) * (0.75 + R() * 0.45); right.push([tw, y], [tw * 0.3, y + h * 0.025]); left.push([-tw * (0.85 + R() * 0.3), y], [-tw * 0.3, y + h * 0.025]); }
    outline.push(...right, [w * 0.06, 0], [-w * 0.06, 0], ...left.reverse());
    const b = pos.length / 3; pos.push(x, h * 0.45, z);
    for (const [u, y] of outline) pos.push(x + ux * u, y, z + uz * u);
    for (let i = 1; i < outline.length; i++) idx.push(b, b + i, b + i + 1);
    idx.push(b, b + outline.length, b + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
// a cell's footprint on the ground, as triangles (ring 0 is a disc)
function sectorTris(c, y, out) {
  if (c.ring === 0) {
    const n = 40;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, b = ((i + 1) / n) * TAU; out.push(0, y, 0, Math.cos(b) * c.r1, y, Math.sin(b) * c.r1, Math.cos(a) * c.r1, y, Math.sin(a) * c.r1); }
    return;
  }
  const n = Math.max(2, Math.ceil((c.a1 - c.a0) / 0.06));
  for (let i = 0; i < n; i++) {
    const a = c.a0 + ((c.a1 - c.a0) * i) / n, b = c.a0 + ((c.a1 - c.a0) * (i + 1)) / n;
    const p = (r, t) => [Math.cos(t) * r, y, Math.sin(t) * r];
    out.push(...p(c.r0, a), ...p(c.r1, b), ...p(c.r1, a), ...p(c.r0, a), ...p(c.r0, b), ...p(c.r1, b));
  }
}
// a cell's outline, as line segments
function sectorLines(c, y, out, inset = 0) {
  const arc = (r, a0, a1) => { const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.05)); for (let i = 0; i < n; i++) { const a = a0 + ((a1 - a0) * i) / n, b = a0 + ((a1 - a0) * (i + 1)) / n; out.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); } };
  if (c.ring === 0) { arc(c.r1 - inset, 0, TAU); return; }
  const r0 = c.r0 + inset, r1 = c.r1 - inset, d = inset / Math.max(1, (c.r0 + c.r1) / 2), a0 = c.a0 + d, a1 = c.a1 - d;
  arc(r1, a0, a1); arc(r0, a0, a1);
  for (const a of [a0, a1]) out.push(Math.cos(a) * r0, y, Math.sin(a) * r0, Math.cos(a) * r1, y, Math.sin(a) * r1);
}

// ── the old ones' drawings (Route Scene's port of ecology-render.js) ─────────────────────────────
const b64 = (str, T) => { const bin = atob(str), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new T(u8.buffer); };
function outlineOf(fV, fI) {
  const cnt = new Map(), ab = new Map(), add = (a, b) => { const k = a < b ? a * 65536 + b : b * 65536 + a; cnt.set(k, (cnt.get(k) || 0) + 1); if (!ab.has(k)) ab.set(k, [a, b]); };
  for (let t = 0; t < fI.length; t += 3) { add(fI[t], fI[t + 1]); add(fI[t + 1], fI[t + 2]); add(fI[t + 2], fI[t]); }
  const v = [], i = [];
  for (const [k, c] of cnt) { if (c !== 1) continue; const [ia, ib] = ab.get(k), ax = fV[ia * 3], ay = fV[ia * 3 + 1], ap = fV[ia * 3 + 2], bx = fV[ib * 3], by = fV[ib * 3 + 1], bp = fV[ib * 3 + 2];
    let dx = bx - ax, dy = by - ay; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; const n = v.length / 5;
    v.push(ax, ay, -dy, dx, ap, ax, ay, dy, -dx, ap, bx, by, -dy, dx, bp, bx, by, dy, -dx, bp); i.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
  return { v: new Float32Array(v), i: new Uint32Array(i) };
}
function prepare(ES, sp) {
  const fV = sp.fillV ? b64(sp.fillV, Float32Array) : new Float32Array(0), fI = sp.fillI ? b64(sp.fillI, Uint16Array) : new Uint16Array(0);
  let lV = sp.lineV ? b64(sp.lineV, Float32Array) : new Float32Array(0), lI = sp.lineI ? new Uint32Array(b64(sp.lineI, Uint16Array)) : new Uint32Array(0);
  if (!lV.length && fV.length) { const o = outlineOf(fV, fI); lV = o.v; lI = o.i; }
  const nP = sp.parts || 0, PT = sp.partTex || [], parts = [];
  for (let i = 0; i < nP; i++) { const o = i * 16; parts.push({ A: PT.slice(o, o + 4), B: PT.slice(o + 4, o + 8), R: PT.slice(o + 8, o + 12), Kf: PT.slice(o + 12, o + 16) }); }
  const ln = lV.length / 5, line = { n: ln, x: new Float32Array(ln), y: new Float32Array(ln), nx: new Float32Array(ln), ny: new Float32Array(ln), part: new Uint16Array(ln), idx: lI };
  for (let i = 0; i < ln; i++) { line.x[i] = lV[i * 5]; line.y[i] = lV[i * 5 + 1]; line.nx[i] = lV[i * 5 + 2]; line.ny[i] = lV[i * 5 + 3]; line.part[i] = Math.round(lV[i * 5 + 4]); }
  const fn = fV.length / 3, fill = { n: fn, x: new Float32Array(fn), y: new Float32Array(fn), part: new Uint16Array(fn), idx: new Uint32Array(fI) };
  for (let i = 0; i < fn; i++) { fill.x[i] = fV[i * 3]; fill.y[i] = fV[i * 3 + 1]; fill.part[i] = Math.round(fV[i * 3 + 2]); }
  return { key: sp.key, BY0: sp.bounds[1], LEN: sp.bounds[3] - sp.bounds[1], parts, keyT: sp.keyT || [], line, fill: fn ? fill : null, wing: (ES.WING && ES.WING[sp.key]) || 0.25 };
}
function keyed(kf, keyT, u) {
  const n = keyT.length; if (!n) return 0; if (n === 1) return kf[0];
  let i1 = 0; for (let i = 0; i < n; i++) if (keyT[i] <= u) i1 = i + 1;
  const i0 = (i1 + n - 1) % n; i1 %= n;
  let span = keyT[i1] - keyT[i0]; if (span <= 0) span += 1; let f = u - keyT[i0]; if (f < 0) f += 1;
  const e = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, f / span)));
  return kf[i0] + (kf[i1] - kf[i0]) * e;
}

// creature-parts.json, read once (CreatureCity and CreatureSpire build from it)
export async function loadStageParts(url) {
  if (!window.CreatureArch.ready) await window.CreatureArch.load(url);
}

export function createStage(canvas, { onFrame } = {}) {
  const SR = window.StyleRecipes, ES = window.EcologySpecies, Sim = window.EcologySim;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 900);

  const shared = SR.threeUniforms(THREE);
  const uLights = shared.uStLights.value;
  const FS = fsOf(SR);
  const fillMat = (tone, side, band) => new THREE.ShaderMaterial({ uniforms: { ...shared, uTone: { value: tone || 0 }, uLine: { value: 0 }, uBandFix: { value: band ?? -1 } }, vertexShader: VS, fragmentShader: FS,
    side: side || THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const lineMat = (tone) => new THREE.ShaderMaterial({ uniforms: { ...shared, uTone: { value: tone || 0 }, uLine: { value: 1 }, uBandFix: { value: -1 } }, vertexShader: VS, fragmentShader: FS });

  // ── the backdrop: a painted sky with stars, repainted as the look changes ──
  const backdrop = document.createElement("canvas"); backdrop.width = 1024; backdrop.height = 512;
  const backTex = new THREE.CanvasTexture(backdrop); backTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = backTex;
  const stars = (() => { const R = rng(77), s = []; for (let i = 0; i < 480; i++) s.push([R(), Math.pow(R(), 1.5) * 0.72, R() < 0.94 ? 1 : 2, 0.15 + R() * 0.6]); return s; })();
  function paintBackdrop(sky, moonCol, starLight) {
    const x = backdrop.getContext("2d"), W = backdrop.width, H = backdrop.height;
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sky[0]); g.addColorStop(0.62, sky[1]); g.addColorStop(1, sky[2]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = moonCol;
    for (const [sx, sy, s, a] of stars) { x.globalAlpha = a * starLight; x.fillRect(sx * W, sy * H, s, s); }
    x.globalAlpha = 1; backTex.needsUpdate = true;
  }

  // ── the moon: a flat disc at its phase, hung behind the set in screen space ──
  const moonCanvas = document.createElement("canvas"); moonCanvas.width = moonCanvas.height = 256;
  const moonTex = new THREE.CanvasTexture(moonCanvas); moonTex.colorSpace = THREE.SRGBColorSpace;
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false }));
  moon.renderOrder = -1; scene.add(moon);
  function paintMoon(index) {
    const x = moonCanvas.getContext("2d"), r = 40, c = 128;
    x.clearRect(0, 0, 256, 256);
    const g = x.createRadialGradient(c, c, r * 0.9, c, c, 128); g.addColorStop(0, `rgba(255,255,255,${0.06 + 0.05 * (4 - Math.abs(4 - index))})`); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.fillStyle = "rgba(255,255,255,0.13)"; x.beginPath(); x.arc(c, c, r, 0, TAU); x.fill();
    if (index === 0) { moonTex.needsUpdate = true; return; }
    // the lit part, the same terminator MoonGlyph draws (index 0 new … 4 full … 7)
    const p = index / 8, k = r / 10;
    let d;
    if (index === 4) d = "M0,-10 A10,10 0 1 1 0,10 A10,10 0 1 1 0,-10Z";
    else {
      const waxing = p < 0.5, tx = Math.abs(Math.cos(TAU * p)) * 10, gibbous = Math.abs(p - 0.5) < 0.25;
      d = `M0,-10 A10,10 0 0 ${waxing ? 1 : 0} 0,10 A${tx},10 0 0 ${waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1)} 0,-10Z`;
    }
    x.save(); x.translate(c, c); x.scale(k, k); x.fillStyle = "#fff"; x.fill(new Path2D(d)); x.restore();
    moonTex.needsUpdate = true;
  }

  // ── the lantern: a hot square of light and a soft glow around it ──
  const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.12, "rgba(255,255,255,0.45)"); g.addColorStop(0.4, "rgba(255,255,255,0.08)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c); })();
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff1cf });
  const lampGlow = new THREE.Sprite(glowMat); lampGlow.scale.set(5, 5, 1);
  const lampCore = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.36), coreMat);
  scene.add(lampGlow, lampCore);
  const lamp = { at: new THREE.Vector3(0, 6, 0), goal: new THREE.Vector3(0, 6, 0), radius: 8, radiusGoal: 8, home: new THREE.Vector3(0, 6, 0), homeR: 8 };

  // focus and hover outlines: gold, drawn over everything so a pointed-at place always shows
  const focusMat = new THREE.LineBasicMaterial({ color: 0xf0c27a, transparent: true, opacity: 0.95, depthTest: false });
  const hoverMat = new THREE.LineBasicMaterial({ color: 0xe9e1cf, transparent: true, opacity: 0.45, depthTest: false });
  const focusLines = new THREE.LineSegments(new THREE.BufferGeometry(), focusMat); focusLines.renderOrder = 10;
  const hoverLines = new THREE.LineSegments(new THREE.BufferGeometry(), hoverMat); hoverLines.renderOrder = 9;
  scene.add(focusLines, hoverLines);

  let set = null;            // the built set for the current town

  function tower(tpl, seed, height) {
    const CS = window.CreatureSpire, g = CS.newGenome(tpl, seed), built = CS.buildSpireGL2(g, { unit: 1, color: [1, 1, 1], forceColor: true });
    const s = height / Math.max(0.01, built.top);
    return { built, s, crownY: (built.crownY || built.top * 0.85) * s, top: built.top * s };
  }
  function standTower(t, x, z, mats, fills, lines, budget) {
    const m = new THREE.Matrix4().makeTranslation(x, 0, z).multiply(new THREE.Matrix4().makeScale(t.s, t.s, t.s));
    const f = new THREE.Mesh(geomFromMesh(t.built.occluder), mats.city); f.applyMatrix4(m); fills.add(f);
    const l = new THREE.LineSegments(geomFromLines(thin(t.built.lines.positions, budget)), mats.lines); l.applyMatrix4(m); lines.add(l);
  }

  // ── build the set for a town ──────────────────────────────────────────────────────────────
  function build(game) {
    const town = game.town, seed = (town.seed ?? 1) >>> 0;
    if (set) { scene.remove(set.root); set.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== glowMat && o.material !== coreMat) o.material.dispose(); }); }
    const root = new THREE.Group(), R = rng(seed ^ 0x5eed);
    const mats = { city: fillMat(-0.14), pine: fillMat(0, THREE.DoubleSide), floor: fillMat(0.02), street: fillMat(0.1), water: fillMat(0.22), green: fillMat(-0.04), lines: lineMat(0) };
    const fills = new THREE.Group(), lines = new THREE.Group(); root.add(fills, lines);
    const back = VIEW.az + Math.PI;   // upstage: the side away from the audience
    const STREETS = new Set(window.CityWFC.STREET_KINDS || []);

    // the ground plan: each cell's footprint, by what it is (water paler, groves darker)
    const ground = { floor: [], street: [], water: [], green: [] };
    for (const c of town.cells) {
      const id = town.tileAt(c.id).id;
      sectorTris(c, 0.004, ground[WATER.has(id) ? "water" : c.zone === "garden" ? "green" : STREETS.has(id) ? "street" : "floor"]);
    }
    for (const [k, pos] of Object.entries(ground)) {
      if (!pos.length) continue;
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      fills.add(new THREE.Mesh(geo, mats[k]));
    }

    // the town itself, built from creature parts on the WFC plan (buildings' own cells build nothing)
    const city = window.CreatureCity.build({ cells: town.cells, tiles: town.tiles, result: town.result, order: town.order }, seed, {});
    if (city) {
      fills.add(new THREE.Mesh(geomFromMesh(city.occluder), mats.city));
      lines.add(new THREE.LineSegments(geomFromLines(thin(bakeGroups(city.groups), 220000)), mats.lines));
    }

    // the Old Tower at the centre carries the lantern; buildings stand on their pinned cells
    const hub = tower("spire", seed ^ 0x707, 9.5);
    standTower(hub, 0, 0, mats, fills, lines, 40000);
    lamp.home.set(0, hub.crownY * 0.82, 0); lamp.homeR = 4 + hub.top * 0.5;
    const lit = [];
    for (const [cellId, kind] of town.pins) {
      const spec = BUILT[kind] || BUILT.shrine, p = town.centroid(cellId);
      const t = tower(spec.tpl, (seed ^ Math.imul(cellId + 1, 2654435761)) >>> 0, spec.h);
      standTower(t, p.x, p.y, mats, fills, lines, 16000);
      if (spec.lit) lit.push({ at: new THREE.Vector3(p.x, t.crownY * 0.7, p.y), r: 1.2 + t.top * 0.3 });
    }

    // the outskirts: lonely towers and shrines out in the country, upstage, a few lit
    const out = [];
    for (let i = 0; i < 80 && out.length < 9; i++) {
      const a = back + (R() - 0.5) * 3.6, r = 22 + Math.pow(R(), 0.7) * 34, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.cos(a - VIEW.az) > 0.4) continue;    // keep the sightline to the town clear
      if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 7)) continue;
      out.push({ x, z, t: tower(["shrine", "hive", "spire", "lighthouse", "shrine"][Math.floor(R() * 5)], Math.floor(R() * 1e9), 1.8 + R() * 3.4), lit: R() < 0.4 });
    }
    for (const o of out) { standTower(o.t, o.x, o.z, mats, fills, lines, 8000); if (o.lit) lit.push({ at: new THREE.Vector3(o.x, o.t.crownY * 0.7, o.z), r: 1 + o.t.top * 0.22 }); }

    // lit windows: the second to eighth lights, a glow and a hot core each
    for (let i = 1; i < 8; i++) uLights[i].set(0, -999, 0, 0);
    lit.slice(0, 7).forEach((L, i) => {
      uLights[i + 1].set(L.at.x, L.at.y, L.at.z, L.r);
      const g = new THREE.Sprite(glowMat); g.scale.set(1.4, 1.4, 1); g.position.copy(L.at); root.add(g);
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.18), coreMat); c.position.copy(L.at); c.userData.face = true; root.add(c);
    });

    // the road you came in by: it leaves the gate nearest the audience's left and winds out downstage
    const want = VIEW.az - 0.55;
    const gate = town.cells.filter((c) => town.tileAt(c.id).id === "gate").sort((a, b) => Math.cos((b.a0 + b.a1) / 2 - want) - Math.cos((a.a0 + a.a1) / 2 - want))[0];
    const ra = gate ? (gate.a0 + gate.a1) / 2 : want, bend = Math.sign(Math.sin(want - ra)) || 1, road = [];
    for (let i = 0; i <= 36; i++) { const t = i / 36, r = town.outerRadius + t * 70, a = ra + Math.sin(t * 5) * 0.1 * t + t * 0.3 * bend; road.push([Math.cos(a) * r, Math.sin(a) * r]); }
    {
      const pos = [], idx = [];
      road.forEach(([x, z], i) => { const [px, pz] = road[Math.max(0, i - 1)], [nx, nz] = road[Math.min(road.length - 1, i + 1)], dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz) || 1, w = 0.6 + i * 0.02;
        pos.push(x - (dz / l) * w, 0.02, z + (dx / l) * w, x + (dz / l) * w, 0.02, z - (dx / l) * w); if (i) { const b = (i - 1) * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } });
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
      fills.add(new THREE.Mesh(geo, fillMat(0.12, THREE.DoubleSide)));
      // telegraph poles and sagging wire beside it
      const seg = [], tops = [];
      for (let i = 2; i < road.length; i += 3) { const [x, z] = road[i], [nx, nz] = road[Math.min(road.length - 1, i + 1)], dx = nx - x, dz = nz - z, l = Math.hypot(dx, dz) || 1, ox = x - (dz / l) * 1.6, oz = z + (dx / l) * 1.6, h = 2;
        seg.push(ox, 0, oz, ox, h, oz, ox - (dx / l) * 0.4, h * 0.93, oz - (dz / l) * 0.4, ox + (dx / l) * 0.4, h * 0.93, oz + (dz / l) * 0.4); tops.push([ox, h * 0.93, oz]); }
      for (let i = 1; i < tops.length; i++) { const a = tops[i - 1], b = tops[i]; let px = a[0], py = a[1], pz = a[2];
        for (let k = 1; k <= 8; k++) { const t = k / 8, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * 0.28; seg.push(px, py, pz, x, y, z); px = x; py = y; pz = z; } }
      lines.add(new THREE.LineSegments(geomFromLines(new Float32Array(seg)), mats.lines));
    }

    // the floor, ridges in rings upstage (farther = paler by the depth bands), wings either side
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1400, 160).rotateX(-Math.PI / 2), mats.floor);
    floor.position.set(Math.cos(VIEW.az) * 1330, -0.02, Math.sin(VIEW.az) * 1330); fills.add(floor);
    [[40, 1.2, 3], [52, 1.8, 4.2], [66, 2.6, 5.6], [82, 3.2, 7.4]].forEach(([r, h0, h1], i) => {
      const span = 3.3 + i * 0.12, a0 = back - span / 2 + (R() - 0.5) * 0.3;
      fills.add(new THREE.Mesh(ridgeBand(R, r, a0, a0 + span, h0, h1, 90), fillMat(0, THREE.DoubleSide, [0.5, 0.64, 0.8, 0.94][i])));
    });
    for (const side of [-1, 1]) { const a = VIEW.az + side * 0.66; fills.add(new THREE.Mesh(ridgeBand(R, 58, a - 0.2, a + 0.2, 2, 5.5, 40), fillMat(0, THREE.DoubleSide, 0))); }
    // pines between the town and the ridges, in clumps, and tall ones in the wings
    const pts = [];
    for (let c = 0; c < 22; c++) { const a = back + (R() - 0.5) * 3.4, r = 19 + R() * 50, cx = Math.cos(a) * r, cz = Math.sin(a) * r, sz = 1 + R() * 3, n = 3 + Math.floor(R() * 12);
      for (let i = 0; i < n; i++) { const b = R() * TAU, q = Math.sqrt(R()) * sz; pts.push([cx + Math.cos(b) * q, cz + Math.sin(b) * q, 0.8 + R() * 1.8 + r * 0.02]); } }
    for (let i = 0; i < 50; i++) { const a = back + (R() - 0.5) * 3.6, r = 18 + R() * 60; pts.push([Math.cos(a) * r, Math.sin(a) * r, 0.6 + R() * 2]); }
    for (const side of [-1, 1]) for (let i = 0; i < 14; i++) { const a = VIEW.az + side * (0.52 + R() * 0.28), r = 40 + R() * 20; pts.push([Math.cos(a) * r, Math.sin(a) * r, 3 + R() * 6]); }
    fills.add(new THREE.Mesh(pineGeom(R, pts, VIEW.az + Math.PI / 2), mats.pine));

    scene.add(root);
    set = { root, town, flock: makeFlock(game.eco, root) };
    lamp.at.copy(lamp.home); lamp.goal.copy(lamp.home); lamp.radius = lamp.radiusGoal = lamp.homeR;
    hoverId = null; setHover(null);
    setFocus(focusIds);
  }

  // ── the old ones over the town ─────────────────────────────────────────────────────────────
  const meshes = new Map();
  const MAXF = 220, ROW_SPINE = K * 3, PART_TEXELS = 5;
  let MAXP = 1; for (const sp of ES.SPECIES) MAXP = Math.max(MAXP, sp.parts || 0);
  const TEX_W = ROW_SPINE + MAXP * PART_TEXELS;
  const spineData = new Float32Array(TEX_W * MAXF * 4);
  const spineTex = new THREE.DataTexture(spineData, TEX_W, MAXF, THREE.RGBAFormat, THREE.FloatType);
  spineTex.minFilter = spineTex.magFilter = THREE.NearestFilter;
  const CREATURE_VS = /* glsl */ `
    uniform sampler2D uSpine; uniform float uRow, uSc, uLW, uBY0, uLEN, uStroke;
    attribute vec2 aNrm; attribute float aPart;
    varying vec3 vW; varying float vD; varying vec2 vUv;
    vec4 tx(int i) { return texelFetch(uSpine, ivec2(i, int(uRow + 0.5)), 0); }
    void main() {
      vec2 p = position.xy;
      if (uStroke > 0.5) p += aNrm * (uLW / max(uSc, 1e-6));
      int base = ${ROW_SPINE} + int(aPart + 0.5) * ${PART_TEXELS};
      vec4 h = tx(base);
      float s, along = 0.0;
      if (h.x > 0.5) {
        for (int k = 0; k < 4; k++) { if (float(k) >= h.w) break; vec4 op = tx(base + 1 + k); vec2 d = p - op.xy; p = op.xy + vec2(d.x * op.z - d.y * op.w, d.x * op.w + d.y * op.z); }
        s = h.y; along = (p.y - h.z) * uSc;
      } else s = (p.y - uBY0) / uLEN;
      float fk = clamp(s, 0.0, 1.0) * ${K - 1}.0; int i0 = min(${K - 2}, int(floor(fk))); float t = fk - float(i0);
      vec3 P = mix(tx(i0 * 3).xyz, tx(i0 * 3 + 3).xyz, t), T = mix(tx(i0 * 3 + 1).xyz, tx(i0 * 3 + 4).xyz, t), L = mix(tx(i0 * 3 + 2).xyz, tx(i0 * 3 + 5).xyz, t);
      float ext = s < 0.0 ? s * uLEN * uSc : (s > 1.0 ? (s - 1.0) * uLEN * uSc : 0.0);
      vec3 w = P + L * (p.x * uSc) + T * (along + ext);
      vW = w; vUv = vec2(0.0);
      vec4 mv = viewMatrix * vec4(w, 1.0); vD = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`;
  function meshFor(sp) {
    let m = meshes.get(sp.key);
    if (!m && (typeof sp.lineV === "string" || typeof sp.fillV === "string")) { m = prepare(ES, sp); meshes.set(sp.key, m); }
    return m || null;
  }
  function speciesGeoms(m) {
    if (m.geoms) return m.geoms;
    const mk = (src, stroke) => { const g = new THREE.BufferGeometry(), pos = new Float32Array(src.n * 3), nrm = new Float32Array(src.n * 2), part = new Float32Array(src.n);
      for (let i = 0; i < src.n; i++) { pos[i * 3] = src.x[i]; pos[i * 3 + 1] = src.y[i]; part[i] = src.part[i]; if (stroke) { nrm[i * 2] = src.nx[i]; nrm[i * 2 + 1] = src.ny[i]; } }
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aNrm", new THREE.BufferAttribute(nrm, 2)); g.setAttribute("aPart", new THREE.BufferAttribute(part, 1));
      g.setIndex(new THREE.BufferAttribute(src.idx, 1)); return g; };
    m.geoms = { line: mk(m.line, true), fill: m.fill ? mk(m.fill, false) : null };
    return m.geoms;
  }
  const creatureMat = (isLine, m, row) => new THREE.ShaderMaterial({
    uniforms: { ...shared, uTone: { value: isLine ? 0.05 : -0.06 }, uLine: { value: isLine ? 1 : 0 }, uBandFix: { value: -1 },
      uSpine: { value: spineTex }, uRow: { value: row }, uSc: { value: 1 }, uLW: { value: LINE_W }, uBY0: { value: m.BY0 }, uLEN: { value: m.LEN }, uStroke: { value: isLine ? 1 : 0 } },
    vertexShader: CREATURE_VS, fragmentShader: FS, side: THREE.DoubleSide, polygonOffset: !isLine, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });

  function makeFlock(eco, root) {
    const group = new THREE.Group(); root.add(group);
    const S = eco.toCity({ x: 1, y: 0 }).x - eco.toCity({ x: 0, y: 0 }).x;   // tank units → city units
    return { eco, group, S, live: new Map(), free: Array.from({ length: MAXF }, (_, i) => MAXF - 1 - i) };
  }
  const SP = new Float32Array(K * 9);
  function pose(fl, f, m) {
    const sim = fl.eco.sim, S = fl.S, W = sim.bounds.w, H = sim.bounds.h, TD = Math.max(60, Math.min(W, H) * 0.9 * SIM_CONFIG.dz);
    const swim = ES.SPECIES[f.sp].swim, bl = Sim.bodyLen(sim, f), A = SIM_CONFIG.wiggle * bl * swim.amp, c = f.chain, pts = [];
    for (let k = 0; k < K; k++) {
      const s = k / (K - 1), k0 = Math.max(0, k - 1), k1 = Math.min(K - 1, k + 1);
      let tx = c[k1 * 2] - c[k0 * 2], ty = c[k1 * 2 + 1] - c[k0 * 2 + 1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const off = A * (0.12 + 0.88 * Math.pow(s, swim.ampPow)) * Math.sin(f.phase - s * TAU * swim.waves);
      pts.push([(c[k * 2] + ty * off - W / 2) * S, ECO_Y[0] + (1 - f.cz[k] / TD) * (ECO_Y[1] - ECO_Y[0]), (c[k * 2 + 1] - tx * off - H / 2) * S]);
    }
    for (let k = 0; k < K; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(K - 1, k + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let sx = -tz, sz = tx; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
      const ux = -sz * ty, uy = sz * tx - sx * tz, uz = sx * ty, r = f.croll ? f.croll[k] : 0, cr = Math.cos(r), sr = Math.sin(r), o = k * 9;
      SP[o] = pts[k][0]; SP[o + 1] = pts[k][1]; SP[o + 2] = pts[k][2]; SP[o + 3] = tx; SP[o + 4] = ty; SP[o + 5] = tz;
      SP[o + 6] = ux * cr + sx * sr; SP[o + 7] = uy * cr; SP[o + 8] = uz * cr + sz * sr;
    }
    const ph = f.phase, u = (((ph * 0.5) / TAU) % 1 + 1) % 1, ops = [];
    const angle = (P) => { const g = P.A[0], side = P.A[1] === 0 ? 1 : P.A[1];
      const beat = g < 2.5 ? P.R[0] * Math.sin(ph * 0.7 - P.R[1]) : P.R[0] * (f.flap ?? 1) * Math.sin(ph * 0.5 - P.R[1]);
      const fold = Math.abs(P.A[1]) * side * (0.65 * (f.tuck || 0) + 0.45 * Math.max(0, (f.turnS || 0) * side) - 0.3 * (f.glide || 0) - 0.55 * (f.puff || 0));
      return beat + keyed(P.Kf, m.keyT, u) + (g < 2.5 ? fold * 0.4 : fold); };
    for (let i = 0; i < m.parts.length; i++) {
      const P = m.parts[i], g = P.A[0];
      if (!((g > 1.5 && g < 2.5) || g > 3.5)) { ops.push(null); continue; }
      const chain = [[P.A[2], P.A[3], angle(P) * (1 - 0.55 * m.wing)]];
      let j = P.R[2] < -0.5 ? -1 : Math.round(P.R[2]);
      for (let n = 0; n < 3 && j >= 0 && j < m.parts.length; n++) { const Q = m.parts[j]; chain.push([Q.A[2], Q.A[3], angle(Q)]); j = Q.R[2] < -0.5 ? -1 : Math.round(Q.R[2]); }
      ops.push({ ancY: P.R[3], s: (P.R[3] - m.BY0) / m.LEN, rot: chain.map(([x, y, a]) => [x, y, Math.cos(a), Math.sin(a)]) });
    }
    const fade = f.fade == null ? 1 : Math.min(1, f.fade);
    return { sc: (bl / m.LEN) * S * fade * CREATURE_SCALE, ops };
  }
  function writeRow(row, ps, m) {
    const o = row * TEX_W * 4;
    for (let k = 0; k < K; k++) for (let j = 0; j < 3; j++) { const q = o + (k * 3 + j) * 4, src = k * 9 + j * 3; spineData[q] = SP[src]; spineData[q + 1] = SP[src + 1]; spineData[q + 2] = SP[src + 2]; }
    for (let i = 0; i < m.parts.length; i++) {
      const op = ps.ops[i], q = o + (ROW_SPINE + i * PART_TEXELS) * 4;
      if (!op) { spineData[q] = 0; continue; }
      spineData[q] = 1; spineData[q + 1] = op.s; spineData[q + 2] = op.ancY; spineData[q + 3] = op.rot.length;
      op.rot.forEach((r, k) => spineData.set(r, q + (k + 1) * 4));
    }
  }
  function dropEntry(fl, f, e) { for (const o of [e.line, e.fill]) if (o) { fl.group.remove(o); o.material.dispose(); } fl.free.push(e.row); fl.live.delete(f); }
  function entryFor(fl, f, m) {
    let e = fl.live.get(f);
    if (e && e.key === m.key) return e;
    if (e) dropEntry(fl, f, e);
    if (!fl.free.length) return null;
    const row = fl.free.pop(), g = speciesGeoms(m), mk = (geo, isLine) => { const o = new THREE.Mesh(geo, creatureMat(isLine, m, row)); o.frustumCulled = false; fl.group.add(o); return o; };
    e = { key: m.key, row, line: mk(g.line, true), fill: g.fill ? mk(g.fill, false) : null };
    fl.live.set(f, e); return e;
  }
  function updateFlock(fl) {
    const seen = new Set();
    for (const f of fl.eco.sim.fish) {
      if (f.dead) continue;
      const m = meshFor(ES.SPECIES[f.sp]); if (!m) continue;
      const e = entryFor(fl, f, m); if (!e) continue;
      const ps = pose(fl, f, m);
      writeRow(e.row, ps, m);
      e.line.material.uniforms.uSc.value = ps.sc; if (e.fill) e.fill.material.uniforms.uSc.value = ps.sc;
      seen.add(f);
    }
    for (const [f, e] of fl.live) if (!seen.has(f)) dropEntry(fl, f, e);
    spineTex.needsUpdate = true;
  }

  // ── the look: lerp the palette toward the moment's recipe ───────────────────────────────────
  const swatch = () => ({ ink: new THREE.Color(), fog: new THREE.Color(), line: new THREE.Color(), warm: new THREE.Color(), sky: [new THREE.Color(), new THREE.Color(), new THREE.Color()], moon: new THREE.Color() });
  const cur = swatch(), goal = swatch();
  let lookKey = null, settle = 1, starLight = 1, starGoal = 1, painted = false;
  function setLookColors(dst, P) { dst.ink.set(P.ink); dst.fog.set(P.fog); dst.line.set(P.line); dst.warm.set(P.warm); P.sky.forEach((c, i) => dst.sky[i].set(c)); dst.moon.set(P.moon); }
  function look(key) {
    if (key === lookKey) return;
    const first = lookKey == null; lookKey = key;
    const r = typeof LOOKS[key] === "string" ? SR.get(LOOKS[key]) : SR.resolve(LOOKS[key]);
    SR.applyThree(shared, r, THREE, { up: [0, 1, 0], sun: [-0.7, 0.55, 0.45] });
    setLookColors(goal, r.palette);
    if (first) setLookColors(cur, r.palette);
    settle = 0;
  }
  const hex = (c) => "#" + c.getHexString();
  function stepLook(dt) {
    if (painted && settle >= 1 && Math.abs(starLight - starGoal) < 0.01) return;
    painted = true;
    settle = Math.min(1, settle + dt * 0.8);
    const k = settle >= 1 ? 1 : Math.min(1, dt * 2.4);
    for (const n of ["ink", "fog", "line", "warm", "moon"]) cur[n].lerp(goal[n], k);
    cur.sky.forEach((c, i) => c.lerp(goal.sky[i], k));
    starLight += (starGoal - starLight) * k;
    shared.uStInk.value.copy(cur.ink); shared.uStFog.value.copy(cur.fog); shared.uStLine.value.copy(cur.line); shared.uStWarm.value.copy(cur.warm);
    glowMat.color.copy(cur.warm); moon.material.color.copy(cur.moon);
    paintBackdrop(cur.sky.map(hex), hex(cur.moon), starLight);
  }

  // ── the sky: the moon's phase and where it is in its arc ──
  let moonIndex = -1, moonT = 0.3, moonUp = true;
  function setSky({ index, blood, passing, t, up }) {
    if (index !== moonIndex) { moonIndex = index; paintMoon(index); }
    moonT = t; moonUp = up;
    look(blood ? "blood" : passing ? "night" : "dusk");
    starGoal = blood ? 0.5 : passing ? 1 : 0.65;
  }

  // ── focus: the cells of the place you're pointing at; the lantern goes to them ──
  let focusIds = [];
  function setFocus(ids) {
    focusIds = ids || [];
    const town = set && set.town;
    if (!town) return;
    const seg = [];
    for (const id of focusIds) if (town.cells[id]) sectorLines(town.cells[id], 0.05, seg, 0.12);
    focusLines.geometry.dispose(); focusLines.geometry = geomFromLines(new Float32Array(seg));
    let x = 0, z = 0, far = 0;
    for (const id of focusIds) { const p = town.centroid(id); x += p.x; z += p.y; }
    x /= focusIds.length || 1; z /= focusIds.length || 1;
    for (const id of focusIds) { const p = town.centroid(id); far = Math.max(far, Math.hypot(p.x - x, p.y - z)); }
    // one place, or one quarter: the lantern goes there. Something spread round the whole town
    // (the wall) only gets its outline; the lantern stays in the tower.
    if (focusIds.length && far < 9) { lamp.goal.set(x, 2.2 + far * 0.25, z); lamp.radiusGoal = 4 + far * 0.8; }
    else { lamp.goal.copy(lamp.home); lamp.radiusGoal = lamp.homeR; }
  }
  let hoverId = null;
  function setHover(id) {
    if (id === hoverId) return; hoverId = id;
    const seg = [];
    if (id != null && set && set.town.cells[id]) sectorLines(set.town.cells[id], 0.04, seg, 0.05);
    hoverLines.geometry.dispose(); hoverLines.geometry = geomFromLines(new Float32Array(seg));
  }

  // ── camera: fixed framing; drag turns and tilts it a little, the wheel zooms ──
  let turn = 0, turnGoal = 0, sway = 0, swayGoal = 0, zoom = 1, zoomGoal = 1;
  const right = new THREE.Vector3(), up = new THREE.Vector3(), fwd = new THREE.Vector3();
  function placeCamera(t) {
    const w0 = canvas.clientWidth || 1, h0 = canvas.clientHeight || 1, aspect = w0 / h0;
    const h = Math.max(VIEW.h, 35 / aspect) / zoom, w = h * aspect;
    cam.left = -w / 2; cam.right = w / 2; cam.top = h / 2; cam.bottom = -h / 2; cam.updateProjectionMatrix();
    // a tall, narrow stage (a phone) looks down a little more, so the town isn't a sliver
    const az = VIEW.az + turn + Math.sin(t * 0.07) * 0.01, el = VIEW.el + Math.max(0, 1.1 - aspect) * 0.2 + sway, d = 240;
    cam.position.set(VIEW.target.x + Math.cos(az) * Math.cos(el) * d, VIEW.target.y + Math.sin(el) * d, VIEW.target.z + Math.sin(az) * Math.cos(el) * d);
    cam.lookAt(VIEW.target);
    cam.updateMatrixWorld();
    shared.uStNear.value = d - 60; shared.uStFar.value = d + 100; shared.uStCam.value.copy(cam.position);
    lampCore.quaternion.copy(cam.quaternion);
    if (set) for (const o of set.root.children) if (o.userData.face) o.quaternion.copy(cam.quaternion);
    // the moon, in screen space behind everything: it crosses the sky as the night passes
    right.setFromMatrixColumn(cam.matrixWorld, 0); up.setFromMatrixColumn(cam.matrixWorld, 1); fwd.setFromMatrixColumn(cam.matrixWorld, 2).negate();
    const mx = (0.06 + 0.88 * moonT - 0.5) * w * 0.9, my = h * (0.06 + 0.36 * Math.sin(Math.PI * Math.min(1, moonT)));
    moon.position.copy(VIEW.target).addScaledVector(fwd, 400).addScaledVector(right, mx).addScaledVector(up, my);
    moon.scale.setScalar(h * 0.16);
    moon.visible = moonUp;
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function pick(clientX, clientY) {
    if (!set) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return set.town.cellAt(hit.x, hit.z);
  }
  const _v = new THREE.Vector3();
  function project(x, y, z) {
    _v.set(x, y, z).project(cam);
    return { x: ((_v.x + 1) / 2) * canvas.clientWidth, y: ((1 - _v.y) / 2) * canvas.clientHeight, behind: _v.z > 1 };
  }

  let drag = null;
  const onDown = (e) => { drag = { x: e.clientX, y: e.clientY, turn: turnGoal, sway: swayGoal, moved: false }; };
  const onMove = (e) => {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
    turnGoal = Math.max(-0.6, Math.min(0.6, drag.turn - (e.clientX - drag.x) * 0.003));
    swayGoal = Math.max(-0.08, Math.min(0.55, drag.sway + (e.clientY - drag.y) * 0.002));
  };
  const onUp = () => { drag = null; };
  const onWheel = (e) => { e.preventDefault(); zoomGoal = Math.max(0.7, Math.min(4, zoomGoal * Math.exp(-e.deltaY * 0.001))); };
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  function resize() { renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = performance.now(), raf = 0, stepSim = () => {};
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    turn += (turnGoal - turn) * Math.min(1, dt * 3); sway += (swayGoal - sway) * Math.min(1, dt * 3); zoom += (zoomGoal - zoom) * Math.min(1, dt * 4);
    stepLook(dt);
    lamp.at.lerp(lamp.goal, Math.min(1, dt * 3)); lamp.radius += (lamp.radiusGoal - lamp.radius) * Math.min(1, dt * 3);
    uLights[0].set(lamp.at.x, lamp.at.y, lamp.at.z, lamp.radius);
    lampGlow.position.copy(lamp.at); lampCore.position.copy(lamp.at);
    if (set) { if (!reduce) stepSim(dt); updateFlock(set.flock); }
    placeCamera(now / 1000);
    renderer.render(scene, cam);
    if (onFrame) onFrame();
    raf = requestAnimationFrame(frame);
  }
  look("dusk"); paintMoon(0);
  raf = requestAnimationFrame(frame);

  return {
    build, setFocus, setHover, setSky, pick, project,
    // the host decides when the sim runs (it doesn't while the night is fast-forwarded)
    set stepSim(fn) { stepSim = fn; },
    get dragging() { return !!(drag && drag.moved); },
    get town() { return set && set.town; },
    get eco() { return set && set.flock.eco; },
    // for checking: show or hide a layer ("fly" the old ones, "lines", "fills")
    layer(name, on) { if (!set) return; const g = { fly: set.flock.group, lines: set.root.children[1], fills: set.root.children[0] }[name]; if (g) g.visible = on; },
    get stats() { return renderer.info.render; },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); canvas.removeEventListener("wheel", onWheel);
      renderer.dispose();
    },
  };
}
