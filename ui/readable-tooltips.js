/**
 * Readable Tool Tips
 * --------------------------------------------------------------------------
 * Pushes the active game tooltip a small distance away from the cursor so it is
 * no longer tucked under the pointer and is easy to read. Pure spacing — no
 * font, color, size, or content change of any kind.
 *
 * THE PROBLEM WE FIX — System 1 places the tooltip UNDER the cursor
 *   `fxs-tooltip` / TooltipManagerSingleton (container `#tooltips`) — plot,
 *   unit, and most world/UI hovers — puts the tooltip's TOP-LEFT CORNER exactly
 *   at the cursor with NO offset (tooltip-manager.js, updateTooltipPosition), so
 *   the pointer sits on top of the first characters. That is the readability
 *   problem this mod exists to solve.
 *
 * THE FIX — a positional offset on the manager's active-tooltip slot
 *   The manager's active tooltip is the single child of its root <div> inside
 *   `#tooltips`, so we target that slot structurally (`#tooltips > div > *`) and
 *   translate it away from the cursor. Base tooltips and the custom tooltips
 *   other mods build (bz-city-tooltip, dan-city-yields, tech-civic, ...) all
 *   flow through that same slot. We touch only the outer positioning transform
 *   of the shared container — never any tooltip's classes, font, content, or
 *   internal layout — so every tooltip (base or modded) keeps its exact look and
 *   only its position shifts. That is what keeps this 100% compatible.
 *
 * WHY WE NO LONGER TOUCH THE OTHER TWO SYSTEMS
 *   - System 2 — the simple TooltipController (container `#tooltip-root`): the
 *     `data-tooltip-content` hovers (yield amounts, decision/reward previews,
 *     and the tech/civic "what you unlocked" popup). It ALREADY adds a 24px
 *     cursor offset AND does its own edge-clamping so the box always fits on
 *     screen (constrainTipToRect / verifyAlignment). v1.0.1 also offset this
 *     container, but a CSS `transform` is applied AFTER the game clamps, and
 *     `#tooltip-root` carries the visible border/background/padding itself with
 *     no transparent outer wrapper — so there is no CSS lever that the clamp
 *     respects. For the tall, multi-line tooltips (the tech/civic unlock popup,
 *     which sits low-left where the tooltip flips into a corner and is clamped
 *     tight to the edge) the post-clamp shift pushed the box's TOP-LEFT corner
 *     off-screen and clipped it. Short yield tooltips had slack and looked fine,
 *     which is why the breakage was specific to the unlock popup. System 2's own
 *     24px offset is adequate at normal UI scale, so we leave it entirely alone.
 *   - System 3 — `#uinext-tooltips`: anchors tooltips to their target ELEMENT
 *     rather than the cursor, so it was never the "hidden under the cursor"
 *     problem; transforming it could detach a tooltip from the control it
 *     describes. Left untouched.
 *
 * FLIP-AWARE (stays on-screen)
 *   The manager flips the tooltip near a screen edge to keep it on-screen and
 *   exposes the flip direction as `.right`/`.above` classes. We read those and
 *   mirror our offset for each case, so the tooltip is always pushed AWAY from
 *   the cursor, never back under it, in every corner.
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

// We only touch System 1 — fxs-tooltip / TooltipManagerSingleton → container
// `#tooltips`. Used by plot, unit, and most world/UI hovers, it places the
// tooltip's top-left exactly at the cursor with NO offset. Positioned via a
// transform on the manager's root wrapper; the active tooltip is that wrapper's
// only child, so `#tooltips > div > *` targets whatever tooltip is shown — base
// or modded — without depending on its own classes.
//
// System 2 (`#tooltip-root`, the `data-tooltip-content` hovers) and System 3
// (`#uinext-tooltips`, element-anchored) are intentionally NOT touched — see the
// header comment for why. System 2 already offsets + clamps itself, and a
// post-clamp transform clipped the tall tech/civic unlock-popup tooltips.
const SLOT = "#tooltips > div > *";

const CSS = `
/* Readable Tool Tips — offset the active tooltip off the cursor. */

/* System 1 — fxs-tooltip (#tooltips): plot/unit/most world hovers.
   The manager flips the tooltip near a screen edge and marks the flip with
   .right / .above classes, so we mirror the offset to always push AWAY from
   the cursor. */
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

/* Belt-and-suspenders: some builds put the flip class on the WRAPPER div rather
   than the tooltip element. These wrapper-scoped variants carry higher specificity,
   so whichever placement the manager actually uses wins; if the class is on the
   child (the common case above), these simply don't match. Keeps corner tooltips
   pushing away from the cursor across manager changes. */
#tooltips > div.right > * {
  transform: translate(calc(-1 * ${OFFSET}), ${OFFSET});
}
#tooltips > div.above > * {
  transform: translate(${OFFSET}, calc(-1 * ${OFFSET}));
}
#tooltips > div.right.above > * {
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
