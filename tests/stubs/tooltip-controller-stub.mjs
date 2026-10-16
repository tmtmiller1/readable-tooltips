// Test double for `/core/ui/tooltips/tooltip-controller.js`, wired in by tests/loader.mjs. Its
// `reposition` records the anchor it saw, works out where the tooltip lands, and passes that through
// `constrainTipToRect`, the way the game's controller places a tooltip and then clamps it on-screen.

class StubTooltipController {
  tooltipX = 0;
  tooltipY = 0;
  fixedPosition = false;
  tooltipContext = null;
  root = { getBoundingClientRect: () => ({ width: 110, height: 40 }) };
  /** Anchors each reposition saw, as [x, y]. */
  seen = [];
  /** Top-left of the placed tooltip for an anchor; a test swaps it to fake a flip. */
  place = (x, y) => ({ x: x + 24, y: y + 24 });

  reposition() {
    this.seen.push([this.tooltipX, this.tooltipY]);
    return this.constrainTipToRect(this.place(this.tooltipX, this.tooltipY));
  }

  constrainTipToRect(rect) {
    return rect;
  }
}

// `let` so a test can swap in a class without `reposition` through the live binding.
export let TooltipController = StubTooltipController;

/** @param {any} cls replacement class (test-only) */
export function __setTooltipController(cls) {
  TooltipController = cls;
}
