/**
 * Readable Tool Tips: pushes the game's cursor-following tooltips a little
 * further off the cursor so their first characters aren't tucked under the
 * pointer, without pushing any tooltip off-screen.
 *
 * The gap is widened in JS, inside each tooltip system's own placement code and
 * before its on-screen clamp, rather than with CSS: a transform lands after the
 * clamp and shoved edge-pinned tooltips (the tech/civic unlock popup) off the
 * edge. The gap goes on the side the tooltip actually opened, so a flipped
 * tooltip moves further left or up instead of back under the cursor.
 */

// Extra cursor gap in screen px, on top of each system's built-in gap.
const WORLD_OFFSET_PX = 12; // world/popup/map tooltips
const HUD_OFFSET_PX = 4;    // HUD sub-system-dock tooltips, a smaller gap

// The game's own PlotTooltip passes `offset: 22` to its ui-next Tooltip root.
const PLOT_TOOLTIP_BASE_OFFSET_PX = 22;

// Hovered elements inside this container get the HUD gap; extend the selector
// if other HUD areas should too.
const HUD_CONTEXT_SELECTOR = ".sub-system-dock";

const REPOSITION_PATCHED = "__readableTooltipsRepositionPatched";
const MANAGER_PATCHED = "__readableTooltipsManagerPatched";
const PLOT_PATCHED = "__readableTooltipsPlotPatched";

// PlotTooltip registers when the game HUD mounts, which may be after this
// script runs; poll this long for it before giving up.
const PLOT_REGISTER_POLL_MS = 500;
const PLOT_REGISTER_POLL_TRIES = 120;
// how many times the PlotTooltip wrapper may re-apply itself after another mod replaces it
const PLOT_MAX_WRAPS = 8;

// Extra gap for the tooltip of a hovered element: the HUD tier inside the dock, else the world tier.
function offsetForContext(context) {
  try {
    if (context && typeof context.closest === "function" && context.closest(HUD_CONTEXT_SELECTOR)) {
      return HUD_OFFSET_PX;
    }
  } catch (_e) {
    // odd DOM: use the world offset
  }
  return WORLD_OFFSET_PX;
}

/**
 * Which side of the anchor a placement opened on. It opened left (or up) only
 * when the whole tooltip lies left of (or above) the anchor; a tooltip the
 * screen-edge clamp merely pinned level with the anchor did not flip, and
 * pushing it "up" would only fight the pin.
 * @param {{x: number, y: number}|null} placed top-left, if captured
 * @param {{width: number, height: number}} size
 * @param {number} anchorX
 * @param {number} anchorY
 * @returns {{x: number, y: number}} +1 pushes right/down, -1 pushes left/up
 */
function signsForPlacement(placed, size, anchorX, anchorY) {
  if (!placed || !size) {
    return { x: 1, y: 1 };
  }
  return {
    x: placed.x + size.width <= anchorX ? -1 : 1,
    y: placed.y + size.height <= anchorY ? -1 : 1
  };
}

/**
 * Run a placement with the cursor anchor pushed `extra` px away from the cursor,
 * on the side the tooltip opened, then restore the anchor.
 *
 * First places with a down-right push. If that placement flipped the tooltip
 * left and/or up, places again pushing that way. If the second placement flips
 * differently (the push itself crossed a flip threshold), the down-right
 * placement is kept.
 * @param {object} obj holds the anchor
 * @param {[string, string]} keys anchor x and y field names
 * @param {number} extra
 * @param {() => *} place runs the original placement
 * @param {() => {x: number, y: number}} readSigns direction the tooltip opened
 * @returns {*} the original placement's return value
 */
function placePushed(obj, keys, extra, place, readSigns) {
  const [xKey, yKey] = keys;
  const x0 = obj[xKey];
  const y0 = obj[yKey];
  const run = (sx, sy) => {
    obj[xKey] = x0 + sx * extra;
    obj[yKey] = y0 + sy * extra;
    return place();
  };
  try {
    let result = run(1, 1);
    const first = readSigns();
    if (first.x < 0 || first.y < 0) {
      result = run(first.x, first.y);
      const second = readSigns();
      if (second.x !== first.x || second.y !== first.y) {
        result = run(1, 1);
      }
    }
    return result;
  } finally {
    obj[xKey] = x0;
    obj[yKey] = y0;
  }
}

// Resolves to a predicate for whether a gamepad is driving the UI (tooltips then
// anchor to focus, not a cursor). Never throws.
async function loadIsControllerActive() {
  try {
    const input = await import("/core/ui-next/services/input.js");
    if (typeof input?.IsControllerActive === "function") {
      return () => {
        try {
          return input.IsControllerActive();
        } catch (_e) {
          return false;
        }
      };
    }
  } catch (_e) {
    // Older/newer builds without the ui-next input service: assume mouse.
  }
  return () => false;
}

/**
 * Run the controller's reposition with the pushed anchor. The side the tooltip
 * opened on is read from what `constrainTipToRect` returned: the controller's
 * `tooltipAlignment` is sticky across tooltips and does not decide the flip, so
 * it can't be trusted for direction. The clamp is observed through a temporary
 * own-property shadow that is removed (or the previous own property restored)
 * afterward.
 */
function repositionPushed(controller, originalReposition) {
  const hadOwnClamp = Object.prototype.hasOwnProperty.call(controller, "constrainTipToRect");
  const ownClamp = controller.constrainTipToRect;
  let placed = null;
  controller.constrainTipToRect = function readableTooltipsObserveClamp(rect) {
    placed = ownClamp.call(this, rect);
    return placed;
  };
  try {
    return placePushed(controller, ["tooltipX", "tooltipY"], offsetForContext(controller.tooltipContext),
      () => originalReposition.call(controller),
      () => signsForPlacement(placed, controller.root?.getBoundingClientRect?.(),
        controller.tooltipX, controller.tooltipY));
  } finally {
    if (hadOwnClamp) {
      controller.constrainTipToRect = ownClamp;
    } else {
      delete controller.constrainTipToRect;
    }
  }
}

// System 1: TooltipController. The gap goes on before the controller's own
// on-screen clamp runs. Idempotent; a missing method only costs the offset.
async function patchTooltipController() {
  try {
    const mod = await import("/core/ui/tooltips/tooltip-controller.js");
    const proto = mod?.TooltipController?.prototype;
    if (!proto || typeof proto.reposition !== "function") {
      console.error("[ReadableTooltips] TooltipController.reposition not found; offset skipped.");
      return;
    }
    if (proto[REPOSITION_PATCHED]) {
      return;
    }
    const originalReposition = proto.reposition;
    proto.reposition = function readableTooltipsReposition() {
      if (this.fixedPosition) {
        return originalReposition.call(this);
      }
      return repositionPushed(this, originalReposition);
    };
    proto[REPOSITION_PATCHED] = true;
  } catch (e) {
    // Never let a cosmetic tweak break a UI context.
    console.error("[ReadableTooltips] failed to patch TooltipController:", e);
  }
}

// The Cursor singleton (its target picks the offset tier), or null.
async function loadCursor() {
  try {
    return (await import("/core/ui/input/cursor.js"))?.default ?? null;
  } catch (_e) {
    return null;
  }
}

/**
 * The manager's ResizeObserver was bound to the unpatched method when the
 * singleton was built; without a fresh one a content resize would snap the
 * tooltip back to the game's gap. The manager reads the field on every use.
 */
function rebindManagerResizeObserver(manager) {
  if (typeof ResizeObserver !== "function" || !manager.tooltipResizeObserver) {
    return;
  }
  manager.tooltipResizeObserver.disconnect();
  manager.tooltipResizeObserver = new ResizeObserver(() => manager.updateTooltipPosition());
  if (manager.tooltip) {
    manager.tooltipResizeObserver.observe(manager.tooltip);
  }
}

/**
 * Build the wrapped TooltipManager.updateTooltipPosition. The manager flips with
 * `right` (opened left of the cursor) and `above` classes on the tooltip.
 */
function makeManagerUpdate(originalUpdate, isControllerActive, cursor) {
  return function readableTooltipsUpdatePosition() {
    const tooltip = this.tooltip;
    if (!tooltip || this.touchPosition || isControllerActive()) {
      return originalUpdate.call(this);
    }
    return placePushed(this, ["x", "y"], offsetForContext(cursor?.target),
      () => originalUpdate.call(this), () => ({
        x: tooltip.classList.contains("right") ? -1 : 1,
        y: tooltip.classList.contains("above") ? -1 : 1
      }));
  };
}

// System 2: TooltipManager, wrapped the same way as the controller.
async function patchTooltipManager() {
  try {
    const manager = (await import("/core/ui/tooltips/tooltip-manager.js"))?.default;
    const proto = manager && Object.getPrototypeOf(manager);
    if (!proto || typeof proto.updateTooltipPosition !== "function") {
      console.error("[ReadableTooltips] TooltipManager.updateTooltipPosition not found; offset skipped.");
      return;
    }
    if (proto[MANAGER_PATCHED]) {
      return;
    }
    proto.updateTooltipPosition = makeManagerUpdate(proto.updateTooltipPosition,
      await loadIsControllerActive(), await loadCursor());
    proto[MANAGER_PATCHED] = true;
    rebindManagerResizeObserver(manager);
  } catch (e) {
    console.error("[ReadableTooltips] failed to patch TooltipManager:", e);
  }
}

/**
 * The `offset` to hand the plot tooltip: the game's gap plus ours, as a fixed
 * target rather than an increment, so layered overrides (ours wrapping another
 * mod that wraps ours) can't stack it. A larger gap asked for by another mod
 * is kept.
 */
function plotTooltipOffset(incoming) {
  const target = PLOT_TOOLTIP_BASE_OFFSET_PX + WORLD_OFFSET_PX;
  return typeof incoming === "number" && incoming > target ? incoming : target;
}

// Register a PlotTooltip that renders `registered`'s current factory with a
// wider `offset`. Returns true when a wrapper was registered.
function registerWiderPlotTooltip(registry, solid, registered) {
  const original = registered.factory();
  if (typeof original !== "function" || original[PLOT_PATCHED]) {
    return false;
  }
  const wider = function ReadableTooltipsPlotTooltip(props) {
    return solid.createComponent(original, solid.mergeProps(props, { offset: plotTooltipOffset(props?.offset) }));
  };
  wider[PLOT_PATCHED] = true;
  registry.register({
    name: "PlotTooltip",
    createInstance: wider,
    // same priority, not higher: the registry lets an equal-priority registration
    // replace the current one, so a plot-tooltip mod that registers after us still
    // takes effect and is then re-wrapped
    overridePriority: registered.overridePriority ?? 0
  });
  return true;
}

// Wait for the game HUD to register PlotTooltip; null on timeout.
async function waitForPlotTooltip(registry) {
  for (let i = 0; i < PLOT_REGISTER_POLL_TRIES; i++) {
    const registered = registry.get("PlotTooltip");
    if (registered && typeof registered.factory === "function") {
      return registered;
    }
    await new Promise((resolve) => setTimeout(resolve, PLOT_REGISTER_POLL_MS));
  }
  return null;
}

/**
 * System 3: re-register ui-next's PlotTooltip as the same component with a wider
 * `offset`. The ui-next Tooltip adds `offset` on whichever side it opens and then
 * clamps on-screen, so the gap grows outward in every corner. Game scope only.
 */
async function patchPlotTooltip() {
  try {
    if (typeof UI !== "undefined" && typeof UI.isInGame === "function" && !UI.isInGame()) {
      return;
    }
    const { ComponentRegistry } = await import("/core/ui-next/services/component-registry.js");
    const solid = await import("/core/vendor/solid-js/dist/solid.js");
    const registered = await waitForPlotTooltip(ComponentRegistry);
    if (!registered) {
      return;
    }
    // The registry's factory is a signal. Re-wrap whenever another mod's override
    // (a plot-tooltip mod loading after us) replaces ours, so the wider gap
    // composes with it in any load order. Our own register re-runs the effect
    // once, sees our factory, and stops. The cap stops a ping-pong with another
    // mod that re-wraps the same way.
    let wraps = 0;
    solid.createRoot(() => {
      solid.createEffect(() => {
        registered.factory();
        if (wraps >= PLOT_MAX_WRAPS) {
          return;
        }
        if (registerWiderPlotTooltip(ComponentRegistry, solid, registered)) {
          wraps++;
        }
      });
    });
  } catch (e) {
    console.error("[ReadableTooltips] failed to patch PlotTooltip:", e);
  }
}

patchTooltipController();
patchTooltipManager();
patchPlotTooltip();

export {
  patchTooltipController,
  patchTooltipManager,
  patchPlotTooltip,
  offsetForContext,
  signsForPlacement,
  placePushed,
  plotTooltipOffset,
  WORLD_OFFSET_PX,
  HUD_OFFSET_PX,
  PLOT_TOOLTIP_BASE_OFFSET_PX
};
