// world/route-stage.js — the town staged flat, the Kentucky Route Zero way.
//
// Ported from interactions_library/tools/world-scene/route-scene.html (at 596b88a): the same shader
// (shared/style/style-recipes.js's Route Zero recipe), orthographic camera, painted backdrop, moon,
// lantern, ridges, pines, road and pilgrims, and the same GPU spine-bend for the creatures. What
// changed for the game:
//   - the city is the GAME'S town (world/town.js): the city grammar built from this loop's sigil
//     sentence, and World Layout's towers; Route Scene builds its own from a seed
//   - the creatures are the GAME'S simulation (world/ecology.js), drawn where it says they are
//   - the moon shows the night's phase and turns red under a blood moon; lanterns burn at the places
//     the town keeps lit
//   - focus(): a cut to a place with a Route Zero title card, when the player goes somewhere
//   - no Forge-world props, no story mode, no style menu
//
// Needs (classic scripts, loaded first): StyleRecipes, CreatureSpire, CityGrammar, CityGrammarMesh,
// WorldLayout, EcologySpecies, EcologySim.

import * as THREE from "three";

const TAU = Math.PI * 2;
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const LINE_SCALE = 0.3, LINE_BUDGET = Math.round(1.6e6 * LINE_SCALE);
const K = 20, MAXF = 220, PART_TEXELS = 5, LINE_W = 0.035;
const ECO_Y = [3, 15];
const VIEW = { az: -0.55, el: 0.085, h: 44, target: new THREE.Vector3(0, 6, 0) };

export function createStage(canvas, { eco }) {
  const SR = window.StyleRecipes, ES = window.EcologySpecies, Sim = window.EcologySim;
  const shared = SR.threeUniforms(THREE);
  shared.uLights = shared.uStLights;
  const VS = `
    varying vec3 vW; varying float vD; varying vec2 vUv;
    void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const FS = `
    ${SR.GLSL}
    uniform float uTone, uLine, uBandFix;
    uniform sampler2D uMap; uniform float uUseMap;
    varying vec3 vW; varying float vD; varying vec2 vUv;
    void main() {
      if (uUseMap > 0.5 && texture2D(uMap, vUv).a < 0.5) discard;
      gl_FragColor = vec4(stShade(vW, vec3(0.0), uLine, uTone, uBandFix), 1.0);
      #include <colorspace_fragment>
    }`;
  const fillMat = (tone, side, band) => new THREE.ShaderMaterial({ uniforms: { ...shared, uTone: { value: tone || 0 }, uLine: { value: 0 }, uBandFix: { value: band ?? -1 }, uMap: { value: null }, uUseMap: { value: 0 } }, vertexShader: VS, fragmentShader: FS,
    side: side || THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const lineMat = (tone) => new THREE.ShaderMaterial({ uniforms: { ...shared, uTone: { value: tone || 0 }, uLine: { value: 1 }, uBandFix: { value: -1 }, uMap: { value: null }, uUseMap: { value: 0 } }, vertexShader: VS, fragmentShader: FS });

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 700);
  const backdrop = document.createElement("canvas"); backdrop.width = 2048; backdrop.height = 1024;
  const backTex = new THREE.CanvasTexture(backdrop); backTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = backTex;

  // ── the look: Route Zero, with a red sky under a blood moon ─────────────────────────────────
  const look = SR.get("route-zero");
  let sky = { blood: false, light: 0.6 };
  function paintBackdrop(seed) {
    const P = look.palette, x = backdrop.getContext("2d"), R = rng(seed), W = backdrop.width, H = backdrop.height;
    const g = x.createLinearGradient(0, 0, 0, H);
    const stops = sky.blood ? ["#2a0d0b", "#5a1c14", "#8a3a22"] : P.sky;
    g.addColorStop(0, stops[0]); g.addColorStop(0.62, stops[1]); g.addColorStop(1, stops[2]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const stars = Math.round(900 * (1.15 - sky.light));   // fewer stars the brighter the moon
    for (let i = 0; i < stars; i++) { const sx = R() * W, sy = Math.pow(R(), 1.5) * H * 0.7, s = R() < 0.94 ? 1.4 : 2.6; x.globalAlpha = 0.15 + R() * 0.6; x.fillStyle = P.moon; x.fillRect(sx, sy, s, s); }
    x.globalAlpha = 1; backTex.needsUpdate = true;
  }
  // the moon: drawn at its phase (0 new … 4 full … 7), rust red under a blood moon
  const moonCanvas = document.createElement("canvas"); moonCanvas.width = moonCanvas.height = 512;
  const moonTex = new THREE.CanvasTexture(moonCanvas); moonTex.colorSpace = THREE.SRGBColorSpace;
  function paintMoon(index, blood) {
    const x = moonCanvas.getContext("2d"), c = 256, r = 80;
    x.clearRect(0, 0, 512, 512);
    if (index === 0 && !blood) { moonTex.needsUpdate = true; return; }
    const lit = blood ? "#d0533a" : "#ffffff";
    const g = x.createRadialGradient(c, c, 70, c, c, 256);
    g.addColorStop(0, blood ? "rgba(208,83,58,0.35)" : "rgba(255,255,255,0.3)"); g.addColorStop(0.4, blood ? "rgba(208,83,58,0.1)" : "rgba(255,255,255,0.08)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    x.save(); x.beginPath(); x.arc(c, c, r, 0, TAU); x.clip();
    x.fillStyle = "rgba(20,24,22,0.85)"; x.fillRect(c - r, c - r, 2 * r, 2 * r);   // the dark of the moon
    const p = blood ? 0.5 : index / 8, waxing = p < 0.5, tx = Math.abs(Math.cos(TAU * p)) * r, gibbous = Math.abs(p - 0.5) < 0.25;
    x.fillStyle = lit; x.beginPath();
    if (index === 4 || blood) x.arc(c, c, r, 0, TAU);
    else {
      x.arc(c, c, r, -Math.PI / 2, Math.PI / 2, !waxing);                 // the lit limb
      x.ellipse(c, c, tx, r, 0, Math.PI / 2, -Math.PI / 2, waxing ? !gibbous : gibbous); // back along the terminator
    }
    x.fill();
    x.fillStyle = "rgba(0,0,0,0.06)"; for (const [a, b, rr] of [[226, 236, 26], [280, 270, 18], [250, 290, 14], [296, 226, 12]]) { x.beginPath(); x.arc(a, b, rr, 0, TAU); x.fill(); }
    x.restore(); moonTex.needsUpdate = true;
  }
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false }));
  moon.scale.set(22, 22, 1); moon.renderOrder = -1;
  const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.12, "rgba(255,255,255,0.45)"); g.addColorStop(0.4, "rgba(255,255,255,0.08)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c); })();
  const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  lampGlow.scale.set(7, 7, 1);
  const lampCore = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff1cf }));

  function applyLook() {
    SR.applyThree(shared, look, THREE, { up: [0, 1, 0], sun: [-0.7, 0.55, 0.45] });
    const P = look.palette;
    if (sky.blood) { shared.uStFog.value.set(0.36, 0.13, 0.1); shared.uStWarm.value.set(0.95, 0.35, 0.22); }
    lampGlow.material.color.set(sky.blood ? "#e0583c" : P.warm);
    lampGlow.scale.setScalar(7 * look.light.glow / 0.42);
  }

  // ── geometry helpers (as Route Scene) ──────────────────────────────────────────────────────
  const geomFromLines = (pos) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); return g; };
  const geomFromMesh = (m) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(m.positions, 3)); g.setIndex(new THREE.BufferAttribute(m.indices, 1)); return g; };
  function thin(seg, budget) {
    const n = seg.length / 6; if (n <= budget) return seg;
    const len = new Float32Array(n);
    for (let i = 0; i < n; i++) { const o = i * 6; len[i] = Math.hypot(seg[o + 3] - seg[o], seg[o + 4] - seg[o + 1], seg[o + 5] - seg[o + 2]); }
    const cut = Float32Array.from(len).sort()[n - budget], out = new Float32Array(budget * 6); let k = 0;
    for (let i = 0; i < n && k < budget; i++) if (len[i] >= cut) { out.set(seg.subarray(i * 6, i * 6 + 6), k * 6); k++; }
    return out.subarray(0, k * 6);
  }
  function ridgeBand(R, radius, a0, a1, hMin, hMax, n) {
    const ph = [R() * TAU, R() * TAU, R() * TAU], k = [1 + R() * 2, 3 + R() * 3, 8 + R() * 6], pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = a0 + (a1 - a0) * t, v = 0.55 * Math.sin(t * k[0] * Math.PI + ph[0]) + 0.3 * Math.sin(t * k[1] * Math.PI + ph[1]) + 0.15 * Math.sin(t * k[2] * Math.PI + ph[2]);
      const edge = Math.min(1, Math.min(t, 1 - t) * 5), h = (hMin + (hMax - hMin) * (0.5 + 0.5 * v)) * Math.sin(edge * Math.PI / 2);
      const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
      pos.push(x, -0.2, z, x, h, z);
      if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
  }
  function pineGeom(R, pts, face) {
    const pos = [], idx = [];
    for (const [x, z, h] of pts) {
      const w = h * (0.2 + R() * 0.07), tiers = 6 + Math.floor(R() * 4), ux = Math.cos(face), uz = -Math.sin(face), outline = [[0, h]], right = [], left = [];
      for (let i = 1; i <= tiers; i++) { const t = i / tiers, y = h - h * 0.9 * t, tw = w * Math.pow(t, 0.85) * (0.75 + R() * 0.45); right.push([tw, y], [tw * 0.3, y + h * 0.025]); left.push([-tw * (0.85 + R() * 0.3), y], [-tw * 0.3, y + h * 0.025]); }
      outline.push(...right, [w * 0.06, 0], [-w * 0.06, 0], ...left.reverse());
      const b = pos.length / 3; pos.push(x, h * 0.45, z);
      for (const [u, y] of outline) pos.push(x + ux * u, y, z + uz * u);
      for (let i = 1; i < outline.length; i++) idx.push(b, b + i, b + i + 1);
      idx.push(b, b + outline.length, b + 1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
  }
  function spire(tpl, seed, height) {
    const g = window.CreatureSpire.newGenome(tpl, seed), built = window.CreatureSpire.buildSpireGL2(g, { unit: 1, color: [1, 1, 1], forceColor: true });
    const s = height / Math.max(0.01, built.top);
    return { built, s, crownY: (built.crownY || built.top * 0.85) * s, top: built.top * s };
  }

  // ── the set: built from the game's town ──────────────────────────────────────────────────────
  let world = null;
  const glows = [];
  function setTown(town) {
    if (world) { scene.remove(world.root); world.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    const root = new THREE.Group(), R = rng(town.seed), mats = { city: fillMat(-0.14), pine: fillMat(0, THREE.DoubleSide), floor: fillMat(0.02), lines: lineMat(0) };
    const fills = new THREE.Group(), lines = new THREE.Group(); root.add(fills, lines);
    const back = VIEW.az + Math.PI;
    const m = window.CityGrammarMesh.build(town.city, { tower: false, outskirts: false });
    const flat = (part) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(part.positions, 3)); return g; };
    fills.add(new THREE.Mesh(flat(m.ground), mats.floor), new THREE.Mesh(flat(m.water), fillMat(0.2)), new THREE.Mesh(flat(m.green), mats.pine), new THREE.Mesh(flat(m.bldg), mats.city));
    lines.add(new THREE.LineSegments(geomFromLines(thin(m.lines, LINE_BUDGET)), mats.lines));
    const towers = [];
    for (const lt of town.layout.towers) {
      const g = window.WorldLayout.towerGeometry(lt), lift = window.CityGrammar.groundY(Math.hypot(lt.x, lt.z));
      for (const sol of g.solids) { const o = new THREE.Mesh(geomFromMesh(sol), mats.city); o.position.y = lift; fills.add(o); }
      if (g.lines.length) { const o = new THREE.LineSegments(geomFromLines(thin(g.lines, Math.round((lt.hub ? 5e5 : 3e5) * LINE_SCALE))), mats.lines); o.position.y = lift; lines.add(o); }
      towers.push({ t: { top: g.top + lift, crownY: g.crownY + lift }, x: lt.x, z: lt.z, hub: lt.hub });
    }
    const hub = towers[0] ? towers[0].t : { top: 8, crownY: 6 };
    // the outskirts: lonely spires out in the country
    const out = [];
    for (let i = 0; i < 90 && out.length < 12; i++) {
      const a = back + (R() - 0.5) * 3.8, r = 22 + Math.pow(R(), 0.7) * 62, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const front = Math.cos(a - VIEW.az) > 0.55; if (front && R() < 0.7) continue;
      if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 9)) continue;
      out.push({ t: spire(["shrine", "hive", "spire", "lighthouse", "shrine"][Math.floor(R() * 5)], Math.floor(R() * 1e9), front ? 1.6 + R() * 1.6 : 2.2 + R() * (r > 55 ? 7 : 4.5)), x, z });
    }
    for (const o of out) {
      const mm = new THREE.Matrix4().makeTranslation(o.x, 0, o.z).multiply(new THREE.Matrix4().makeScale(o.t.s, o.t.s, o.t.s));
      const f = new THREE.Mesh(geomFromMesh(o.t.built.occluder), mats.city); f.applyMatrix4(mm); fills.add(f);
      const l = new THREE.LineSegments(geomFromLines(thin(o.t.built.lines.positions, Math.round(7e4 * LINE_SCALE))), mats.lines); l.applyMatrix4(mm); lines.add(l);
    }
    // the road out of the gate, poles and wire beside it
    const road = [], ra = VIEW.az - 0.55 + (R() - 0.5) * 0.3;
    for (let i = 0; i <= 40; i++) { const t = i / 40, r = 15.6 + t * 90, a = ra + Math.sin(t * 5 + R() * 0.2) * 0.12 * t + t * 0.35; road.push([Math.cos(a) * r, Math.sin(a) * r]); }
    { const pos = [], idx = [];
      road.forEach(([x, z], i) => { const [px, pz] = road[Math.max(0, i - 1)], [nx, nz] = road[Math.min(road.length - 1, i + 1)], dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz) || 1, w = 0.9 + i * 0.02;
        pos.push(x - dz / l * w, 0.02, z + dx / l * w, x + dz / l * w, 0.02, z - dx / l * w); if (i) { const b = (i - 1) * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } });
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      fills.add(new THREE.Mesh(g, fillMat(0.12, THREE.DoubleSide)));
      const seg = [], tops = [];
      for (let i = 2; i < road.length; i += 3) { const [x, z] = road[i], [nx, nz] = road[Math.min(road.length - 1, i + 1)], dx = nx - x, dz = nz - z, l = Math.hypot(dx, dz) || 1, ox = x - dz / l * 2.2, oz = z + dx / l * 2.2, h = 2.6;
        seg.push(ox, 0, oz, ox, h, oz, ox - dx / l * 0.5, h * 0.93, oz - dz / l * 0.5, ox + dx / l * 0.5, h * 0.93, oz + dz / l * 0.5); tops.push([ox, h * 0.93, oz]); }
      for (let i = 1; i < tops.length; i++) { const a = tops[i - 1], b = tops[i]; let px = a[0], py = a[1], pz = a[2];
        for (let k = 1; k <= 8; k++) { const t = k / 8, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * 0.35; seg.push(px, py, pz, x, y, z); px = x; py = y; pz = z; } }
      lines.add(new THREE.LineSegments(geomFromLines(new Float32Array(seg)), mats.lines));
    }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1400, 160).rotateX(-Math.PI / 2), mats.floor); floor.position.set(Math.cos(VIEW.az) * 1305, -0.02, Math.sin(VIEW.az) * 1305); fills.add(floor);
    [[52, 2.4, 6], [66, 3.6, 8.5], [84, 5, 11.5], [104, 6.5, 15]].forEach(([r, h0, h1], i) => {
      const span = 3.3 + i * 0.12, a0 = back - span / 2 + (R() - 0.5) * 0.3;
      fills.add(new THREE.Mesh(ridgeBand(R, r, a0, a0 + span, h0, h1, 90), fillMat(0, THREE.DoubleSide, [0.5, 0.64, 0.8, 0.94][i])));
    });
    for (const side of [-1, 1]) { const a = VIEW.az + side * 0.62; fills.add(new THREE.Mesh(ridgeBand(R, 70, a - 0.22, a + 0.22, 2.5, 7, 40), fillMat(0, THREE.DoubleSide, 0))); }
    const pts = [];
    const clumps = Array.from({ length: 26 }, () => { const a = back + (R() - 0.5) * 3.4, r = 20 + R() * 68; return [Math.cos(a) * r, Math.sin(a) * r, 1 + R() * 3.5]; });
    for (const [cx, cz, sz] of clumps) { const n = 3 + Math.floor(R() * 14); for (let i = 0; i < n; i++) { const a = R() * TAU, r = Math.sqrt(R()) * sz; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, 1 + R() * 2.4 + Math.hypot(cx, cz) * 0.025]); } }
    for (let i = 0; i < 70; i++) { const a = back + (R() - 0.5) * 3.6, r = 18 + R() * 80; pts.push([Math.cos(a) * r, Math.sin(a) * r, 0.8 + R() * 2.5]); }
    for (const side of [-1, 1]) for (let i = 0; i < 16; i++) { const a = VIEW.az + side * (0.5 + R() * 0.3), r = 50 + R() * 26; pts.push([Math.cos(a) * r, Math.sin(a) * r, 4 + R() * 8]); }
    fills.add(new THREE.Mesh(pineGeom(R, pts, VIEW.az + Math.PI / 2), mats.pine));
    root.add(moon); moon.position.set(Math.cos(back + 0.14) * 170, 6, Math.sin(back + 0.14) * 170);
    const lampAt = new THREE.Vector3(0, hub.crownY * 0.82, 0);
    root.add(lampGlow, lampCore);
    lampGlow.position.copy(lampAt); lampCore.position.copy(lampAt);
    shared.uLights.value[0].set(lampAt.x, lampAt.y, lampAt.z, 4 + hub.top * 0.55);
    const flock = { group: new THREE.Group(), live: new Map(), free: null };
    root.add(flock.group);
    scene.add(root);
    world = { root, fills, lines, towers, hub, lampAt, mats, seed: town.seed, road, flock, town };
    world.pilgrims = makePilgrims(R, road, root);
    setLanterns(town.lanterns || []);
    applyLook(); paintBackdrop(town.seed);
  }

  // the places the town keeps lit: up to seven lanterns, each one a light the shader steps toward
  function setLanterns(list) {
    for (const g of glows) g.parent && g.parent.remove(g);
    glows.length = 0;
    const lit = list.slice(0, 7);
    lit.forEach((p, i) => {
      const y = window.CityGrammar.groundY(Math.hypot(p.x, p.z)) + 0.9, at = new THREE.Vector3(p.x, y, p.z);
      shared.uLights.value[i + 1].set(at.x, at.y, at.z, 2.2);
      const g = new THREE.Sprite(lampGlow.material); g.scale.set(1.8, 1.8, 1); g.position.copy(at); world.root.add(g); glows.push(g);
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.2), lampCore.material); c.position.copy(at); c.userData.face = true; world.root.add(c); glows.push(c);
    });
    for (let i = lit.length + 1; i < 8; i++) shared.uLights.value[i].set(0, -999, 0, 0);
  }

  // ── pilgrims on the road ─────────────────────────────────────────────────────────────────────
  const pilgrimGeom = (() => {
    const sh = new THREE.Shape();
    sh.moveTo(-0.24, 0); sh.lineTo(0.24, 0); sh.lineTo(0.16, 0.42); sh.lineTo(0.13, 0.66);
    sh.absarc(0, 0.78, 0.13, -0.3, Math.PI + 0.3, false); sh.lineTo(-0.15, 0.6); sh.lineTo(-0.2, 0.3); sh.closePath();
    return new THREE.ShapeGeometry(sh, 8);
  })();
  function makePilgrims(R, road, root) {
    const len = [0]; for (let i = 1; i < road.length; i++) len.push(len[i - 1] + Math.hypot(road[i][0] - road[i - 1][0], road[i][1] - road[i - 1][1]));
    const total = len[len.length - 1], at = (d) => { d = Math.max(0, Math.min(total, d)); let i = 1; while (i < len.length - 1 && len[i] < d) i++; const t = (d - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]); return [road[i - 1][0] + (road[i][0] - road[i - 1][0]) * t, road[i - 1][1] + (road[i][1] - road[i - 1][1]) * t]; };
    const list = [], mat = fillMat(-0.2, THREE.DoubleSide), pole = lineMat(0);
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(), s = 0.85 + R() * 0.3; g.scale.setScalar(s);
      g.add(new THREE.Mesh(pilgrimGeom, mat));
      if (R() < 0.6) {
        g.add(new THREE.LineSegments(geomFromLines(new Float32Array([0.2, 0.2, 0, 0.32, 1.05, 0, 0.32, 1.05, 0, 0.42, 1.0, 0])), pole));
        const glow = new THREE.Sprite(lampGlow.material); glow.scale.set(0.9, 0.9, 1); glow.position.set(0.42, 0.9, 0.02); g.add(glow);
      }
      root.add(g);
      list.push({ g, d: R() * total, speed: 0.55 + R() * 0.35, side: (R() - 0.5) * 0.9, phase: R() * 6 });
    }
    return { list, total, at };
  }
  const _right = new THREE.Vector3();
  function updatePilgrims(P, dt, t) {
    _right.setFromMatrixColumn(cam.matrixWorld, 0);
    const face = Math.atan2(Math.cos(VIEW.az + turn), Math.sin(VIEW.az + turn));
    for (const p of P.list) {
      p.d -= p.speed * dt; if (p.d < 0) p.d += P.total;
      const [x, z] = P.at(p.d), [nx, nz] = P.at(p.d - 0.5), hx = nx - x, hz = nz - z, hl = Math.hypot(hx, hz) || 1;
      p.g.position.set(x + (-hz / hl) * p.side, Math.abs(Math.sin(t * 3.2 + p.phase)) * 0.05, z + (hx / hl) * p.side);
      p.g.rotation.y = face;
      p.g.scale.x = Math.abs(p.g.scale.x) * ((hx * _right.x + hz * _right.z) >= 0 ? 1 : -1);
    }
  }

  // ── the old ones: each species' own drawing, bent along its live spine on the GPU ──────────────
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
  const meshes = new Map();
  function prepare(sp) {
    const fV = sp.fillV ? b64(sp.fillV, Float32Array) : new Float32Array(0), fI = sp.fillI ? b64(sp.fillI, Uint16Array) : new Uint16Array(0);
    let lV = sp.lineV ? b64(sp.lineV, Float32Array) : new Float32Array(0), lI = sp.lineI ? new Uint32Array(b64(sp.lineI, Uint16Array)) : new Uint32Array(0);
    if (!lV.length && fV.length) { const o = outlineOf(fV, fI); lV = o.v; lI = o.i; }
    const nP = sp.parts || 0, PT = sp.partTex || [], parts = [];
    for (let i = 0; i < nP; i++) { const o = i * 16; parts.push({ A: PT.slice(o, o + 4), B: PT.slice(o + 4, o + 8), R: PT.slice(o + 8, o + 12), Kf: PT.slice(o + 12, o + 16) }); }
    const line = { n: lV.length / 5, x: new Float32Array(lV.length / 5), y: new Float32Array(lV.length / 5), nx: new Float32Array(lV.length / 5), ny: new Float32Array(lV.length / 5), part: new Uint16Array(lV.length / 5), idx: lI };
    for (let i = 0; i < line.n; i++) { line.x[i] = lV[i * 5]; line.y[i] = lV[i * 5 + 1]; line.nx[i] = lV[i * 5 + 2]; line.ny[i] = lV[i * 5 + 3]; line.part[i] = Math.round(lV[i * 5 + 4]); }
    const fill = { n: fV.length / 3, x: new Float32Array(fV.length / 3), y: new Float32Array(fV.length / 3), part: new Uint16Array(fV.length / 3), idx: new Uint32Array(fI) };
    for (let i = 0; i < fill.n; i++) { fill.x[i] = fV[i * 3]; fill.y[i] = fV[i * 3 + 1]; fill.part[i] = Math.round(fV[i * 3 + 2]); }
    return { key: sp.key, BY0: sp.bounds[1], LEN: sp.bounds[3] - sp.bounds[1], parts, keyT: sp.keyT || [], line, fill: fill.n ? fill : null, wing: (ES.WING && ES.WING[sp.key]) || 0.25 };
  }
  const meshFor = (sp) => meshes.get(sp.key) || (meshes.set(sp.key, prepare(sp)), meshes.get(sp.key));
  function keyed(kf, keyT, u) {
    const n = keyT.length; if (!n) return 0; if (n === 1) return kf[0];
    let i1 = 0; for (let i = 0; i < n; i++) if (keyT[i] <= u) i1 = i + 1;
    const i0 = (i1 + n - 1) % n; i1 %= n;
    let span = keyT[i1] - keyT[i0]; if (span <= 0) span += 1; let f = u - keyT[i0]; if (f < 0) f += 1;
    const e = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, f / span)));
    return kf[i0] + (kf[i1] - kf[i0]) * e;
  }
  const SP = new Float32Array(K * 9);
  function pose(f, m) {
    const sim = eco.sim, cfg = sim.cfg, W = sim.bounds.w, H = sim.bounds.h, S = 1 / eco.scale, TD = Math.max(60, Math.min(W, H) * 0.9 * cfg.dz);
    const swim = ES.SPECIES[f.sp].swim, bl = Sim.bodyLen(sim, f), A = cfg.wiggle * bl * swim.amp, c = f.chain, pts = [];
    for (let k = 0; k < K; k++) {
      const s = k / (K - 1), k0 = Math.max(0, k - 1), k1 = Math.min(K - 1, k + 1);
      let tx = c[k1 * 2] - c[k0 * 2], ty = c[k1 * 2 + 1] - c[k0 * 2 + 1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const off = A * (0.12 + 0.88 * Math.pow(s, swim.ampPow)) * Math.sin(f.phase - s * TAU * swim.waves);
      pts.push([((c[k * 2] + ty * off) - W / 2) * S, ECO_Y[0] + (1 - f.cz[k] / TD) * (ECO_Y[1] - ECO_Y[0]), ((c[k * 2 + 1] - tx * off) - H / 2) * S]);
    }
    for (let k = 0; k < K; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(K - 1, k + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let sx = -tz, sz = tx; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
      const ux = -sz * ty, uy = sz * tx - sx * tz, uz = sx * ty;
      const r = f.croll ? f.croll[k] : 0, cr = Math.cos(r), sr = Math.sin(r);
      const o = k * 9; SP[o] = pts[k][0]; SP[o + 1] = pts[k][1]; SP[o + 2] = pts[k][2]; SP[o + 3] = tx; SP[o + 4] = ty; SP[o + 5] = tz;
      SP[o + 6] = ux * cr + sx * sr; SP[o + 7] = uy * cr; SP[o + 8] = uz * cr + sz * sr;
    }
    const ph = f.phase, u = ((ph * 0.5 / TAU) % 1 + 1) % 1, ops = [];
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
    return { sc: (bl / m.LEN) * S * fade, ops };
  }
  let MAXP = 1; for (const sp of ES.SPECIES) MAXP = Math.max(MAXP, sp.parts || 0);
  const ROW_SPINE = K * 3, TEX_W = ROW_SPINE + MAXP * PART_TEXELS;
  const CREATURE_VS = `
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
  const spineData = new Float32Array(TEX_W * MAXF * 4);
  const spineTex = new THREE.DataTexture(spineData, TEX_W, MAXF, THREE.RGBAFormat, THREE.FloatType);
  spineTex.minFilter = spineTex.magFilter = THREE.NearestFilter;
  function speciesGeoms(m) {
    if (m.geoms) return m.geoms;
    const mk = (src, stroke) => { const g = new THREE.BufferGeometry(), pos = new Float32Array(src.n * 3), nrm = new Float32Array(src.n * 2), part = new Float32Array(src.n);
      for (let i = 0; i < src.n; i++) { pos[i * 3] = src.x[i]; pos[i * 3 + 1] = src.y[i]; part[i] = src.part[i]; if (stroke) { nrm[i * 2] = src.nx[i]; nrm[i * 2 + 1] = src.ny[i]; } }
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aNrm", new THREE.BufferAttribute(nrm, 2)); g.setAttribute("aPart", new THREE.BufferAttribute(part, 1));
      g.setIndex(new THREE.BufferAttribute(src.idx, 1)); return g; };
    m.geoms = { line: mk(m.line, true), fill: m.fill ? mk(m.fill, false) : null };
    return m.geoms;
  }
  const creatureMat = (isLine, m, row) => new THREE.ShaderMaterial({ uniforms: { ...shared, uTone: { value: isLine ? 0 : -0.06 }, uLine: { value: isLine ? 1 : 0 }, uBandFix: { value: -1 }, uMap: { value: null }, uUseMap: { value: 0 },
      uSpine: { value: spineTex }, uRow: { value: row }, uSc: { value: 1 }, uLW: { value: LINE_W }, uBY0: { value: m.BY0 }, uLEN: { value: m.LEN }, uStroke: { value: isLine ? 1 : 0 } },
    vertexShader: CREATURE_VS, fragmentShader: FS, side: THREE.DoubleSide, polygonOffset: !isLine, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  function entryFor(fl, f, m) {
    let e = fl.live.get(f);
    if (e && e.key === m.key) return e;
    if (e) dropEntry(fl, f, e);
    if (!fl.free) fl.free = Array.from({ length: MAXF }, (_, i) => MAXF - 1 - i);
    if (!fl.free.length) return null;
    const row = fl.free.pop(), g = speciesGeoms(m), mk = (geo, isLine) => { const o = new THREE.Mesh(geo, creatureMat(isLine, m, row)); o.frustumCulled = false; fl.group.add(o); return o; };
    e = { key: m.key, row, line: mk(g.line, true), fill: g.fill ? mk(g.fill, false) : null };
    fl.live.set(f, e); return e;
  }
  function dropEntry(fl, f, e) { for (const o of [e.line, e.fill]) if (o) { fl.group.remove(o); o.material.dispose(); } fl.free.push(e.row); fl.live.delete(f); }
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
  function drawFlock(fl) {
    const seen = new Set();
    for (const f of eco.sim.fish) {
      if (f.dead) continue;
      const m = meshFor(ES.SPECIES[f.sp]);
      const e = entryFor(fl, f, m); if (!e) continue;
      const ps = pose(f, m);
      writeRow(e.row, ps, m);
      e.line.material.uniforms.uSc.value = ps.sc; if (e.fill) e.fill.material.uniforms.uSc.value = ps.sc;
      seen.add(f);
    }
    for (const [f, e] of fl.live) if (!seen.has(f)) dropEntry(fl, f, e);
    spineTex.needsUpdate = true;
  }

  // ── camera: fixed framing, a little turn on drag, zoom on wheel, cuts to places ──────────────
  let turn = 0, turnGoal = 0, zoom = 1, zoomGoal = 1, sway = 0, swayGoal = 0, drag = null;
  const camT = VIEW.target.clone(), camGoal = VIEW.target.clone();
  function placeCamera(t) {
    const w0 = canvas.clientWidth, h0 = canvas.clientHeight, aspect = w0 / Math.max(1, h0);
    const h = (VIEW.h / zoom) * (aspect < 1 ? 1.6 / Math.max(0.55, aspect) : 1), w = h * aspect;   // a phone held upright sees the whole town
    cam.left = -w / 2; cam.right = w / 2; cam.top = h / 2; cam.bottom = -h / 2; cam.updateProjectionMatrix();
    const az = VIEW.az + turn + Math.sin(t * 0.07) * 0.012, el = VIEW.el + sway, d = 240;
    cam.position.set(camT.x + Math.cos(az) * Math.cos(el) * d, camT.y + Math.sin(el) * d, camT.z + Math.sin(az) * Math.cos(el) * d);
    cam.lookAt(camT);
    shared.uStNear.value = d - 70; shared.uStFar.value = d + 120; shared.uStCam.value.copy(cam.position);
    lampCore.quaternion.copy(cam.quaternion);
    if (world) world.root.traverse((o) => { if (o.userData.face) o.quaternion.copy(cam.quaternion); });
  }
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, turn: turnGoal, sway }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; turnGoal = Math.max(-0.6, Math.min(0.6, drag.turn - (e.clientX - drag.x) * 0.003)); sway = swayGoal = Math.max(-0.05, Math.min(0.3, drag.sway + (e.clientY - drag.y) * 0.002)); });
  canvas.addEventListener("pointerup", () => { drag = null; });
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); zoom = zoomGoal = Math.max(0.6, Math.min(4.5, zoom * Math.exp(-e.deltaY * 0.001))); }, { passive: false });

  // cut to a place (city-local {x, z}) or back to the whole town (null)
  function focus(p, z = 2.6) {
    if (!p) { camGoal.copy(VIEW.target); zoomGoal = 1; swayGoal = 0; return; }
    camGoal.set(p.x, window.CityGrammar.groundY(Math.hypot(p.x, p.z)) + 1.5, p.z); zoomGoal = z; swayGoal = 0.04;
  }
  function setSky({ phaseIndex, blood, light }) {
    const changed = sky.blood !== !!blood || sky.light !== light;
    sky = { blood: !!blood, light };
    paintMoon(phaseIndex, !!blood);
    moon.visible = phaseIndex !== 0 || !!blood;
    if (changed && world) { applyLook(); paintBackdrop(world.seed); }
  }

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = performance.now(), raf = 0, running = true;
  function resize() { renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    turn += (turnGoal - turn) * Math.min(1, dt * 1.6);
    camT.lerp(camGoal, Math.min(1, dt * 1.4)); zoom += (zoomGoal - zoom) * Math.min(1, dt * 1.4); if (!drag) sway += (swayGoal - sway) * Math.min(1, dt * 1.4);
    if (world) { updatePilgrims(world.pilgrims, reduce ? 0 : dt, reduce ? 0 : now / 1000); drawFlock(world.flock); }
    placeCamera(now / 1000);
    renderer.render(scene, cam);
    raf = requestAnimationFrame(frame);
  }
  resize(); raf = requestAnimationFrame(frame);
  return {
    setTown, setLanterns, setSky, focus, resize,
    dispose() { running = false; cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
