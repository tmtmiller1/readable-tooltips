// Test double for `/core/ui/tooltips/tooltip-manager.js`, wired in by tests/loader.mjs. The default
// export is the manager singleton. Its `updateTooltipPosition` records the anchor it saw; a test flips
// the tooltip by adding `right` or `above` to `tooltip.classList`.

function makeTooltip() {
  const names = new Set();
  return {
    classList: {
      add: (name) => names.add(name),
      remove: (name) => names.delete(name),
      contains: (name) => names.has(name)
    }
  };
}

class StubTooltipManager {
  x = 0;
  y = 0;
  touchPosition = null;
  tooltip = makeTooltip();
  tooltipResizeObserver = {
    disconnected: false,
    disconnect() {
      this.disconnected = true;
    }
  };
  /** Anchors each placement saw, as [x, y]. */
  seen = [];

  updateTooltipPosition() {
    this.seen.push([this.x, this.y]);
  }
}

// `let` plus a named export so the default stays a live binding a test can swap.
let manager = new StubTooltipManager();
export { manager as default };

/** @param {any} next replacement singleton (test-only) */
export function __setManager(next) {
  manager = next;
}
