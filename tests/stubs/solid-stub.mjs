// Test double for `/core/vendor/solid-js/dist/solid.js`, wired in by tests/loader.mjs: just enough of
// Solid for the PlotTooltip wrap. A signal remembers the effects that read it and re-runs them when it's
// written; a function passed to the setter is an updater, as in Solid.

let currentEffect = null;

export function createSignal(value) {
  const readers = new Set();
  const read = () => {
    if (currentEffect) {
      readers.add(currentEffect);
    }
    return value;
  };
  const write = (next) => {
    value = typeof next === "function" ? next(value) : next;
    for (const effect of [...readers]) {
      effect();
    }
  };
  return [read, write];
}

export function createEffect(fn) {
  const run = () => {
    const outer = currentEffect;
    currentEffect = run;
    try {
      fn();
    } finally {
      currentEffect = outer;
    }
  };
  run();
}

export function createRoot(fn) {
  return fn(() => {});
}

export function createComponent(Comp, props) {
  return Comp(props);
}

export function mergeProps(...sources) {
  return Object.assign({}, ...sources);
}
