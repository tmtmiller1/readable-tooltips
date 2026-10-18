# Readable Tool Tips

A small Civilization VII UI mod that moves cursor-following tooltips a little further from the pointer, so hover text
is not tucked under the cursor. It only moves tooltips; fonts, colors, sizes and contents are untouched.

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
const HUD_OFFSET_PX = 4;    // HUD sub-system-dock tooltips, a smaller gap
```

Raise for more spacing, lower for less.

## Compatibility with other mods

- Each wrapper calls the original method and restores every field it touches, so it composes with other mods that
  patch the same methods.
- The `PlotTooltip` override wraps whatever plot tooltip is registered, at the same priority, so a plot-tooltip mod
  that loads later still replaces it; the wrapper then re-applies itself on top of that mod's version. It's been
  watched doing that over QD Improved Plot Tooltip, also with Map Trix loaded. Map Trix's own tooltip, the one you see
  when Map Trix is your only plot-tooltip mod, takes the same `offset` setting going by its source, but that pair is
  still to be checked in a game. The offset is a fixed target, so layered wrappers never stack it, and a larger gap
  set by another mod is kept.
- No CSS, no `!important`, no base-game files replaced.
- `AffectsSavedGames` is 0, so the mod applies to existing saves.

## How it loads

`ui/readable-tooltips.js` is registered in both the shell (main menu) and game scopes. Every patch is idempotent and
guarded: if a future game update moves a method, that one offset is skipped and the UI keeps working.

## Tests

`npm run verify` runs lint, a syntax check, and unit tests for the offset tiers, flip direction, and plot offset. The
three wrappers are tested against small stand-ins for the game modules the script imports (`tests/stubs/`, mapped in
by `tests/loader.mjs`): a second patch adds nothing, a missing method only skips that offset, and fixed-position,
touch and gamepad tooltips go straight to the game's code.

## Civilopedia History Corrections

This mod also carries Civilopedia History Corrections, a text patch for
[Civilopedia Expanded: Independents](https://steamcommunity.com/sharedfiles/filedetails/?id=3815309882). With that mod
on, six East Asian history pages (Goguryeo, the Oirat, two Ryukyu pages, Nanzhao and Balhae) give each side where
historians in different countries disagree, and a few factual errors are fixed. With it off, the game's pages stay as
they are. The text is in `history-corrections/`, in English, Simplified Chinese and Traditional Chinese. Every Tower mod
that carries it writes the same text, so running several of them together is fine.

Those paragraphs were replaced because they didn't hold up. Some repeated Chinese state historiography as settled
fact, or recast a question most historians consider answered as still open. Some got basic dates and places wrong. And
the Oirat page called a genocide, the Qing destruction of most of the Dzungar people in 1755-1757, a "pacification."
I'm not leaving that in place. More corrections to Civilopedia Expanded may be added at any time, in any update.
Corrections may also be added for any other mod whose text I judge, in my sole discretion, to be bigoted,
genocide-denying or otherwise historically inaccurate. Running this mod alongside any of them means you accept those
replacements, including any added later. Switch this mod off and their pages read as their authors wrote them.

## License

Up to version 1.0.7 this mod was MIT, and copies of those versions stay MIT. Versions after 1.0.7 are under the Tower
Mod License 1.0 in [LICENSE](LICENSE), written in plain English.

You're welcome to play it, read the code to see how it works, and change your own copy for your own games. If you'd
like to reupload it, put parts of it in your own mod, or use it some other way, ask me first: open an issue here or
message Tower on Steam. `ui/settings-keeper.js` stays MIT so other mods can keep embedding it.

I don't want this mod's code, text or art used to train AI models, collected into AI training sets, or handed to AI
tools to copy into other projects, and the license doesn't allow it without my written permission. I also reserve the
rights to text and data mining of this work under Article 4(3) of the EU's Directive 2019/790.

Because the source is on GitHub, GitHub and its affiliates (Microsoft included) have their own license to it under
GitHub's Terms of Service, and since April 2026 that covers training their AI. Valve and Take-Two have the rights
their own terms give them. Sid Meier's Civilization VII and its assets belong to Firaxis Games and 2K. Material from
other people is listed in [LICENSE](LICENSE).
