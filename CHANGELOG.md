# Changelog

All notable changes to the **Readable Tool Tips** mod for Civilization VII.
Loosely follows [Keep a Changelog](https://keepachangelog.com/) and Semantic
Versioning. The Steam Workshop change note for each release is generated from the
matching section below by `release.sh`.

## [Unreleased]

## [1.0.4] - 2026-07-18

The offset actually works in-game now, and it no longer clips the tech/civic
"what you unlocked" popup.

### Fixed
- **The mod now applies to your game at all.** It was missing
  `<AffectsSavedGames>0</AffectsSavedGames>`, so the game treated it as
  save-affecting and silently skipped it when loading an existing save — the
  UIScript never ran. Added the flag; the offset applies to any session,
  including saves it wasn't created with.
- **Tech/civic "what you unlocked" tooltips no longer clip.** Earlier versions
  offset the `#tooltip-root` tooltips with a CSS `transform`, which is applied
  *after* the game's on-screen clamp and shoved the tall unlock popup off the
  edge, cutting off its top-left corner.

### Changed
- **The offset is now applied before the clamp, in JS.** `readable-tooltips.js`
  wraps `TooltipController.reposition` and widens the cursor gap on the cursor
  anchor *before* the controller's edge-flip and on-screen clamp run, so every
  tooltip clears the cursor and is re-fitted on-screen in every corner — no
  post-clamp shove, no clip. This replaces the old CSS approach, whose transform
  GameFace could not reliably apply to the animated `#tooltips` element anyway.
- **Two offset tiers.** Reward/decision tooltips over the world get the full gap;
  tooltips on the persistent HUD sub-system dock (tech/civic/wonders/legacies)
  get a gentler gap so they stay close to the small UI they describe.

## [1.0.3] - 2026-07-08

Readability fix for the tech/civic "what you unlocked" popup.

### Fixed
- **Unlock-popup tooltips no longer have their top-left corner clipped.** When a
  Civic or Tech completed, hovering the newly-unlocked items showed a tooltip
  whose top-left was cut off. Those are System 2 (`data-tooltip-content` /
  `#tooltip-root`) tooltips, which the game already offsets 24px from the cursor
  **and** clamps to the screen edge. The offset this mod added to that container
  in 1.0.1 was a CSS `transform` applied *after* the game's clamp, and
  `#tooltip-root` carries its own border/background/padding with no transparent
  wrapper — so there was no clamp-respecting CSS lever. For the tall, multi-line
  unlock tooltips (which flip into a corner and clamp tight to the edge), the
  post-clamp shift pushed the box off-screen and clipped it. Short yield/decision
  tooltips had slack, so only the unlock popup was visibly affected.

### Changed
- **The mod now offsets only System 1 (`#tooltips`)** — the `fxs-tooltip`
  plot/unit/world hovers that place the tooltip's corner *exactly* at the cursor
  with no built-in offset, which is the readability problem this mod exists to
  solve. System 2 is left alone (its own 24px offset is adequate at normal UI
  scale); System 3 (`#uinext-tooltips`) remains untouched as before. The only
  loss is a marginal spacing improvement for yield tooltips at >100% UI scale.

## [1.0.2] - 2026-07-06

Maintenance release. No change to what ships or how the mod behaves in-game —
the shipped `ui/readable-tooltips.js` is byte-for-byte identical to 1.0.1. This
release adds a developer quality gate around the source so future changes stay
regression-safe. All of the tooling below is dev-only and excluded from the
Workshop zip.

### Added
- **Automated regression test.** `tests/readable-tooltips.test.mjs` drives the
  style injection with a stubbed DOM and asserts it is idempotent — one `<style>`
  is added on first run and never duplicated on re-init — locking in the
  "safe to run in every UI context" guarantee the mod relies on.
- **ESLint quality gate.** `eslint.config.js` (flat config) enforces the same
  modularization and correctness rules used across the active tower mods —
  complexity/size ceilings, `no-undef` against the declared engine/browser
  globals, `eqeqeq`, and no unused vars — so drift is caught before release.
- **One-command verification.** `package.json` now exposes `lint`, `check`
  (`node --check`), `test`, and a combined `verify` script; `npm run verify`
  runs the full gate. `package.json` version is realigned to the release version.

### Changed
- Nothing in the shipped mod. Behavior, positioning, and compatibility are
  unchanged from 1.0.1.

## [1.0.1] - 2026-07-04

Also offsets yield-amount and decision/reward tooltips, which use a second
tooltip system the first release did not cover.

### Fixed
- **Yield amounts and decision/reward previews are no longer hidden under the
  cursor.** These use the game's second cursor-following tooltip system (the
  `data-tooltip-content` / `#tooltip-root` controller), which the first release
  did not touch. That system adds only a fixed 24px cursor offset, so at higher
  UI scales — where the cursor is larger than 24px — the tooltip's corner still
  landed under the pointer. The offset now covers this system too, flip-aware via
  its `tooltip-align--*` classes, so it composes with the game's own inline
  positioning and always pushes the tooltip away from the cursor.

## [1.0.0] - 2026-07-04

First release. Every tooltip now sits clear of the cursor.

### Added
- **Offset every tooltip off the cursor.** The base game's main tooltip system
  pins a tooltip's top-left corner directly at the cursor, so the first line of
  text hides under the pointer. Readable Tool Tips translates whatever tooltip is
  active a small, consistent distance away from the cursor so its text is always
  clear and readable. Pure position change — no font, size, color, or content is
  altered.
- **Flip-aware offset.** When a tooltip flips to the left of or above the cursor
  near a screen edge, the offset direction flips with it, so the tooltip is
  always pushed away from the cursor and never back under it.
- **Coexists with other tooltip mods.** The offset is applied to the game's
  shared tooltip slot without reading or overriding any tooltip's own styling,
  and with no `!important` rules, so modded tooltips render exactly as their
  authors intended — only their position shifts.
- **Single tuning knob.** One `OFFSET` value in `ui/readable-tooltips.js`
  controls how far tooltips sit from the cursor.
