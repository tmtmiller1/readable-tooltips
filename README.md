# Readable Tool Tips

A small Civilization VII UI mod that moves cursor-following tooltips a little further from the pointer, so hover text
is not tucked under the cursor. Position only — no font, color, size, or content change.

## What it covers

Civilization VII 1.5.0 draws cursor tooltips three ways, and the mod widens the cursor gap in each:

| Tooltips | Examples | Game gap | With the mod |
|---|---|---|---|
| `#tooltip-root` (`TooltipController`) | yields, dock buttons, diplomacy ribbon, minimap, decisions, main menu | 24px | 36px (28px on the dock) |
| `#tooltips` (`TooltipManager`) | relationship and war-support icons, trade routes, peace deals, production items | 22px | 34px |
| ui-next `PlotTooltip` | hovering map tiles | 22px | 34px |

Near a screen edge each system flips its tooltip to the left of or above the cursor. The mod adds its gap on the side
the tooltip actually opened, so a flipped tooltip is pushed further away from the cursor, and every tooltip stays
on-screen in every corner. Tooltips anchored to an element (not the cursor), such as tech-tree cards, are left alone.

## How it works

The mod widens the gap inside each system's own placement code, before that system's on-screen clamp runs, so the
game's edge-flip and clamp fit the offset tooltip on-screen:

- `TooltipController.reposition` is wrapped to push the cursor anchor for the duration of the call.
- `TooltipManager.updateTooltipPosition` is wrapped the same way, and the manager's resize observer is rebound to the
  wrapped method.
- `PlotTooltip` is re-registered through ui-next's `ComponentRegistry` override mechanism as the same component with a
  wider `offset`.

## Tuning

Two knobs at the top of `ui/readable-tooltips.js`:

```js
const WORLD_OFFSET_PX = 12; // world/popup/map tooltips
const HUD_OFFSET_PX = 4;    // persistent HUD sub-system-dock tooltips — gentler
```

Raise for more spacing, lower for less.

## Compatibility with other mods

- Each wrapper calls the original method and restores every field it touches, so it composes with other mods that
  patch the same methods.
- The `PlotTooltip` override wraps whatever plot tooltip is registered, including another mod's replacement (for
  example QD Improved Plot Tooltip or Map Trix), at the same priority, so a plot-tooltip mod that loads later still
  replaces it; the wrapper then re-applies itself on top of that mod's version. The offset is a fixed target, so
  layered wrappers never stack it, and a larger gap set by another mod is kept.
- No CSS, no `!important`, no base-game files replaced.
- `AffectsSavedGames` is 0, so the mod applies to existing saves.

## How it loads

`ui/readable-tooltips.js` is registered in both the shell (main menu) and game scopes. Every patch is idempotent and
guarded: if a future game update moves a method, that one offset is skipped and the UI keeps working.

## Tests

`npm run verify` runs lint, a syntax check, and unit tests for the offset tiers, flip direction, and plot offset.
