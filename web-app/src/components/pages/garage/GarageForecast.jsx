"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { forecastAt, operatingHours, parkingStatus } from "@/lib/utils/client/parking";
import styles from "./GaragePage.module.css";
import interactionStyles from "./GarageForecastInteraction.module.css";

const WINDOWS = [
  { start: 8, label: "8am–1pm" },
  { start: 14, label: "2pm–7pm" },
  { start: 19, label: "7pm–12am" },
];

function ForecastBar({ occupied, tone }) {
  const bar = useRef(null);
  const previous = useRef({ height: null, scale: 1 });
  const height = Math.max(2, occupied);

  useLayoutEffect(() => {
    const element = bar.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const before = previous.current;
    previous.current = { height, scale: 1 };
    if (motion.matches || !element.animate || before.height === null || before.height === height) return;

    // Preserve the drawn height when an in-progress time-window change is interrupted.
    const animation = element.animate([
      { transform: `scaleY(${before.height * before.scale / height})` },
      { transform: "scaleY(1)" },
    ], { duration: 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    const settle = () => animation.cancel();
    const preferenceChanged = () => { if (motion.matches) settle(); };
    motion.addEventListener("change", preferenceChanged);
    return () => {
      const transform = getComputedStyle(element).transform;
      previous.current = { height, scale: transform === "none" ? 1 : new DOMMatrixReadOnly(transform).m22 };
      animation.cancel();
      motion.removeEventListener("change", preferenceChanged);
    };
  }, [height]);

  return <span ref={bar} className={styles.bar} data-tone={tone} style={{ height: `${height}%` }} />;
}

export default function GarageForecast({ garage, selectedAt, currentAt = selectedAt, rows = [], loading, updating = false, error, onRetry }) {
  const scroller = useRef(null);
  const initialized = useRef(null);
  const scrollIndex = useRef(0);
  const scrollClock = useRef(null);
  const hold = useRef(null);
  const [inspection, setInspection] = useState(null);
  const [startHour, setStartHour] = useState(() => selectedAt.hour < 14 ? 8 : selectedAt.hour < 19 ? 14 : 19);
  const day = selectedAt.startOf("day");
  const dayKey = `${garage.lot_id}:${day.toMillis()}`;
  const pointCount = Math.round(day.plus({ days: 1 }).diff(day, "minutes").minutes / 30) + 1;
  const isToday = selectedAt.hasSame(currentAt, "day");
  const nowIndex = currentAt.diff(day, "minutes").minutes / 30;
  const points = Array.from({ length: pointCount }, (_, index) => {
    const time = day.plus({ minutes: index * 30 });
    const closed = operatingHours(garage, time).closed;
    const occupied = closed ? null : forecastAt(rows, time.toMillis());
    return { time, closed, occupied, tone: parkingStatus(occupied, closed).tone };
  });
  const hasData = points.some((point) => point.occupied !== null);
  const activeInspection = !updating && inspection?.dayKey === dayKey ? inspection : null;
  const activePoint = activeInspection ? points[activeInspection.index] : null;

  useEffect(() => {
    const dismissOutside = (event) => {
      if (scroller.current?.contains(event.target)) return;
      clearTimeout(hold.current?.timer);
      hold.current = null;
      setInspection(null);
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside, true);
      clearTimeout(hold.current?.timer);
      hold.current = null;
    };
  }, []);

  useEffect(() => () => {
    clearTimeout(hold.current?.timer);
    hold.current = null;
  }, [dayKey, hasData, updating]);

  const columnStep = (element) => {
    const track = element.lastElementChild;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    return (track.scrollWidth + gap) / pointCount;
  };

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || !hasData) return;
    if (initialized.current !== dayKey) {
      // Only the first timeline centers Now. Keep the same local time when changing dates.
      const firstVisit = initialized.current === null;
      scrollIndex.current = firstVisit
        ? isToday ? Math.max(0, nowIndex - 5) : day.set({ hour: 8 }).diff(day, "minutes").minutes / 30
        : scrollClock.current === null ? scrollIndex.current : day.set({ hour: Math.floor(scrollClock.current / 60), minute: scrollClock.current % 60 }).diff(day, "minutes").minutes / 30;
      initialized.current = dayKey;
    }
    const resize = () => element.scrollTo({ left: scrollIndex.current * columnStep(element), behavior: "instant" });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
    // The day and available timeline determine initialization, not clock ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, hasData, pointCount]);

  const scrollToIndex = (index) => {
    const element = scroller.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: index * columnStep(element), behavior: reduced ? "instant" : "smooth" });
  };
  const inspectIndex = (index, source) => {
    const element = scroller.current;
    const boundedIndex = Math.max(0, Math.min(pointCount - 1, Math.round(index)));
    const track = element.lastElementChild;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const viewportX = (boundedIndex + .5) * columnStep(element) - gap / 2 - element.scrollLeft;
    // Keep the readout inside the visible timeline, including the first and last bars.
    const tooltipShift = Math.min(Math.max(viewportX, 60), element.clientWidth - 60) - viewportX;
    return { index: boundedIndex, source, dayKey, tooltipShift };
  };
  const inspectPointer = (event, source) => {
    const element = scroller.current;
    const contentX = event.clientX - element.getBoundingClientRect().left + element.scrollLeft;
    return inspectIndex(contentX / columnStep(element) - .5, source);
  };
  const cancelHold = () => {
    clearTimeout(hold.current?.timer);
    hold.current = null;
  };
  const onPointerDown = (event) => {
    cancelHold();
    if (updating) return;
    if (event.pointerType !== "touch") {
      if (event.button === 0) setInspection(inspectPointer(event, "pointer"));
      return;
    }
    setInspection(null);
    if (!event.isPrimary) return;
    const gesture = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: scroller.current.scrollLeft,
      inspection: inspectPointer(event, "touch"),
      held: false,
    };
    gesture.timer = setTimeout(() => {
      if (hold.current !== gesture || !scroller.current || Math.abs(scroller.current.scrollLeft - gesture.scrollLeft) > 2) return;
      gesture.held = true;
      setInspection(gesture.inspection);
    }, 1000);
    hold.current = gesture;
  };
  const onPointerMove = (event) => {
    if (updating) return;
    if (event.pointerType !== "touch") {
      setInspection(inspectPointer(event, "pointer"));
      return;
    }
    const gesture = hold.current;
    if (gesture?.pointerId !== event.pointerId) return;
    // Never capture the pointer or suppress movement: horizontal and page scrolling stay native.
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) {
      cancelHold();
      setInspection(null);
    }
  };
  const onPointerUp = (event) => {
    if (event.pointerType !== "touch") return;
    const wasHeld = hold.current?.held;
    cancelHold();
    if (!wasHeld) setInspection(null);
  };
  const onScroll = () => {
    const element = scroller.current;
    cancelHold();
    setInspection((previous) => !updating && previous?.source === "keyboard" && previous.dayKey === dayKey ? inspectIndex(previous.index, "keyboard") : null);
    scrollIndex.current = element.scrollLeft / columnStep(element);
    const firstTime = day.plus({ minutes: scrollIndex.current * 30 });
    scrollClock.current = firstTime.hour * 60 + firstTime.minute;
    const hour = day.plus({ minutes: (scrollIndex.current + 5) * 30 }).hour;
    setStartHour(hour < 14 ? 8 : hour < 19 ? 14 : 19);
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      setInspection(null);
      return;
    }
    if (updating) return;
    const offset = { ArrowLeft: -2, ArrowRight: 2 }[event.key];
    if (offset === undefined && !["Home", "End", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const previousIndex = activeInspection?.index ?? Math.round(scrollIndex.current + 5);
    const index = event.key === "Home" ? 0 : event.key === "End" ? pointCount - 1 : previousIndex + (offset ?? 0);
    const nextInspection = inspectIndex(index, "keyboard");
    setInspection(nextInspection);
    if (offset !== undefined || event.key === "Home" || event.key === "End") scrollToIndex(nextInspection.index - 5);
  };

  return (
    <>
      <p className={styles.forecastLive} data-mode={isToday ? "live" : "forecast"}><span aria-hidden="true" /><strong>{isToday ? "Live" : "Forecast"}</strong> · {isToday ? parkingStatus(garage.occupied ?? null, garage.closed).label : selectedAt.toFormat("ccc, LLL d")}</p>
      {hasData ? (
        <div ref={scroller} className={`${styles.chart} ${interactionStyles.chart}`} role="region" tabIndex={0} aria-label="Parking forecast timeline" aria-describedby="garage-forecast-scroll-hint" aria-busy={updating} onScroll={onScroll} onKeyDown={onKeyDown}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          onPointerCancel={() => { cancelHold(); setInspection(null); }}
          onPointerLeave={(event) => { if (event.pointerType !== "touch") setInspection(null); }}
          onContextMenu={(event) => { if (hold.current) event.preventDefault(); }}
          onFocus={(event) => { if (!updating && event.currentTarget.matches(":focus-visible")) setInspection(inspectIndex(scrollIndex.current + 5, "keyboard")); }}
          onBlur={() => setInspection(null)}>
          <span className={styles.srOnly}>{isToday ? `Now: ${currentAt.toFormat("h:mm a")}.` : `Forecast for ${selectedAt.toFormat("cccc, LLLL d")}.`}</span>
          <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{activePoint ? `${activePoint.time.toFormat("h:mm a")}: ${activePoint.closed ? "Closed" : activePoint.occupied === null ? "Estimate unavailable" : `${Math.round(activePoint.occupied)}% occupied`}.` : ""}</span>
          <div className={`${styles.bars} ${interactionStyles.bars}`} style={{ "--point-count": pointCount, "--now-index": nowIndex }}>
            {isToday ? <span className={`${styles.nowMarker} ${interactionStyles.nowMarker}`} aria-hidden="true"><span>Now</span></span> : null}
            {activePoint ? <span className={interactionStyles.marker} aria-hidden="true" style={{ left: `calc((100% + var(--bar-gap)) / var(--point-count) * (${activeInspection.index} + .5) - var(--bar-gap) / 2)`, "--tooltip-shift": `${activeInspection.tooltipShift}px` }}>
              <span className={interactionStyles.readout}><strong>{activePoint.closed ? "Closed" : activePoint.occupied === null ? "Unavailable" : `${Math.round(activePoint.occupied)}% occupied`}</strong><span>{activePoint.time.toFormat("h:mm a")}</span></span>
            </span> : null}
            {points.map(({ time, occupied, tone, closed }, index) => (
              <div className={styles.barColumn} key={index} role="img" aria-label={`${time.toFormat("h:mm a")}: ${closed ? "Closed" : occupied === null ? "Estimate unavailable" : `${Math.round(occupied)}% occupied`}`}>
                <div className={styles.barTrack} aria-hidden="true">
                  {occupied === null ? (
                    <span className={styles.missingBar}>{closed ? "×" : "—"}</span>
                  ) : (
                    <ForecastBar occupied={occupied} tone={tone} />
                  )}
                </div>
                <span className={styles.barLabel} aria-hidden="true">{time.minute === 0 ? time.toFormat("ha").toLowerCase() : "\u00a0"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.forecastEmpty} role="status">
          {loading ? "Loading forecast…" : "Forecast estimates are unavailable for this day."}
        </p>
      )}
      <div className={styles.segments} role="group" aria-label="Forecast time of day" style={{ "--selected-window": WINDOWS.findIndex((window) => window.start === startHour) }}>
        <span className={styles.segmentIndicator} aria-hidden="true" />
        {WINDOWS.map(({ start, label }) => (
          <button key={start} type="button" disabled={!hasData} aria-pressed={startHour === start} onClick={() => scrollToIndex(day.set({ hour: start }).diff(day, "minutes").minutes / 30)}>{label}</button>
        ))}
      </div>
      {hasData ? <p id="garage-forecast-scroll-hint" className={styles.forecastHint}><MoveHorizontal aria-hidden="true" size={13} />Scroll to explore · hold to see occupancy<span className={styles.srOnly}>. Hover or click a bar, or hold still for one second on touch screens. Use left and right arrow keys to move by one hour, Home for the start, or End for the end of the day. Press Escape to hide the readout.</span></p> : null}
      {error ? <p className={styles.notice}>Forecast updates could not load. <button type="button" onClick={onRetry}>Try again</button></p> : null}
      <p className={styles.note}>Forecast occupancy uses historical patterns. Actual availability may vary.</p>
    </>
  );
}
