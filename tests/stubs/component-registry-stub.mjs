// Test double for `/core/ui-next/services/component-registry.js`, wired in by tests/loader.mjs. It keeps
// the 1.5.0 registry's rules: `get(name)` returns an entry whose `factory` is a signal, and a registration
// at the same or a higher priority replaces the factory. The game's PlotTooltip is registered when this
// loads, as if the HUD had already mounted, so the mod finds it on its first look.
import { createSignal } from "./solid-stub.mjs";

/** Entries by name; a test can delete one and put it back. */
export const __entries = new Map();
/** Every register call in order, so a test can count re-wraps. */
export const __registrations = [];

export const ComponentRegistry = {
  register({ name, createInstance, overridePriority }) {
    const priority = overridePriority ?? 0;
    __registrations.push({ name, createInstance, overridePriority: priority });
    const entry = __entries.get(name);
    if (!entry) {
      const [factory, setFactory] = createSignal(createInstance);
      __entries.set(name, { factory, setFactory, overridePriority: priority });
    } else if (entry.overridePriority <= priority) {
      entry.overridePriority = priority;
      entry.setFactory(() => createInstance);
    }
  },
  get(name) {
    return __entries.get(name);
  }
};

/** The game's PlotTooltip: renders to a record of the props it was given. */
export function BasePlotTooltip(props) {
  return { by: "game", props };
}

ComponentRegistry.register({ name: "PlotTooltip", createInstance: BasePlotTooltip });
