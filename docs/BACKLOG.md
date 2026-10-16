# Backlog

One open item, the Map Trix check. The closed item after it came from the 2026-07-10 corpus bug-hunt audit, which
found the mod healthy (idempotent style injection, null-guarded, only Gameface-supported CSS); it's kept for the record.

## [Low · Open, needs a game] The plot-tooltip gap with Map Trix's own tooltip

**Site:** [README.md](../README.md), "Compatibility with other mods", as of 1.0.7
**What's known:** the wrapper has been watched re-registering at the winner's priority over QD Improved Plot Tooltip
(1) and Building Location Advisor (1000) with Map Trix loaded too (`engine-closed.md`, 2026-10-03 and 2026-10-09), but
in those sets QD or Building Location Advisor drew the tooltip. Map Trix replaces the game's `plot-tooltip.js` through
`ImportFiles`, so on its own its component is the one at priority 0 that the wrapper wraps. Its source (4.1.0 in the
corpus, 4.2.0 on Workshop) merges `offset: 22` under the props it's given, as the game's does, so the wider gap should
pass through. The July pairwise row (`mods_quality_analyses/compatibility-matrix-pairwise-checklist-2026-07-06.md`,
bz-map-trix) is still pending.
**Check:** with Readable Tool Tips and Map Trix the only user mods on, start a game and confirm the registry shows
`ReadableTooltipsPlotTooltip` at priority 0 wrapping Map Trix's component (its source holds `TRIX:` notes). Hover a
tile mid-screen and one in the bottom-right corner with a real cursor, once with Readable Tool Tips on and once off:
Map Trix's tooltip should sit about 12px further from the cursor with it on, flipped left and up in the corner, and
fully on-screen. Then update the README line and the pairwise row.

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
