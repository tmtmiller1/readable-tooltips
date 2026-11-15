/**
 * Keeps every drawn tooltip out from under the mouse pointer.
 *
 * Tooltips pinned to their element (leader and civ cards, unit actions, the ui-next tooltips on the setup screens)
 * are placed by the element, not the pointer, so the gap patches in readable-tooltips.js can't reach them. After
 * the game places any tooltip, this checks it against the pointer's box and, if they overlap, nudges the tooltip
 * the shortest way clear that stays on-screen. The nudge is a margin, so the game's own left/top and scale stay
 * untouched and the next placement starts from the game's position.
 */
/* global GlobalScaling */

// Distance from the pointer's tip a tooltip keeps clear of, at UI scale 1, scaled with the pointer. The game's
// pointer is 32px at scale 1 (BASE_CURSOR_SIZE in global-scaling.js); 36 leaves a little air past it.
const CLEAR_BOX_PX = 36;
// Never below the gap the mod has always used, so a UI scale under 100% doesn't bring tooltips closer.
const MIN_SCALE = 1;
const MAX_SCALE = 4;
// Where each tooltip system draws, and which element in it carries the position: the controller's root itself, the
// manager's fxs-tooltip children, and ui-next's content roots (each sits inside an unsized portal wrapper).
const HOSTS = [
  { id: "tooltip-root", pick: (host) => [host] },
  { id: "tooltips", pick: (host) => Array.from(host.children) },
  { id: "uinext-tooltips", pick: (host) => Array.from(host.querySelectorAll(".tooltip-content-root")) }
];
// Frames to wait after a nudge before measuring that tooltip again: the UI lays out once a frame, so a
// measurement in the same frame still shows the old spot.
const SETTLE_FRAMES = 2;
const STARTED = "__readableTooltipsKeepClear";

// macOS draws the game's pointer in points, so on a Retina screen it comes out twice as big in the page's pixels
// (a 90% UI scale asks for 29 and the hand pointer measured about 50x60 on a 3024px-wide screen). The page can't
// read the screen's backing scale; a Mac page at least this wide is on a Retina-class screen. A plain 1440p monitor
// on a Mac counts too and gets a wider gap than it needs, which still keeps the tooltip clear.
const RETINA_PAGE_WIDTH = 2400;
let macCursor = null;

function isMacCursor(ui) {
  if (!ui) {
    return false;
  }
  if (macCursor === null && typeof ui.getCursorURL === "function") {
    const url = String(ui.getCursorURL() || "");
    if (url) {
      macCursor = url.includes("/macos/");
    }
  }
  return macCursor === true;
}

/**
 * How many page pixels one of the pointer's own pixels covers: 2 on a Retina Mac, else 1.
 * @param {*} [ui] the game's UI object
 * @param {number} [width] the page's width in px
 * @returns {number}
 */
function displayFactor(ui = typeof UI === "undefined" ? null : UI,
  width = typeof window === "undefined" ? 0 : window.innerWidth) {
  try {
    return isMacCursor(ui) && width >= RETINA_PAGE_WIDTH ? 2 : 1;
  } catch (_e) {
    return 1;
  }
}

// The UI scale the game sizes its pointer with: the resolution basis when the game scales the UI itself, else the
// player's UI scale setting. 1 when the game's scaling object isn't there.
function uiScale(gs) {
  try {
    const s = gs ? (gs.autoScale ? gs.currentBasis : gs.globalScale / 100) : NaN;
    if (Number.isFinite(s) && s > 0) {
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
    }
  } catch (_e) {
    // fall through
  }
  return 1;
}

/**
 * How big the game's pointer is against its size at 1080p, in the page's pixels: the UI scale times the display
 * factor.
 * @param {*} [gs] the game's GlobalScaling (a page global)
 * @param {number} [display] from displayFactor()
 * @returns {number}
 */
function cursorScale(gs = typeof GlobalScaling === "undefined" ? null : GlobalScaling, display = displayFactor()) {
  return uiScale(gs) * display;
}

/** A 1x gap in screen px at `scale`. */
function scaledGap(gapAt1x, scale = cursorScale()) {
  return Math.round(gapAt1x * scale);
}

/** The pointer's box: from its tip, down and to the right. */
function pointerBox(x, y, scale) {
  const reach = scaledGap(CLEAR_BOX_PX, scale);
  return { left: x, top: y, right: x + reach, bottom: y + reach };
}

function overlaps(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function onScreen(r, screen) {
  return r.left >= 0 && r.top >= 0 && r.right <= screen.width && r.bottom <= screen.height;
}

function moved(r, dx, dy) {
  return { left: r.left + dx, right: r.right + dx, top: r.top + dy, bottom: r.bottom + dy };
}

/**
 * The shortest move that takes `rect` off the pointer's box and keeps it on-screen: down, right, up or left.
 * No move when they don't overlap, or when nothing fits.
 * @returns {{x: number, y: number}}
 */
function clearShift(rect, box, screen) {
  if (!overlaps(rect, box)) {
    return { x: 0, y: 0 };
  }
  const options = [
    { x: 0, y: box.bottom - rect.top },
    { x: box.right - rect.left, y: 0 },
    { x: 0, y: box.top - rect.bottom },
    { x: box.left - rect.right, y: 0 }
  ].filter((o) => onScreen(moved(rect, o.x, o.y), screen));
  if (!options.length) {
    return { x: 0, y: 0 };
  }
  options.sort((a, b) => Math.abs(a.x) + Math.abs(a.y) - (Math.abs(b.x) + Math.abs(b.y)));
  return options[0];
}

// Tooltip elements in the page right now, drawn or not.
function drawnTooltips() {
  const out = [];
  for (const { id, pick } of HOSTS) {
    const host = document.getElementById(id);
    if (host) {
      out.push(...pick(host));
    }
  }
  return out;
}

function isDrawn(el) {
  const r = el.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) {
    return false;
  }
  const cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
  return !cs || (cs.visibility !== "hidden" && cs.display !== "none");
}

function setNudge(el, shift, state) {
  const prev = state.nudges.get(el) ?? { x: 0, y: 0 };
  if (prev.x === shift.x && prev.y === shift.y) {
    return;
  }
  el.style.marginLeft = shift.x ? `${shift.x}px` : "";
  el.style.marginTop = shift.y ? `${shift.y}px` : "";
  state.nudges.set(el, { x: shift.x, y: shift.y, settleAt: state.frame + SETTLE_FRAMES });
}

/**
 * A tooltip the player has locked (K on the map, or a touch). The game makes a locked ui-next tooltip take the
 * mouse (tooltip.js sets pointer-events-auto on it) so the player can move onto it and hover what's inside, which
 * is how other mods put extra panels on the plot tooltip. Nudging it away from the pointer would make it run from
 * the mouse.
 * @param {Element} el
 * @returns {boolean}
 */
function isLocked(el) {
  try {
    return Boolean(el.classList?.contains("pointer-events-auto"));
  } catch (_e) {
    return false;
  }
}

// One tooltip: measure where the game put it (its box less our nudge) and set the nudge it needs now. With no
// pointer box (gamepad, or no mouse move yet) any nudge is taken off. A locked tooltip keeps the nudge it had, so
// it stays put under the pointer instead of jumping when the lock lands.
function checkTooltip(el, state, box, screen) {
  if (isLocked(el)) {
    return;
  }
  const prev = state.nudges.get(el);
  if (prev && prev.settleAt > state.frame) {
    state.pending = true;
    return;
  }
  if (!box || !isDrawn(el)) {
    setNudge(el, { x: 0, y: 0 }, state);
    return;
  }
  const r = el.getBoundingClientRect();
  const base = moved({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }, -(prev?.x ?? 0), -(prev?.y ?? 0));
  setNudge(el, clearShift(base, box, screen), state);
}

function runCheck(state) {
  state.scheduled = false;
  state.pending = false;
  state.frame++;
  const active = state.pointer && !state.isControllerActive();
  const box = active ? pointerBox(state.pointer.x, state.pointer.y, cursorScale()) : null;
  const screen = { width: window.innerWidth, height: window.innerHeight };
  for (const el of drawnTooltips()) {
    checkTooltip(el, state, box, screen);
  }
  if (state.pending) {
    schedule(state);
  }
}

function schedule(state) {
  if (!state.scheduled) {
    state.scheduled = true;
    requestAnimationFrame(() => runCheck(state));
  }
}

// Gamepad: tooltips follow focus, there's no pointer to keep clear of.
async function loadIsControllerActive() {
  try {
    const input = await import("/core/ui-next/services/input.js");
    if (typeof input?.IsControllerActive === "function") {
      return () => {
        try {
          return input.IsControllerActive();
        } catch (_e) {
          return false;
        }
      };
    }
  } catch (_e) {
    // no ui-next input service: assume a mouse
  }
  return () => false;
}

// Watch the hosts for tooltips appearing or moving; hosts that aren't in the page yet are picked up later.
function observeHosts(state) {
  const observer = new MutationObserver(() => schedule(state));
  const watched = new Set();
  const attach = () => {
    for (const { id } of HOSTS) {
      const host = document.getElementById(id);
      if (host && !watched.has(host)) {
        watched.add(host);
        observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
      }
    }
    return watched.size === HOSTS.length;
  };
  if (!attach()) {
    const retry = setInterval(() => attach() && clearInterval(retry), 1000);
  }
}

/** Starts the check once per page. Never throws. */
async function startKeepClear() {
  try {
    if (typeof document === "undefined" || globalThis[STARTED]) {
      return;
    }
    globalThis[STARTED] = true;
    const state = { pointer: null, nudges: new WeakMap(), frame: 0, scheduled: false, pending: false,
      isControllerActive: await loadIsControllerActive() };
    document.addEventListener("mousemove", (e) => {
      state.pointer = { x: e.clientX, y: e.clientY };
      schedule(state);
    }, { capture: true, passive: true });
    observeHosts(state);
  } catch (e) {
    console.error("[ReadableTooltips] keep-clear failed to start:", e);
  }
}

export { cursorScale, displayFactor, scaledGap, pointerBox, clearShift, isLocked, startKeepClear, CLEAR_BOX_PX };
