import test from "node:test";
import assert from "node:assert/strict";

test("style injection is idempotent", async () => {
  const byId = new Map();
  const headChildren = [];

  globalThis.document = {
    head: {
      appendChild(node) {
        headChildren.push(node);
        if (node && node.id) byId.set(node.id, node);
      }
    },
    getElementById(id) {
      return byId.get(id) || null;
    },
    createElement(tag) {
      return { tagName: tag, id: "", textContent: "" };
    }
  };

  const mod = await import("../ui/readable-tooltips.js");
  assert.equal(headChildren.length, 1);
  mod.injectReadableTooltipsStyle();
  mod.injectReadableTooltipsStyle();
  assert.equal(headChildren.length, 1);
  assert.ok(byId.has(mod.STYLE_ID));

  delete globalThis.document;
});
