[h1]Readable Tool Tips[/h1]
[i]Readable Tool Tips[/i] gives every tooltip in the game a little breathing room. The base game pins a tooltip's top-left corner right at the cursor, so the first line of text sits under the pointer and gets hidden. This mod nudges whatever tooltip is showing a small, consistent distance away from the cursor, so the text is clear of the pointer and easy to read.
It changes [b]nothing[/b] about how tooltips look: font, size, color, borders, padding and contents stay as they are. It only shifts the tooltip's position so the cursor stops covering it.
[h2]Why it exists[/h2]
The game runs two tooltip systems. One of them already offsets its tooltips from the cursor; the main one (the one behind most plot, unit, yield, and building hovers) does not, and drops the tooltip's top-left corner directly under the pointer. On some cursors and at some hover spots that tucks the first line or two out of sight. Readable Tool Tips gives that main system the same courtesy offset the other one already has.
[h2]What it does[/h2]
[list]
[*][b]Pushes tooltips clear of the cursor.[/b] Every active tooltip is moved a small distance off the pointer so its text is no longer hidden behind it.
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
[*][b]Potato McWhisky[/b], for teaching me to love again, Civilization-wise (Civ VI), after growing up as a Civilization II, IV, and V player. Making this mod is an act of faith that the community will eventually help make Civilization VII as good as the previous entries.
[/list]
