[h1]Readable Tool Tips[/h1]

[i]Readable Tool Tips[/i] moves every tooltip in the game a short distance off the cursor. The base game pins a tooltip's top-left corner right at the cursor, so the first line of text sits under the pointer and gets hidden. This mod nudges whatever tooltip is showing a small, consistent distance away from the cursor, so the text is always clear of the pointer and easy to read.

That is the whole mod. It changes [b]nothing[/b] about how tooltips look — not the font, size, color, borders, padding, or contents. It only shifts the tooltip's position so the cursor stops covering it.

[b]Why it exists[/b]

The game draws cursor tooltips three ways: the yield, dock, ribbon and menu hovers; the relationship, trade-route, peace-deal and production hovers; and, since update 1.5.0, the hover over map tiles. All three sit only 22-24px from the pointer, and near a screen edge some flip to within a few pixels of it. On most cursors that tucks the first line out of sight. Readable Tool Tips widens the gap in all three.

[b]What it does[/b]

[list]
[*]Every cursor-following tooltip, including the map-tile tooltip, sits a little further off the pointer so its text is clear of it.
[*]When a tooltip flips to the left of or above the cursor near a screen edge, the offset flips with it, so the tooltip is always pushed [i]away[/i] from the cursor, never back under it, in every corner.
[*]No font, size, color, spacing, or content change of any kind. Tooltips read exactly as the game (or another mod) draws them, just shifted off the pointer.
[*]A single offset value controls how far tooltips sit from the cursor, tuned in the mod's one small script.
[/list]

[b]Works alongside other mods[/b]

Readable Tool Tips runs alongside other tooltip mods (city-yield tooltips, tech/civic tooltips, plot tooltip overhauls such as QD Improved Plot Tooltip, and so on). It adjusts only where each tooltip is placed, inside the game's own placement code, and leaves every tooltip's styling and contents alone. A replacement map-tile tooltip from another mod keeps its look and gets the same wider gap, whichever mod loads first.

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
