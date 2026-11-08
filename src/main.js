import { mount } from "svelte";
import "./global.css";
import App from "./ui/App.svelte";
import { createGame, loadCarry, freshCarry } from "./game/engine.js";

let storage = null;
try { storage = window.localStorage; } catch { /* no storage: the loops just won't survive a reload */ }

const game = createGame({ CityWFC: window.CityWFC, EcologySim: window.EcologySim, EcologySpecies: window.EcologySpecies, storage });
window.__game = game; // handy in the console while designing

mount(App, { target: document.getElementById("app"), props: { game, firstVisit: !loadCarry(storage) } });
game.startLoop(loadCarry(storage) || freshCarry(), (p) => game.bus.emit("regrow.progress", { p }));
