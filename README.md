# Readable Tool Tips

A tiny Civilization VII UI mod that nudges **every** active game tooltip a small
distance away from the cursor, so hover text is no longer tucked under the
pointer and hidden. Pure spacing — no font, color, size, or content change.

## The problem

The game's main tooltip system (`fxs-tooltip` via `TooltipManagerSingleton`)
places the tooltip's **top-left corner right at the cursor position** —
`position.x = this.x` (cursor x), with no pointer offset at all
([tooltip-manager.js `updateTooltipPosition`](../../civilization_vii_1.4.1_gamefiles/Resources/Base/modules/core/ui/tooltips/tooltip-manager.js)).
So the top-left of the tooltip sits directly under the cursor body and gets
obscured. (The game's *other*, ui-next tooltip system already offsets by
`pointerOffsetX/Y: 16` — this one just doesn't.)

## The fix

Every hover tooltip — base **and** the custom tooltips other mods build
(bz-city-tooltip, dan-city-yields, tech-civic, …) — flows through that same
manager and lands as the single child of its root `<div>` inside `#tooltips`.
So we target that active-tooltip slot **structurally**:

```
#tooltips > div > *
```

…and `transform: translate()` it away from the cursor. We touch only the outer
positioning transform of the shared slot — never any tooltip's classes, font,
content, or internal layout — so every tooltip keeps its exact look and only its
position shifts.

### Flip-aware

When a tooltip would run off-screen the manager flips it and adds a `.right`
and/or `.above` class so it renders to the left of / above the cursor. We read
those same classes and mirror our offset in all four flip states, so the tooltip
is always pushed *away* from the cursor, never back under it.

### Why transform, not margin

The manager re-positions the tooltip's root wrapper every frame from the
tooltip's measured `offsetWidth/Height`, which excludes margins. A margin would
desync that on-screen clamp/flip math; a `transform: translate()` moves the
rendered box by an exact amount without changing the measured layout box, so the
game's own edge-clamping keeps working. The base game only ever sets
`transform: translateX(0rem)` on the tooltip element (a no-op) and drives real
positioning through the root wrapper, so overriding the element transform here
is safe.

## Tuning

One knob at the top of `ui/readable-tooltips.js`:

```js
const OFFSET = "1.25rem"; // how far to push the tooltip off the cursor
```

The game's ui-next tooltips use `16px` (~`0.9rem`); `1.25rem` clears the cursor
body a little more comfortably. Raise for more spacing, lower for less.

## Mod-conflict safety (100% compatible by construction)

- **Structural selector, not classes/content.** We match the manager's active
  slot (`#tooltips > div > *`), so we hit whatever tooltip is live without
  depending on — or overriding — any mod's own tooltip classes or styles.
- **Only the outer position changes.** No font, size, color, padding, or
  internal layout is touched, so a modded tooltip renders identically, just
  shifted off the cursor.
- **No `!important`.** The `<style>` is appended to `document.head` after the
  base game CSS, so load order alone wins the cascade — while leaving any mod
  free to override tooltip positioning if it ever wants to.
- **Unique everywhere.** Mod id, package name, ActionGroup ids, the injected
  `<style>` id (`readable-tooltips-style`), and the `LOC_MOD_READABLE_TOOLTIPS_*`
  localization tags are all unique across the mods corpus.

## How it loads

`ui/readable-tooltips.js` idempotently injects one small `<style>` element into
`document.head`. It is registered in both the **shell** (main-menu) and **game**
scopes so front-end and in-game tooltips are both covered.

## Reversibility

Pure CSS transform, no base-game files replaced, no gameplay effect. Disable the
mod for vanilla tooltip positioning.
