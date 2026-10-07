# Backlog

Open items not yet addressed. Findings from the 2026-07-10 corpus bug-hunt audit unless noted. The audit found the
mod healthy: idempotent style injection, null-guarded, only Gameface-supported CSS. One watch item.

## [Low · Plausible, watch item] Flip-class mirror rules assume the class is on the tooltip element

**Sites:** [ui/readable-tooltips.js:89](../ui/readable-tooltips.js) (`SLOT = "#tooltips > div > *"`) and the
`.right`/`.above` mirror rules (`:101-109`), as of 1.0.3
**Symptom:** the mirror rules assume the flip classes (`.right`/`.above`) live on the tooltip element (the child `*`),
not on the wrapper `div`. If in 1.4.x the tooltip manager puts them on the wrapper (`#tooltips > div.right`), the
mirrored rules never match.
**Failure scenario:** in flipped screen corners the base `translate(+offset,+offset)` pushes the tooltip back toward
or under the cursor, the exact problem the mod exists to fix, but only in corners. Not a proven defect:
`core/ui/tooltips/tooltip-manager.js` is packed inside `Assets.car`/`.dep`, so it couldn't be confirmed against
source. The author's header comment asserts the classes are on the tooltip element.
**Fix:** verify class placement against the packed source (or via in-game DOM inspection); if the classes are on the
wrapper, retarget the mirror rules to `#tooltips > div.right` etc.

**Status: closed.** Wrapper-scoped variants (`#tooltips > div.right > *`, `.above`, `.right.above`) were first added
alongside the child-scoped rules so either placement would match. 1.0.4 then dropped the stylesheet altogether: the
offset is applied in JS inside each tooltip system's own placement code, and the direction is read from where the
tooltip actually landed (the `right`/`above` classes for `TooltipManager`, the clamp result for `TooltipController`),
so the class-placement question no longer arises.

**Original design (verification-gated):** the tooltip manager JS lives inside `Assets.car`/`.dep` and is not on disk,
so this was to start with a DOM probe, not a code change:
1. In-game, hover a tooltip in a screen corner (to force a flip) and inspect the live `#tooltips` subtree to see
   whether `.right`/`.above` sit on the wrapper `div` (`#tooltips > div.right`) or on the child tooltip element
   (`#tooltips > div > *.right`, which the rules assumed, `readable-tooltips.js:101-109`).
2. If on the child, the assumption holds: no change.
3. If on the wrapper, make the mirror rules match both by adding wrapper-scoped variants, e.g.
   `#tooltips > div.right > *` alongside the existing `#tooltips > div > *.right`, so a future manager change can't
   silently regress corners. Keep the base `SLOT` offset rule unchanged.
**Verify:** after the change, tooltips in all four screen corners point away from the cursor (no under-cursor overlap).
