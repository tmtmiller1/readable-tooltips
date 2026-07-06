# Changelog

All notable changes to the **Readable Tool Tips** mod for Civilization VII.
Loosely follows [Keep a Changelog](https://keepachangelog.com/) and Semantic
Versioning. The Steam Workshop change note for each release is generated from the
matching section below by `release.sh`.

## [Unreleased]

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
