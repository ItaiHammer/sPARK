import test from "node:test";
import assert from "node:assert/strict";
import { animateGarageValues, cardEntranceDelay, CARD_ENTRANCE_MS, CARD_VALUES_MS } from "./garageEntrance.js";

function harness(t, { reduced = false, values = [74, 1317], decimals = [] } = {}) {
  let id = 0;
  const frames = new Map();
  const listeners = new Set();
  const media = {
    matches: reduced,
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
  };
  for (const [name, value] of Object.entries({
    window: { matchMedia: () => media, innerHeight: 800, innerWidth: 1200 },
    requestAnimationFrame: (callback) => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: (frame) => frames.delete(frame),
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    t.after(() => original ? Object.defineProperty(globalThis, name, original) : delete globalThis[name]);
  }
  t.mock.method(performance, "now", () => 0);
  const numbers = values.map((value, index) => ({
    dataset: { entranceValue: String(value), fractionDigits: String(decimals[index] || 0) },
    textContent: value === null ? "Not available" : String(value),
  }));
  const bar = { style: {} };
  const card = { querySelectorAll: () => numbers, querySelector: () => bar };
  let completed = 0;
  const start = (options = {}) => animateGarageValues(card, { enabled: true, onComplete: () => completed++, ...options });
  return {
    numbers, bar, card, frames, listeners, start,
    completed: () => completed,
    tick: (now) => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(now)); },
    reduce: () => { media.matches = true; [...listeners].forEach((listener) => listener()); },
  };
}

test("bar and counts animate during the card's entrance and finish at exact readings", (t) => {
  const h = harness(t);
  const delay = cardEntranceDelay(2);
  const start = delay;
  h.start({ delay });
  assert.deepEqual(h.numbers.map((number) => number.textContent), ["0", "0"]);
  assert.equal(h.bar.style.transform, "scaleX(0)");
  h.tick(start - 1);
  assert.equal(h.bar.style.transform, "scaleX(0)");
  h.tick(start + CARD_VALUES_MS / 2);
  assert.equal(h.bar.style.transform, "scaleX(0.875)");
  assert.deepEqual(h.numbers.map((number) => number.textContent), ["65", "1,152"]);
  h.tick(start + CARD_VALUES_MS);
  assert.deepEqual(h.numbers.map((number) => number.textContent), ["74", "1,317"]);
  assert.equal(h.bar.style.transform, "scaleX(1)");
  assert.equal(h.completed(), 1);
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
});

test("missing readings stay unknown, while real zero and decimal readings remain valid", (t) => {
  const h = harness(t, { values: [null, "", "unknown", -1, Infinity, 0, 0.27], decimals: [0, 0, 0, 0, 0, 0, 2] });
  const original = h.numbers.slice(0, 5).map((number) => number.textContent);
  h.start();
  assert.deepEqual(h.numbers.slice(0, 5).map((number) => number.textContent), original);
  assert.equal(h.numbers[5].textContent, "0");
  assert.equal(h.numbers[6].textContent, "0.00");
  h.tick(CARD_VALUES_MS);
  assert.deepEqual(h.numbers.slice(0, 5).map((number) => number.textContent), original);
  assert.equal(h.numbers[6].textContent, "0.27");
});

for (const options of [{ reduced: true }, { enabled: false }]) {
  test(`shows final readings immediately with ${JSON.stringify(options)}`, (t) => {
    const h = harness(t, options);
    h.start(options);
    assert.deepEqual(h.numbers.map((number) => number.textContent), ["74", "1,317"]);
    assert.equal(h.bar.style.transform, "scaleX(1)");
    assert.equal(h.frames.size, 0);
    assert.equal(h.listeners.size, 0);
  });
}

test("changing to reduced motion settles an in-progress animation immediately", (t) => {
  const h = harness(t);
  h.start();
  h.tick(100);
  h.reduce();
  assert.deepEqual(h.numbers.map((number) => number.textContent), ["74", "1,317"]);
  assert.equal(h.bar.style.transform, "scaleX(1)");
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
});

test("cleanup cancels work, restores readings, and permits Strict Mode's second setup", (t) => {
  const h = harness(t);
  const stop = h.start();
  h.tick(100);
  stop();
  assert.deepEqual(h.numbers.map((number) => number.textContent), ["74", "1,317"]);
  assert.equal(h.completed(), 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
  h.start();
  assert.equal(h.bar.style.transform, "scaleX(0)");
  h.tick(5000); // Resuming a hidden tab must settle, not replay old frames.
  assert.equal(h.bar.style.transform, "scaleX(1)");
  assert.equal(h.completed(), 1);
});

test("stagger stays bounded for long garage lists", () => {
  assert.equal(cardEntranceDelay(-1), 0);
  assert.equal(cardEntranceDelay(1), 240);
  assert.equal(cardEntranceDelay(100), 720);
});

test("each sibling fills during its own staggered entrance without waiting for other cards", (t) => {
  const h = harness(t);
  h.card.parentElement = {};
  const secondNumber = { dataset: { entranceValue: "100" }, textContent: "100" };
  const secondBar = { style: {} };
  const second = { ...h.card, querySelectorAll: () => [secondNumber], querySelector: () => secondBar };
  h.start();
  animateGarageValues(second, { enabled: true, delay: cardEntranceDelay(1) });
  assert.equal(h.frames.size, 2);
  h.tick(cardEntranceDelay(1));
  assert.notEqual(h.bar.style.transform, "scaleX(0)");
  assert.equal(secondNumber.textContent, "0");
  const start = cardEntranceDelay(1);
  h.tick(start + CARD_VALUES_MS / 2);
  assert.equal(secondBar.style.transform, "scaleX(0.875)");
  assert.notEqual(secondBar.style.transform, h.bar.style.transform);
  assert.equal(secondNumber.textContent, "88");
  h.tick(CARD_ENTRANCE_MS);
  assert.equal(h.bar.style.transform, "scaleX(1)");
  assert.notEqual(secondBar.style.transform, "scaleX(1)");
  h.tick(start + CARD_VALUES_MS);
  assert.equal(secondNumber.textContent, "100");
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
});

test("uses the card's actual CSS clock for simultaneous entrance and values", (t) => {
  const h = harness(t);
  const animation = { currentTime: null, effect: { getComputedTiming: () => ({ delay: 240, activeDuration: CARD_ENTRANCE_MS }) } };
  h.card.getAnimations = () => [animation];
  h.start();
  h.tick(5000);
  assert.equal(h.bar.style.transform, "scaleX(0)");
  animation.currentTime = 240 + CARD_ENTRANCE_MS / 2;
  h.tick(5010);
  assert.equal(h.bar.style.transform, "scaleX(0.875)");
  animation.currentTime = 240 + CARD_ENTRANCE_MS;
  h.tick(5020);
  assert.equal(h.bar.style.transform, "scaleX(1)");
  assert.equal(h.frames.size, 0);
});
