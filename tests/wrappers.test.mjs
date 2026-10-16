import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// The three wrappers against the engine stubs in tests/stubs/ (mapped by tests/loader.mjs). The mod
// patches on import, so the stubs are loaded first to keep their unpatched methods for comparison.
register("./loader.mjs", import.meta.url);

// A browser global, faked before the mod loads so it rebinds the manager's observer.
class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.observed = [];
  }
  observe(el) {
    this.observed.push(el);
  }
  disconnect() {}
}
globalThis.ResizeObserver = FakeResizeObserver;

const controllerStub = await import("./stubs/tooltip-controller-stub.mjs");
const managerStub = await import("./stubs/tooltip-manager-stub.mjs");
const inputStub = await import("./stubs/input-stub.mjs");
const registryStub = await import("./stubs/component-registry-stub.mjs");

const StubController = controllerStub.TooltipController;
const originalReposition = StubController.prototype.reposition;
const stubManager = managerStub.default;
const managerProto = Object.getPrototypeOf(stubManager);
const originalUpdate = managerProto.updateTooltipPosition;
const gameObserver = stubManager.tooltipResizeObserver;
const plotEntry = registryStub.ComponentRegistry.get("PlotTooltip");

const mod = await import("../ui/readable-tooltips.js");

// The mod starts its three patches on import without awaiting them; wait for all three to land.
for (let i = 0; i < 200; i++) {
  if (StubController.prototype.reposition !== originalReposition
    && managerProto.updateTooltipPosition !== originalUpdate
    && plotEntry.factory() !== registryStub.BasePlotTooltip) {
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 5));
}

const plotRegistrations = () => registryStub.__registrations.filter((r) => r.name === "PlotTooltip").length;

test("TooltipController: applying the patch twice wraps reposition once", async () => {
  const proto = StubController.prototype;
  const wrapped = proto.reposition;
  assert.notEqual(wrapped, originalReposition);
  await mod.patchTooltipController();
  assert.equal(proto.reposition, wrapped);

  const c = new StubController();
  c.tooltipX = 100;
  c.tooltipY = 200;
  c.reposition();
  // one 12px push, not two
  assert.deepEqual(c.seen, [[112, 212]]);
  // anchor and clamp put back as they were
  assert.deepEqual([c.tooltipX, c.tooltipY], [100, 200]);
  assert.equal(Object.hasOwn(c, "constrainTipToRect"), false);
});

test("TooltipController: a tooltip the clamp put left of the cursor is pushed further left", () => {
  const c = new StubController();
  c.tooltipX = 100;
  c.tooltipY = 200;
  c.place = (x, y) => ({ x: x - 24 - 110, y: y + 24 });
  c.reposition();
  assert.deepEqual(c.seen, [[112, 212], [88, 212]]);
});

test("TooltipController: a fixed-position tooltip goes straight to the game's reposition", () => {
  const c = new StubController();
  c.tooltipX = 100;
  c.tooltipY = 200;
  c.fixedPosition = true;
  let clampShadowed = null;
  c.place = (x, y) => {
    clampShadowed = Object.hasOwn(c, "constrainTipToRect");
    return { x, y };
  };
  c.reposition();
  assert.deepEqual(c.seen, [[100, 200]]);
  assert.equal(clampShadowed, false);
});

test("TooltipController: without reposition the patch logs once and leaves the class alone", async (t) => {
  const error = t.mock.method(console, "error", () => {});
  class NoReposition {}
  controllerStub.__setTooltipController(NoReposition);
  try {
    await mod.patchTooltipController();
  } finally {
    controllerStub.__setTooltipController(StubController);
  }
  assert.equal(error.mock.callCount(), 1);
  assert.match(error.mock.calls[0].arguments[0], /reposition not found; offset skipped/);
  assert.deepEqual(Object.getOwnPropertyNames(NoReposition.prototype), ["constructor"]);
});

test("TooltipManager: applying the patch twice wraps the method and rebinds the observer once", async () => {
  const wrapped = managerProto.updateTooltipPosition;
  const observer = stubManager.tooltipResizeObserver;
  assert.notEqual(wrapped, originalUpdate);
  assert.equal(gameObserver.disconnected, true);
  assert.ok(observer instanceof FakeResizeObserver);
  assert.deepEqual(observer.observed, [stubManager.tooltip]);

  await mod.patchTooltipManager();
  assert.equal(managerProto.updateTooltipPosition, wrapped);
  assert.equal(stubManager.tooltipResizeObserver, observer);

  // a content resize places through the wrapped method, with one push
  stubManager.seen.length = 0;
  stubManager.x = 100;
  stubManager.y = 200;
  observer.callback();
  assert.deepEqual(stubManager.seen, [[112, 212]]);
  assert.deepEqual([stubManager.x, stubManager.y], [100, 200]);
});

test("TooltipManager: a tooltip flipped with `right` is pushed left", () => {
  stubManager.seen.length = 0;
  stubManager.x = 900;
  stubManager.y = 200;
  stubManager.tooltip.classList.add("right");
  try {
    stubManager.updateTooltipPosition();
  } finally {
    stubManager.tooltip.classList.remove("right");
  }
  assert.deepEqual(stubManager.seen, [[912, 212], [888, 212]]);
});

test("TooltipManager: touch, gamepad and missing-tooltip placements go straight to the game's method", () => {
  const tooltip = stubManager.tooltip;
  stubManager.seen.length = 0;
  stubManager.x = 100;
  stubManager.y = 200;
  try {
    stubManager.touchPosition = { x: 100, y: 200 };
    stubManager.updateTooltipPosition();
    stubManager.touchPosition = null;
    inputStub.__input.controllerActive = true;
    stubManager.updateTooltipPosition();
    inputStub.__input.controllerActive = false;
    stubManager.tooltip = null;
    stubManager.updateTooltipPosition();
  } finally {
    stubManager.touchPosition = null;
    inputStub.__input.controllerActive = false;
    stubManager.tooltip = tooltip;
  }
  assert.deepEqual(stubManager.seen, [[100, 200], [100, 200], [100, 200]]);
});

test("TooltipManager: without updateTooltipPosition the patch logs once and changes nothing", async (t) => {
  const error = t.mock.method(console, "error", () => {});
  const bare = { tooltip: null };
  managerStub.__setManager(bare);
  try {
    await mod.patchTooltipManager();
  } finally {
    managerStub.__setManager(stubManager);
  }
  assert.equal(error.mock.callCount(), 1);
  assert.match(error.mock.calls[0].arguments[0], /updateTooltipPosition not found; offset skipped/);
  assert.deepEqual(Object.keys(bare), ["tooltip"]);
});

test("PlotTooltip: applying the patch twice wraps the game's tooltip once", async () => {
  // the game's registration plus ours
  assert.equal(plotRegistrations(), 2);
  const wrapped = plotEntry.factory();
  assert.notEqual(wrapped, registryStub.BasePlotTooltip);
  assert.equal(plotEntry.overridePriority, 0);

  await mod.patchPlotTooltip();
  assert.equal(plotRegistrations(), 2);
  assert.equal(plotEntry.factory(), wrapped);
  // other props pass through; only the gap changes
  assert.deepEqual(wrapped({ offset: 22, plot: 7 }), { by: "game", props: { offset: 34, plot: 7 } });
});

test("PlotTooltip: a plot-tooltip mod that registers later still wins and gets the wider gap", () => {
  const otherMod = (props) => ({ by: "other mod", props });
  registryStub.ComponentRegistry.register({ name: "PlotTooltip", createInstance: otherMod });
  // the other mod's registration plus our one re-wrap
  assert.equal(plotRegistrations(), 4);
  assert.deepEqual(plotEntry.factory()({ offset: 22 }), { by: "other mod", props: { offset: 34 } });
});

test("PlotTooltip: outside a game the patch registers nothing", async () => {
  const before = plotRegistrations();
  globalThis.UI = { isInGame: () => false };
  try {
    await mod.patchPlotTooltip();
  } finally {
    delete globalThis.UI;
  }
  assert.equal(plotRegistrations(), before);
});

test("PlotTooltip: when the game never registers one, the patch polls, then gives up quietly", async (t) => {
  const error = t.mock.method(console, "error", () => {});
  const get = t.mock.method(registryStub.ComponentRegistry, "get");
  // each wait between looks ends at once; the delay it asked for is kept
  const delays = [];
  t.mock.method(globalThis, "setTimeout", (fn, ms) => {
    delays.push(ms);
    fn();
    return 0;
  });
  const before = plotRegistrations();
  registryStub.__entries.delete("PlotTooltip");
  try {
    await mod.patchPlotTooltip();
  } finally {
    registryStub.__entries.set("PlotTooltip", plotEntry);
  }
  // 120 looks, 500ms apart, as in the mod
  assert.equal(get.mock.callCount(), 120);
  assert.equal(delays.length, 120);
  assert.ok(delays.every((ms) => ms === 500));
  assert.equal(plotRegistrations(), before);
  assert.equal(error.mock.callCount(), 0);
});
