/**
 * Readable Tool Tips
 * --------------------------------------------------------------------------
 * Pushes every active game tooltip a small distance away from the cursor so it
 * is no longer tucked under the pointer and is easy to read. Pure spacing — no
 * font, color, size, or content change of any kind.
 *
 * THE PROBLEM
 *   The game has two cursor-following tooltip systems, in two containers, and
 *   both drop the tooltip on top of the cursor:
 *     - `fxs-tooltip` / TooltipManagerSingleton (container `#tooltips`) — plot,
 *       unit, and most world/UI hovers — places the tooltip's TOP-LEFT CORNER
 *       exactly at the cursor with no offset (tooltip-manager.js,
 *       updateTooltipPosition).
 *     - the simple TooltipController (container `#tooltip-root`) — the
 *       `data-tooltip-content` hovers: yield amounts and the yield/effect
 *       previews on decision & narrative-reward buttons — adds only a hardcoded
 *       24px cursor offset. That's a fixed pixel count, so at higher UI scales,
 *       where the cursor is larger than 24px, the tooltip's corner still lands
 *       under it.
 *
 * THE FIX — a positional offset, applied to whatever tooltip is live
 *   We translate the active tooltip away from the cursor in BOTH systems:
 *     - System 1: the manager's active tooltip is the single child of its root
 *       <div> inside `#tooltips`, so we target that slot structurally
 *       (`#tooltips > div > *`). Base tooltips and the custom tooltips other
 *       mods build (bz-city-tooltip, dan-city-yields, tech-civic, ...) all flow
 *       through that same slot.
 *     - System 2: a single shared element, `#tooltip-root`.
 *   We touch only the outer positioning transform of each shared container —
 *   never any tooltip's classes, font, content, or internal layout — so every
 *   tooltip (base or modded) keeps its exact look and only its position shifts.
 *   That is what keeps this 100% compatible.
 *
 *   (`#uinext-tooltips`, the third system, anchors tooltips to their target
 *   ELEMENT rather than the cursor, so it isn't the "hidden under the cursor"
 *   problem and is intentionally left untouched — transforming it could detach
 *   a tooltip from the control it describes.)
 *
 * FLIP-AWARE (stays on-screen)
 *   Both systems flip the tooltip near a screen edge to keep it on-screen and
 *   expose the flip direction as classes — `.right`/`.above` on system 1,
 *   `tooltip-align--{vertical}-{horizontal}` on system 2. We read those classes
 *   and mirror our offset for each case, so the tooltip is always pushed AWAY
 *   from the cursor, never back under it, in every corner.
 *
 * WHY TRANSFORM, NOT MARGIN
 *   The manager positions the tooltip's ROOT wrapper each frame from the
 *   tooltip's measured offsetWidth/Height (which excludes margins). A margin
 *   would desync that edge/flip math; a `transform: translate()` moves the
 *   rendered box by an exact amount without changing the measured layout box,
 *   so the game's own on-screen clamping still works. The base game only ever
 *   sets `transform: translateX(0rem)` on the tooltip element (a no-op) and
 *   drives real positioning via the root wrapper, so overriding the element's
 *   transform here is safe and does not fight the manager.
 *
 * NO `!important` — ON PURPOSE (mod-conflict safety)
 *   This <style> is appended to document.head at runtime, after the base game's
 *   tooltip CSS, so load order alone wins the cascade for our offset. Staying
 *   `!important`-free means any mod that ever wants to override tooltip
 *   positioning still can.
 *
 * Idempotent: safe to run in every UI context and on every re-init; it is a
 * no-op once the <style> is present.
 */

const STYLE_ID = "readable-tooltips-style";

// One knob: how far to push the tooltip off the cursor. The game's own ui-next
// tooltip system uses 16px (~0.9rem); we use a hair more so the tooltip clears
// the cursor body comfortably. Raise for more spacing, lower for less.
const OFFSET = "1.25rem";

// The game has TWO cursor-following tooltip systems, each in its own container,
// and tooltips land under the cursor in BOTH — so we offset both:
//
//   1. fxs-tooltip / TooltipManagerSingleton → container `#tooltips`. Used by
//      plot, unit, and most world/UI hovers. Places the tooltip's top-left
//      exactly at the cursor with no offset. Positioned via a transform on the
//      manager's root wrapper; the active tooltip is that wrapper's only child.
//   2. simple TooltipController → container `#tooltip-root`. Used by
//      `data-tooltip-content` hovers — yield amounts, and the yield/effect
//      previews on decision & narrative-reward buttons. It adds a hardcoded 24px
//      cursor offset, but that's a fixed pixel count: at higher UI scales the
//      cursor is larger than 24px, so the tooltip's corner still sits under it.
//      Positioned via inline left/top, so our transform composes on top of it.
//
// Both flip near screen edges to stay on-screen and expose their flip direction
// as classes — `.right`/`.above` on system 1, `tooltip-align--{v}-{h}` on
// system 2 — so for each system we mirror the offset direction and always push
// the tooltip AWAY from the cursor, never back under it.
//
// (`#uinext-tooltips`, the third system, anchors tooltips to their target
// element rather than the cursor, so it isn't the "hidden under the cursor"
// problem and is intentionally left untouched.)

// System 1: the tooltip manager's active-tooltip slot. Structural selector, so
// it matches whatever tooltip is shown — base or modded — without depending on
// its own classes.
const SLOT = "#tooltips > div > *";

// System 2: the simple tooltip root (a single shared element).
const TIP_ROOT = "#tooltip-root";

const CSS = `
/* Readable Tool Tips — offset every active tooltip off the cursor. */

/* System 1 — fxs-tooltip (#tooltips): plot/unit/most world hovers. */
${SLOT} {
  transform: translate(${OFFSET}, ${OFFSET});
}
${SLOT}.right {
  transform: translate(calc(-1 * ${OFFSET}), ${OFFSET});
}
${SLOT}.above {
  transform: translate(${OFFSET}, calc(-1 * ${OFFSET}));
}
${SLOT}.right.above {
  transform: translate(calc(-1 * ${OFFSET}), calc(-1 * ${OFFSET}));
}

/* System 2 — simple tooltip (#tooltip-root): yield amounts, decision/reward
   previews. Default (and bottom-right) is down-right of the cursor; the
   alignment classes tell us which way it flipped near an edge. */
${TIP_ROOT},
${TIP_ROOT}.tooltip-align--bottom-right {
  transform: translate(${OFFSET}, ${OFFSET});
}
${TIP_ROOT}.tooltip-align--bottom-left {
  transform: translate(calc(-1 * ${OFFSET}), ${OFFSET});
}
${TIP_ROOT}.tooltip-align--top-right {
  transform: translate(${OFFSET}, calc(-1 * ${OFFSET}));
}
${TIP_ROOT}.tooltip-align--top-left {
  transform: translate(calc(-1 * ${OFFSET}), calc(-1 * ${OFFSET}));
}
`;

function injectReadableTooltipsStyle() {
  try {
    if (!document?.head) return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  } catch (e) {
    // Never let a cosmetic tweak break a UI context.
    console.error("[ReadableTooltips] failed to inject style:", e);
  }
}

injectReadableTooltipsStyle();

export { injectReadableTooltipsStyle, STYLE_ID };
