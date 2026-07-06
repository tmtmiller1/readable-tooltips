[h1]Readable Tool Tips[/h1]

[i]Readable Tool Tips[/i] gives every tooltip in the game a little breathing room. The base game pins a tooltip's top-left corner right at the cursor, so the first line of text sits under the pointer and gets hidden. This mod nudges whatever tooltip is showing a small, consistent distance away from the cursor, so the text is always clear of the pointer and easy to read.

That is the whole mod. It changes [b]nothing[/b] about how tooltips look — not the font, size, color, borders, padding, or contents. It only shifts the tooltip's position so the cursor stops covering it.

[b]Why it exists[/b]

The game runs two tooltip systems. One of them already offsets its tooltips from the cursor; the main one — the one behind most plot, unit, yield, and building hovers — does not, and drops the tooltip's top-left corner directly under the pointer. On some cursors and at some hover spots that tucks the first line or two out of sight. Readable Tool Tips gives that main system the same courtesy offset the other one already has.

[b]What it does[/b]

[list]
[*][b]Pushes tooltips clear of the cursor.[/b] Every active tooltip is translated a small distance off the pointer so its text is no longer hidden behind it.
[*][b]Stays on-screen.[/b] When a tooltip flips to the left of or above the cursor near a screen edge, the offset flips with it — the tooltip is always pushed [i]away[/i] from the cursor, never back under it, in every corner.
[*][b]Touches only position.[/b] No font, size, color, spacing, or content change of any kind. Tooltips read exactly as the game (or another mod) draws them, just shifted off the pointer.
[*][b]One simple knob.[/b] A single offset value controls how far tooltips sit from the cursor, easily tuned in the mod's one small script.
[/list]

[b]Built to coexist with other mods[/b]

Readable Tool Tips is designed to be safe alongside other tooltip mods (city-yield tooltips, tech/civic tooltips, plot tooltip overhauls, and so on). It works by offsetting the game's shared tooltip slot — the single place every tooltip, base or modded, is shown — without reading or overriding any tooltip's own styling. A modded tooltip renders pixel-for-pixel as its author intended; only its position shifts. There are no [i]!important[/i] overrides, so any mod that wants to control tooltip positioning still can.

[b]What it does not do[/b]

[list]
[*]No base-game files replaced.
[*]No gameplay effect, no AI change, no balance change.
[*]No change to tooltip appearance — position only.
[*]Fully reversible: turn it off for vanilla tooltip placement.
[/list]

[b]Installation[/b]

[list=1]
[*]Download or subscribe to the mod.
[*]Place the [b]readable-tooltips[/b] folder in the Civilization VII Mods directory.
[*]Enable Readable Tool Tips from Additional Content in-game.
[/list]

[b]Credits[/b]

[list]
[*]Tower, for design and Civilization VII implementation.
[/list]
