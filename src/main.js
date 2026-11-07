import { mount } from "svelte";
import "./global.css";
import App from "./ui/App.svelte";
import { createGame } from "./game/engine.js";

const seed = Number(new URLSearchParams(location.search).get("seed")) || 1907;
const game = createGame({ CityWFC: window.CityWFC, EcologySim: window.EcologySim, EcologySpecies: window.EcologySpecies, seed });
window.__game = game; // handy in the console while designing

mount(App, { target: document.getElementById("app"), props: { game } });
