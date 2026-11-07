// systems/state.js — StateStore: single source of truth for all game state
// Accessed via dot-path get/set. Emits state.changed on every mutation.

export class StateStore {
  #state;
  #bus;

  constructor(bus, initialState) {
    this.#bus = bus;
    this.#state = structuredClone(initialState);
  }

  get(path) {
    if (!path) return this.#state;
    return path.split(".").reduce((o, k) => o?.[k], this.#state);
  }

  set(path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    const parent = keys.reduce((o, k) => {
      if (o[k] === undefined) o[k] = {};
      return o[k];
    }, this.#state);
    const old = parent[last];
    parent[last] = value;
    this.#bus.emit("state.changed", { path, oldValue: old, newValue: value });
  }

  update(path, fn) {
    this.set(path, fn(this.get(path)));
  }

  snapshot() {
    return structuredClone(this.#state);
  }

  restore(snapshot) {
    this.#state = structuredClone(snapshot);
    this.#bus.emit("state.restored", {});
  }
}
