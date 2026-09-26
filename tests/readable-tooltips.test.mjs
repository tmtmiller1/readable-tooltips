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

test("placement signs follow where the tooltip actually landed", () => {
  const size = { width: 110, height: 40 };
  // Down-right of the anchor: push down-right.
  assert.deepEqual(mod.signsForPlacement({ x: 124, y: 224 }, size, 100, 200), { x: 1, y: 1 });
  // Wholly left of the anchor: push left, keep pushing down.
  assert.deepEqual(mod.signsForPlacement({ x: -10, y: 224 }, size, 100, 200), { x: -1, y: 1 });
  // Wholly above: push up.
  assert.deepEqual(mod.signsForPlacement({ x: 124, y: 160 }, size, 100, 200), { x: 1, y: -1 });
  // Pinned by the bottom-edge clamp so it straddles the anchor: not a flip.
  assert.deepEqual(mod.signsForPlacement({ x: 124, y: 188 }, size, 100, 200), { x: 1, y: 1 });
  // Nothing captured: default down-right.
  assert.deepEqual(mod.signsForPlacement(null, size, 100, 200), { x: 1, y: 1 });
});

// A fake placement that flips like the game: left of the cursor past `edgeX`,
// above it past `edgeY`. Records the anchor each placement saw.
function fakePlacer(edgeX, edgeY) {
  const obj = { x: 0, y: 0, flipX: false, flipY: false, seen: [] };
  const place = () => {
    obj.seen.push([obj.x, obj.y]);
    obj.flipX = obj.x > edgeX;
    obj.flipY = obj.y > edgeY;
    return "placed";
  };
  const signs = () => ({ x: obj.flipX ? -1 : 1, y: obj.flipY ? -1 : 1 });
  return { obj, place, signs };
}

test("unflipped tooltip is pushed down-right once and the anchor restored", () => {
  const { obj, place, signs } = fakePlacer(1000, 1000);
  obj.x = 100; obj.y = 200;
  assert.equal(mod.placePushed(obj, ["x", "y"], 12, place, signs), "placed");
  assert.deepEqual(obj.seen, [[112, 212]]);
  assert.deepEqual([obj.x, obj.y], [100, 200]);
});

test("tooltip flipped left/up is re-placed pushing left/up", () => {
  const { obj, place, signs } = fakePlacer(500, 500);
  obj.x = 900; obj.y = 900;
  mod.placePushed(obj, ["x", "y"], 12, place, signs);
  assert.deepEqual(obj.seen, [[912, 912], [888, 888]]);
  assert.deepEqual([obj.x, obj.y], [900, 900]);
});

test("only the flipped axis is pushed back", () => {
  const { obj, place, signs } = fakePlacer(500, 5000);
  obj.x = 900; obj.y = 100;
  mod.placePushed(obj, ["x", "y"], 12, place, signs);
  assert.deepEqual(obj.seen, [[912, 112], [888, 112]]);
});

test("if pushing back un-flips the tooltip, the down-right placement is kept", () => {
  // Anchor sits just under the flip threshold: +12 flips, -12 does not.
  const { obj, place, signs } = fakePlacer(905, 5000);
  obj.x = 900; obj.y = 100;
  mod.placePushed(obj, ["x", "y"], 12, place, signs);
  assert.deepEqual(obj.seen, [[912, 112], [888, 112], [912, 112]]);
  assert.equal(obj.flipX, true);
  assert.deepEqual([obj.x, obj.y], [900, 100]);
});

test("anchor is restored even when the placement throws", () => {
  const obj = { x: 5, y: 6 };
  assert.throws(() => mod.placePushed(obj, ["x", "y"], 12, () => { throw new Error("boom"); }, () => ({ x: 1, y: 1 })));
  assert.deepEqual([obj.x, obj.y], [5, 6]);
});

test("map tooltip gets the base game gap plus the world offset", () => {
  assert.equal(mod.plotTooltipOffset(undefined), 34);
  assert.equal(mod.plotTooltipOffset(22), 34);
});

test("layered plot-tooltip overrides never stack the offset", () => {
  // Ours wrapping a mod that wraps ours: the inner call receives our 34.
  assert.equal(mod.plotTooltipOffset(mod.plotTooltipOffset(undefined)), 34);
});

test("a larger plot-tooltip gap asked for by another mod is kept", () => {
  assert.equal(mod.plotTooltipOffset(50), 50);
});
