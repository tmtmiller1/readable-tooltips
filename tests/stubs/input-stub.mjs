// Test double for `/core/ui-next/services/input.js`, wired in by tests/loader.mjs. A test sets
// `__input.controllerActive` to stand in for a gamepad driving the UI.
export const __input = { controllerActive: false };

export function IsControllerActive() {
  return __input.controllerActive;
}
