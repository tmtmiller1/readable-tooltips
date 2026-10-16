// Node ESM loader for the test harness. Maps the engine `/core/*` modules the mod imports by absolute
// path onto small recording stubs in tests/stubs/, so the mod can be imported without a live Civ runtime.
// Test files register it with `module.register()` before importing the mod (the `--loader` flag prints an
// ExperimentalWarning on Node 22).
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const stubsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "stubs");

// Engine path -> stub file. Each path resolves to one shared instance, so a test sees exactly what the
// mod patched.
const STUBBED_CORE = new Map([
  ["/core/ui/tooltips/tooltip-controller.js", "tooltip-controller-stub.mjs"],
  ["/core/ui/tooltips/tooltip-manager.js", "tooltip-manager-stub.mjs"],
  ["/core/ui/input/cursor.js", "cursor-stub.mjs"],
  ["/core/ui-next/services/input.js", "input-stub.mjs"],
  ["/core/ui-next/services/component-registry.js", "component-registry-stub.mjs"],
  ["/core/vendor/solid-js/dist/solid.js", "solid-stub.mjs"]
]);

/**
 * @param {string} specifier
 * @param {*} context
 * @param {*} defaultResolve
 */
export async function resolve(specifier, context, defaultResolve) {
  const stub = STUBBED_CORE.get(specifier);
  if (stub) {
    return { url: pathToFileURL(path.join(stubsDir, stub)).href, shortCircuit: true };
  }
  return defaultResolve(specifier, context, defaultResolve);
}
