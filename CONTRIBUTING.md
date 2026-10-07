# Contributing

Readable Tool Tips is small: one script that wraps the game's tooltip placement code so each tooltip is placed a
little further from the cursor. Keep it that size.

## Ground rules

- Position only. The mod must never change a tooltip's font, size, color, padding, borders, or contents, only where
  it sits relative to the cursor. Any change that alters tooltip appearance belongs in a different mod.
- Stay mod-compatible. Each wrapper calls the original method and restores every field it touches, and the
  `PlotTooltip` override re-registers at the same priority so a later plot-tooltip mod still wins. No CSS, no
  `!important`. A modded tooltip must render identically, just shifted.
- No base-game files replaced. No gameplay effect.

## Layout

- `ui/readable-tooltips.js` is the whole mod. It wraps `TooltipController.reposition` and
  `TooltipManager.updateTooltipPosition` and re-registers ui-next's `PlotTooltip` with a wider `offset`.
  `WORLD_OFFSET_PX` and `HUD_OFFSET_PX` at the top are the two tuning knobs.
- `readable-tooltips.modinfo` registers the script in the shell and game scopes.
- `text/en_us/ModText.xml` holds the localized mod name and description.
- `tests/`, `eslint.config.js` and `package.json` are the dev gate; `npm run verify` runs lint, a syntax check and the
  unit tests.
- `images/`, `docs/` hold the icon and Steam Workshop assets.

## Releasing

`./release.sh` runs the gate, builds `dist/readable-tooltips/`, zips it with the modinfo at the zip root, renders the
1024×1024 Workshop preview from `docs/workshop-preview.svg`, and writes the steamcmd `.vdf` manifests. The change note
is taken from `CHANGELOG.steam.txt`, which `scripts/steam-changelog.mjs` generates from the matching section of
`CHANGELOG.md`.
