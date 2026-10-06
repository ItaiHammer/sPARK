export const CARD_ENTRANCE_MS = 1200;
export const CARD_VALUES_MS = CARD_ENTRANCE_MS;

export const cardEntranceDelay = (order) => Math.min(Math.max(order, 0), 3) * 240;

export const formatEntranceNumber = (value, fractionDigits = 0) =>
  value.toLocaleString("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });

// Each card's entrance, bar, and readings run together on its own timeline.
// Text updates stay outside React; the accessible, final readings never change.
export function animateGarageValues(card, { enabled, delay = 0, onComplete }) {
  const numbers = [...card.querySelectorAll("[data-entrance-value]")].flatMap((element) => {
    const raw = element.dataset.entranceValue;
    const value = raw?.trim() ? Number(raw) : NaN;
    if (!Number.isFinite(value) || value < 0) return [];
    return [{ element, value, fractionDigits: Number(element.dataset.fractionDigits) || 0 }];
  });
  const bar = card.querySelector("[data-entrance-bar]");
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame;
  const paint = (progress) => {
    for (const { element, value, fractionDigits } of numbers) {
      const current = fractionDigits ? value * progress : Math.round(value * progress);
      element.textContent = formatEntranceNumber(current, fractionDigits);
    }
    if (bar) bar.style.transform = `scaleX(${progress})`;
  };
  const finish = () => {
    cancelAnimationFrame(frame);
    paint(1);
    media.removeEventListener("change", preferenceChanged);
    onComplete?.();
  };
  const preferenceChanged = () => { if (media.matches) finish(); };

  if (!enabled || media.matches) {
    paint(1);
    onComplete?.();
    return () => {};
  }

  paint(0);
  const entrance = card.getAnimations?.().find((animation) =>
    typeof animation.effect?.getComputedTiming().activeDuration === "number");
  const timing = entrance?.effect.getComputedTiming();
  const start = performance.now() + delay;
  const tick = (now) => {
    // Reading the CSS clock keeps values aligned even if setup runs late.
    const elapsed = entrance ? (entrance.currentTime ?? 0) - timing.delay : now - start;
    const progress = Math.max(0, Math.min(1, elapsed / (timing?.activeDuration || CARD_VALUES_MS)));
    if (progress === 1) { finish(); return; }
    paint(1 - (1 - progress) ** 3);
    frame = requestAnimationFrame(tick);
  };
  media.addEventListener("change", preferenceChanged);
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    media.removeEventListener("change", preferenceChanged);
    paint(1);
  };
}
