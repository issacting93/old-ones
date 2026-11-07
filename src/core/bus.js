// systems/bus.js — EventBus: pub/sub for inter-system communication
// All game systems communicate exclusively through this bus.
// Events are synchronous: all handlers run before emit() returns.

export class EventBus {
  #listeners = new Map();

  on(channel, callback) {
    if (!this.#listeners.has(channel)) {
      this.#listeners.set(channel, new Set());
    }
    this.#listeners.get(channel).add(callback);
    return () => this.#listeners.get(channel)?.delete(callback);
  }

  once(channel, callback) {
    const unsub = this.on(channel, (data) => {
      unsub();
      callback(data);
    });
    return unsub;
  }

  emit(channel, data = {}) {
    const event = { channel, ...data, _ts: performance.now() };

    // exact match
    this.#listeners.get(channel)?.forEach(fn => fn(event));

    // wildcard: "clock.*" fires for "clock.advance"
    for (const [pattern, fns] of this.#listeners) {
      if (pattern.endsWith(".*")) {
        const prefix = pattern.slice(0, -1);
        if (channel.startsWith(prefix) && channel !== pattern) {
          fns.forEach(fn => fn(event));
        }
      }
    }

    return event;
  }

  clear() {
    this.#listeners.clear();
  }
}
