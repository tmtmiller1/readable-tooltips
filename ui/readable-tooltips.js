/**
 * Readable Tool Tips
 * --------------------------------------------------------------------------
 * Pushes the game's cursor-following "simple" tooltips a little further off the
 * cursor so their first characters aren't tucked under the pointer — without
 * ever pushing a tall tooltip off-screen.
 *
 * WHICH TOOLTIPS
 *   The simple TooltipController (container `#tooltip-root`) draws the
 *   `data-tooltip-content` hovers: yield amounts, decision/narrative reward
 *   previews, and the tech/civic "what you unlocked" popup. It places the
 *   tooltip at the cursor + a fixed 24px gap and then clamps it on-screen; at
 *   normal UI scale that 24px still leaves the tooltip's corner close under the
 *   cursor.
 *
 * HOW — and why it can't clip
 *   We do NOT offset with CSS. A CSS `transform` on `#tooltip-root` is applied
 *   AFTER the controller's on-screen clamp, so on a tall tooltip pinned to a
 *   screen edge it shoves the box back off the edge and clips its top-left corner
 *   (the old tech/civic unlock-popup regression). Instead we widen the cursor gap
 *   BEFORE the clamp: we wrap the controller's `reposition` — the cursor-following
 *   path only — and add our offset to the cursor anchor for the duration of the
 *   call. The controller's own edge-flip and clamp then run on the offset anchor,
 *   so the tooltip is pushed off the cursor AND re-fitted on-screen in every
 *   corner. Element-anchored tooltips use a different path and are untouched.
 *
 * TWO TIERS
 *   Reward/decision tooltips (over the world / in popups) get the full gap;
 *   tooltips anchored to the persistent HUD sub-system dock (tech/civic/wonders/
 *   legacies) get a gentler gap so they don't drift far from the small UI they
 *   describe.
 *
 * COMPATIBILITY (an "ultra-compatible" patch)
 *   - No gameplay/database change, so the modinfo sets `AffectsSavedGames` to 0
 *     and it applies to any session including existing saved games.
 *   - The wrapper calls the original `reposition` and restores the one field it
 *     touches, so it composes with other mods and never leaves the controller in
 *     a modified state between frames.
 *   - Fully guarded: a future engine change can only cost this offset, never
 *     break the UI context.
 */

// Extra cursor gap, in screen px, ADDED on top of the game's built-in 24px gap.
// Two knobs: raise for more spacing, lower for less.
const WORLD_OFFSET_PX = 12; // reward/decision/world tooltips (sit under the cursor)
const HUD_OFFSET_PX = 4;    // persistent HUD sub-system-dock tooltips — gentler

// A hovered element inside this container marks a persistent-HUD tooltip, which
// gets the gentler HUD gap. Extend the selector if other HUD areas should too.
const HUD_CONTEXT_SELECTOR = ".sub-system-dock";

const REPOSITION_PATCHED = "__readableTooltipsRepositionPatched";

/**
 * How far to push a tooltip whose hovered element is `context`.
 * @param {*} context The element the tooltip describes (TooltipController.tooltipContext).
 * @returns {number} Extra gap in screen px.
 */
function offsetForContext(context) {
  try {
    if (context && typeof context.closest === "function" && context.closest(HUD_CONTEXT_SELECTOR)) {
      return HUD_OFFSET_PX;
    }
  } catch (_e) {
    // Any DOM oddity: fall back to the default world offset.
  }
  return WORLD_OFFSET_PX;
}

/**
 * Wrap TooltipController.reposition so the cursor gap is widened BEFORE the
 * controller's own on-screen clamp runs. Idempotent and self-guarding.
 * @returns {Promise<void>} Resolves once the (attempted) patch settles.
 */
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
      const extra = offsetForContext(this.tooltipContext);
      const savedX = this.tooltipX;
      const savedY = this.tooltipY;
      this.tooltipX = savedX + extra;
      this.tooltipY = savedY + extra;
      try {
        return originalReposition.call(this);
      } finally {
        this.tooltipX = savedX;
        this.tooltipY = savedY;
      }
    };
    proto[REPOSITION_PATCHED] = true;
  } catch (e) {
    // Never let a cosmetic tweak break a UI context.
    console.error("[ReadableTooltips] failed to patch TooltipController:", e);
  }
}

patchTooltipController();

export { patchTooltipController, offsetForContext, WORLD_OFFSET_PX, HUD_OFFSET_PX };
