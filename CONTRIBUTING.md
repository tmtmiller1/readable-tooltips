# Contributing

Readable Tool Tips is deliberately tiny: a single injected stylesheet that
offsets the game's shared tooltip slot away from the cursor. Please keep it that
way.

## Ground rules

- **Position only.** The mod must never change a tooltip's font, size, color,
  padding, borders, or contents — only where it sits relative to the cursor. Any
  change that alters tooltip appearance belongs in a different mod.
- **Stay mod-compatible.** Target the shared tooltip slot structurally
  (`#tooltips > div > *`), never another mod's tooltip classes, and never use
  `!important`. A modded tooltip must render identically, just shifted.
- **No base-game files replaced. No gameplay effect.**

## Layout

- `ui/readable-tooltips.js` — the whole mod. One `<style>` injector; the `OFFSET`
  constant at the top is the single tuning knob.
- `readable-tooltips.modinfo` — registers the script in the shell and game
  scopes.
- `text/en_us/ModText.xml` — localized mod name and description.
- `images/`, `docs/` — icon and Steam Workshop assets.

## Releasing

`./release.sh` builds `dist/readable-tooltips/`, zips it with the modinfo at the
zip root, renders the 1024×1024 Workshop preview from
`docs/workshop-preview.svg`, and writes the steamcmd `.vdf` manifests. The change
note is generated from the matching section of `CHANGELOG.md`.
