// ui/store.js — the game's StateStore, as a Svelte store.
//
// Views subscribe to a plain snapshot that refreshes once per microtask after any change, so a
// burst of state writes (a whole night's effects) re-renders once.

import { readable } from "svelte/store";

export function gameStore(game) {
  return readable(game.state.snapshot(), (set) => {
    let queued = false;
    const flush = () => { queued = false; set(game.state.snapshot()); };
    return game.bus.on("state.changed", () => {
      if (queued) return;
      queued = true;
      queueMicrotask(flush);
    });
  });
}
