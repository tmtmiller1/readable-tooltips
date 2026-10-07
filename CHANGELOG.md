# Changelog

All notable changes to the **Readable Tool Tips** mod for Civilization VII.
Follows [Keep a Changelog](https://keepachangelog.com/) and Semantic
Versioning. The Steam Workshop change note for each release is generated from the
matching section below by `release.sh`.

## [Unreleased]

## [1.0.5] - 2026-09-21

Updated for Civilization VII 1.5.0. Every tooltip that follows the cursor now sits clear of it, including the new
map-tile tooltip that 1.5.0 introduced.

### Added
- The map-tile tooltip that 1.5.0 added sits close to the cursor; the mod now moves it 12px further away. This also
  works when another mod replaces the map-tile tooltip, such as QD Improved Plot Tooltip.
- Relationship, trade-route, peace-deal and production tooltips get the same extra 12px. Near a screen edge, where
  the game flips them to the other side of the cursor, they used to sit only 5-6px from it; they now sit 17-18px away.

### Fixed
- Tooltips near the right or bottom edge of the screen. When the game flipped a tooltip to the left of or above the
  cursor, the mod still pushed it down and to the right, back toward the cursor. In the bottom-right corner it covered
  the cursor. The extra space is now added on the side the tooltip actually opens.

## [1.0.4] - 2026-07-18

The offset now works in game, and it no longer clips the tech/civic "what you unlocked" popup.

### Fixed
- The mod now applies to your game. It was missing `<AffectsSavedGames>0</AffectsSavedGames>`, so the game treated it
  as save-affecting and skipped it when loading an existing save, and the UIScript never ran. With the flag added, the
  offset applies to any session, including saves it wasn't created with.
- Tech/civic "what you unlocked" tooltips no longer clip. Earlier versions offset the `#tooltip-root` tooltips with a
  CSS `transform`, which is applied *after* the game's on-screen clamp. That shoved the tall unlock popup off the edge
  and cut off its top-left corner.

### Changed
- The offset is now applied before the clamp, in JS. `readable-tooltips.js` wraps `TooltipController.reposition` and
  widens the cursor gap on the cursor anchor *before* the controller's edge-flip and on-screen clamp run, so every
  tooltip clears the cursor and is re-fitted on screen in every corner, with nothing shoved or clipped after the
  clamp. This replaces the old CSS approach, whose transform GameFace could not reliably apply to the animated
  `#tooltips` element anyway.
- There are now two offset tiers. Reward/decision tooltips over the world get the full gap; tooltips on the persistent
  HUD sub-system dock (tech/civic/wonders/legacies) get a gentler gap so they stay close to the small UI they
  describe.

## [1.0.3] - 2026-07-08

Readability fix for the tech/civic "what you unlocked" popup.

### Fixed
- Unlock-popup tooltips no longer have their top-left corner clipped. When a Civic or Tech completed, hovering the
  newly-unlocked items showed a tooltip whose top-left was cut off. Those are System 2 (`data-tooltip-content` /
  `#tooltip-root`) tooltips, which the game already offsets 24px from the cursor and clamps to the screen edge. The
  offset this mod added to that container in 1.0.1 was a CSS `transform` applied *after* the game's clamp, and
  `#tooltip-root` carries its own border/background/padding with no transparent wrapper, so there was no CSS lever
  that respects the clamp. For the tall, multi-line unlock tooltips (which flip into a corner and clamp tight to the
  edge), the post-clamp shift pushed the box off-screen and clipped it. Short yield/decision tooltips had slack, so
  only the unlock popup was visibly affected.

### Changed
- The mod now offsets only System 1 (`#tooltips`): the `fxs-tooltip` plot/unit/world hovers that place the tooltip's
  corner exactly at the cursor with no built-in offset, which is the readability problem this mod exists to solve.
  System 2 is left alone (its own 24px offset is adequate at normal UI scale), and System 3 (`#uinext-tooltips`)
  remains untouched as before. The only loss is a marginal spacing improvement for yield tooltips at >100% UI scale.

## [1.0.2] - 2026-07-06

Maintenance release. Nothing changes in what ships or how the mod behaves in game: the shipped
`ui/readable-tooltips.js` is byte-for-byte identical to 1.0.1. This release adds a developer quality gate around the
source so future changes don't cause regressions. All of the tooling below is dev-only and excluded from the Workshop
zip.

### Added
- An automated regression test. `tests/readable-tooltips.test.mjs` drives the style injection with a stubbed DOM and
  asserts it is idempotent: one `<style>` is added on first run and never duplicated on re-init. The mod relies on
  that to be safe to run in every UI context.
- An ESLint quality gate. `eslint.config.js` (flat config) enforces the same modularization and correctness rules used
  across the active tower mods (complexity/size ceilings, `no-undef` against the declared engine/browser globals,
  `eqeqeq`, and no unused vars), so drift is caught before release.
- One-command verification. `package.json` now exposes `lint`, `check` (`node --check`), `test`, and a combined
  `verify` script; `npm run verify` runs the full gate. The `package.json` version is realigned to the release
  version.

### Changed
- Nothing in the shipped mod. Behavior, positioning, and compatibility are unchanged from 1.0.1.

## [1.0.1] - 2026-07-04

Also offsets yield-amount and decision/reward tooltips, which use a second tooltip system the first release did not
cover.

### Fixed
- Yield amounts and decision/reward previews are no longer hidden under the cursor. These use the game's second
  cursor-following tooltip system (the `data-tooltip-content` / `#tooltip-root` controller), which the first release
  did not touch. That system adds only a fixed 24px cursor offset, so at higher UI scales (where the cursor is larger
  than 24px) the tooltip's corner still landed under the pointer. The offset now covers this system too, flip-aware
  via its `tooltip-align--*` classes, so it composes with the game's own inline positioning and always pushes the
  tooltip away from the cursor.

## [1.0.0] - 2026-07-04

First release. Every tooltip now sits clear of the cursor.

### Added
- Offset every tooltip off the cursor. The base game's main tooltip system pins a tooltip's top-left corner directly
  at the cursor, so the first line of text hides under the pointer. Readable Tool Tips moves whatever tooltip is
  active a small, consistent distance away from the cursor so its text is clear and readable. Only the position
  changes; font, size, color and contents are not altered.
- Flip-aware offset. When a tooltip flips to the left of or above the cursor near a screen edge, the offset direction
  flips with it, so the tooltip is pushed away from the cursor rather than back under it.
- Coexists with other tooltip mods. The offset is applied to the game's shared tooltip slot without reading or
  overriding any tooltip's own styling, and with no `!important` rules, so modded tooltips render unchanged; only
  their position shifts.
- Single tuning knob. One `OFFSET` value in `ui/readable-tooltips.js` controls how far tooltips sit from the cursor.
