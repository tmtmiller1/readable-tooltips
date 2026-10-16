[h1]Readable Tool Tips[/h1]
[i]Readable Tool Tips[/i] gives every tooltip that follows the cursor a little breathing room. The base game places these tooltips close to the pointer, so at larger UI scales, or when a tooltip flips near a screen edge, the cursor can cover the first line of text. This mod nudges whatever tooltip is showing a small, consistent distance further away, so the text is clear of the pointer and easy to read.
Tooltips look [b]exactly the same[/b]: font, size, color, borders, padding and contents stay as they are. Only the tooltip's position moves, so the cursor stops covering it.
[h2]Why it exists[/h2]
The game draws cursor tooltips three ways: one system for yields, HUD buttons and decisions, another for relationship, trade-route, peace-deal and production tooltips, and the map-tile tooltip that came with update 1.5.0. Each leaves a 22-24px gap between the cursor and the tooltip. At higher UI scales the cursor is bigger than that, so the tooltip's corner lands under the pointer, and near a screen edge, where the game flips a tooltip to the other side of the cursor, some sat just 5-6px from it. Readable Tool Tips widens the gap in all three, on whichever side the tooltip opens.
[h2]What it does[/h2]
[list]
[*][b]Pushes tooltips clear of the cursor.[/b] Every tooltip that follows the cursor, the map-tile tooltip included, moves 12px further off the pointer so its text is no longer hidden behind it.
[*][b]Stays on-screen.[/b] When a tooltip flips to the left of or above the cursor near a screen edge, the offset flips with it, so the tooltip is pushed [i]away[/i] from the cursor in every corner.
[*][b]Touches only position.[/b] Font, size, color, spacing and contents are left alone. Tooltips read exactly as the game (or another mod) draws them, just shifted off the pointer.
[*][b]Two knobs.[/b] Two offset values in the mod's script set how far tooltips sit from the cursor: one for tooltips over the map and in popups, a smaller one for the HUD buttons.
[/list]
[h2]Source and documentation[/h2]
[list]
[*][b]What's new:[/b] [url=https://github.com/tmtmiller1/readable-tooltips/releases/latest]the latest release notes and a download[/url]
[*][b]Full documentation:[/b] [url=https://github.com/tmtmiller1/readable-tooltips/blob/main/README.md]how the mod works[/url]
[/list]
[h2]For modders[/h2]
This mod is developed with [url=https://github.com/tmtmiller1/civilizationvii_tower-bench]Tower Bench[/url], a free, open-source test bench for macOS to make it easier to create Civilization VII mods.
[h2]Credits[/h2]
[list]
[*][b]Tower[/b], for design and Civilization VII implementation.
[/list]
[h2]Special Thanks[/h2]
[list]
[*][b]Potato McWhisky[/b], for teaching me to love again, Civilization-wise (Civ VI), after growing up as a Civilization II, IV, and V player.
[/list]
