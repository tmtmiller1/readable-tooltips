import test from "node:test";
import assert from "node:assert/strict";

// The module patches TooltipController on import via a dynamic import of an
// engine path that doesn't exist under Node; that attempt is fully guarded, so
// importing here is safe and just exercises the guard. We test the pure
// offset-tier logic, which is what determines the in-game behavior.
const mod = await import("../ui/readable-tooltips.js");

test("world/decision tooltips get the full offset", () => {
  // No context, or a context not inside the HUD dock -> full world offset.
  assert.equal(mod.offsetForContext(null), mod.WORLD_OFFSET_PX);
  assert.equal(mod.offsetForContext({ closest: () => null }), mod.WORLD_OFFSET_PX);
});

test("persistent HUD (sub-system-dock) tooltips get the gentler offset", () => {
  const hudContext = {
    closest: (selector) => (selector.includes("sub-system-dock") ? {} : null)
  };
  assert.equal(mod.offsetForContext(hudContext), mod.HUD_OFFSET_PX);
});

test("HUD tier is smaller than the world tier", () => {
  assert.ok(mod.HUD_OFFSET_PX < mod.WORLD_OFFSET_PX);
});

test("a broken context never throws — falls back to the world offset", () => {
  const throwingContext = {
    closest() {
      throw new Error("DOM gone");
    }
  };
  assert.equal(mod.offsetForContext(throwingContext), mod.WORLD_OFFSET_PX);
});
