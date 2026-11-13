import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// The module patches the game's tooltip code on import. tests/loader.mjs points
// those engine imports at the stubs in tests/stubs/, so the patches land there
// quietly; wrappers.test.mjs tests the wrappers themselves. This file tests the
// pure offset logic, which is what determines the in-game behavior.
register("./loader.mjs", import.meta.url);
const mod = await import("../ui/readable-tooltips.js");

const keep = await import("../ui/rt-keep-clear.js");

test("pointer scale follows the game's own pointer sizing", () => {
  assert.equal(keep.cursorScale({ autoScale: true, currentBasis: 1.5, globalScale: 100 }), 1.5);
  assert.equal(keep.cursorScale({ autoScale: false, currentBasis: 1.5, globalScale: 125 }), 1.25);
  // Under 100% the gap stays at the 1080p size, never closer.
  assert.equal(keep.cursorScale({ autoScale: false, currentBasis: 0, globalScale: 90 }), 1);
  // Not set up yet, missing, or broken: scale 1.
  assert.equal(keep.cursorScale({ autoScale: true, currentBasis: 0 }), 1);
  assert.equal(keep.cursorScale(null), 1);
  assert.equal(keep.cursorScale({ get autoScale() { throw new Error("gone"); } }), 1);
});

test("the extra push grows with the screen and never goes negative", () => {
  // 1080p: the gap the mod has always used.
  assert.equal(mod.extraOver(mod.CONTROLLER_GAP_PX, 24, 1), 12);
  // A 2880x1800 or 3024x1890 screen draws the pointer at 48px: the tooltip goes 54px out.
  assert.equal(mod.extraOver(mod.CONTROLLER_GAP_PX, 24, 1.5), 30);
  // 4K, pointer 64px.
  assert.equal(mod.extraOver(mod.CONTROLLER_GAP_PX, 24, 2), 48);
});

test("a tooltip clear of the pointer isn't moved", () => {
  const box = keep.pointerBox(100, 100, 1);
  assert.deepEqual(keep.clearShift({ left: 140, top: 140, right: 300, bottom: 180 }, box, { width: 1920, height: 1080 }),
    { x: 0, y: 0 });
  // Above-left of the pointer's tip: clear, since the pointer reaches down and right.
  assert.deepEqual(keep.clearShift({ left: 0, top: 0, right: 99, bottom: 99 }, box, { width: 1920, height: 1080 }),
    { x: 0, y: 0 });
});

test("a tooltip under the pointer moves the shortest way clear", () => {
  const box = keep.pointerBox(100, 100, 1); // reaches to 136, 136
  // Starts 10px below the tip: 26px down clears it, shorter than any sideways move.
  assert.deepEqual(keep.clearShift({ left: 60, top: 110, right: 360, bottom: 150 }, box, { width: 1920, height: 1080 }),
    { x: 0, y: 26 });
  // Same tooltip at the bottom of the screen: down doesn't fit, so it goes above the tip.
  assert.deepEqual(keep.clearShift({ left: 60, top: 110, right: 360, bottom: 150 }, box, { width: 1920, height: 160 }),
    { x: 0, y: -50 });
});

test("a tooltip that can't fit anywhere clear is left where the game put it", () => {
  const box = keep.pointerBox(50, 50, 1);
  assert.deepEqual(keep.clearShift({ left: 0, top: 0, right: 200, bottom: 200 }, box, { width: 200, height: 200 }),
    { x: 0, y: 0 });
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

test("map tooltip gets the scaled gap", () => {
  assert.equal(mod.plotTooltipOffset(undefined, 1), 34);
  assert.equal(mod.plotTooltipOffset(22, 1), 34);
  assert.equal(mod.plotTooltipOffset(22, 1.5), 51);
});

test("layered plot-tooltip overrides never stack the offset", () => {
  // Ours wrapping a mod that wraps ours: the inner call receives our 34.
  assert.equal(mod.plotTooltipOffset(mod.plotTooltipOffset(undefined, 1), 1), 34);
});

test("a larger plot-tooltip gap asked for by another mod is kept", () => {
  assert.equal(mod.plotTooltipOffset(50, 1), 50);
});
