# Backlog

Open items not yet addressed. Findings from the 2026-07-10 corpus bug-hunt audit unless
noted. The mod audited healthy/clean — idempotent style injection, null-guarded, only
Gameface-supported CSS. One watch item.

## [Low · Plausible — watch item] Flip-class mirror rules assume the class is on the tooltip element

**Sites:** [ui/readable-tooltips.js:89](../ui/readable-tooltips.js)
(`SLOT = "#tooltips > div > *"`) and the `.right`/`.above` mirror rules (`:101-109`)
**Symptom:** the mirror rules assume the flip classes (`.right`/`.above`) live on the
tooltip element (the child `*`), not on the wrapper `div`. If in 1.4.x the tooltip manager
puts them on the wrapper (`#tooltips > div.right`), the mirrored rules never match.
**Failure scenario:** in flipped screen corners the base `translate(+offset,+offset)`
pushes the tooltip back toward/under the cursor — the exact problem the mod exists to fix,
but only in corners. Not a proven defect: `core/ui/tooltips/tooltip-manager.js` is packed
inside `Assets.car`/`.dep`, so it couldn't be confirmed against source. The author's header
comment asserts the classes are on the tooltip element.
**Fix:** verify class placement against the packed source (or via in-game DOM inspection);
if the classes are on the wrapper, retarget the mirror rules to `#tooltips > div.right`
etc.

**IMPLEMENTED (robust-to-both, no verification needed).** Rather than probe the live DOM to
learn which element carries `.right`/`.above`, added **wrapper-scoped variants**
(`#tooltips > div.right > *`, `.above`, `.right.above`) alongside the existing child-scoped
rules. They carry higher specificity, so whichever placement the manager actually uses wins;
if the class is on the child (the assumed common case), the new rules simply don't match.
Purely additive — corner tooltips keep pushing away from the cursor across manager changes,
with no risk to the current behavior. (Original verification-gated design retained below.)

**Design (verification-gated — cannot fix blind):** the tooltip manager JS lives inside
`Assets.car`/`.dep` and is not on disk, so this must start with a **DOM probe**, not a code
change:
1. In-game, hover a tooltip in a screen corner (to force a flip) and inspect the live
   `#tooltips` subtree — determine whether `.right`/`.above` sit on the wrapper `div`
   (`#tooltips > div.right`) or on the child tooltip element (`#tooltips > div > *.right`,
   which the current rules assume, `readable-tooltips.js:101-109`).
2. If on the **child** (current assumption holds) → no change; close as verified-correct.
3. If on the **wrapper** → make the mirror rules robust to both by adding wrapper-scoped
   variants, e.g. `#tooltips > div.right > *` alongside the existing `#tooltips > div > *.right`
   (belt-and-suspenders so a future manager change can't silently regress corners). Keep the
   base `SLOT` offset rule unchanged.
**Verify:** after the change, tooltips in all four screen corners point away from the cursor
(no under-cursor overlap).
