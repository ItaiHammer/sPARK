"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { forecastAt, operatingHours, parkingStatus } from "@/lib/utils/client/parking";
import styles from "./GaragePage.module.css";
import interactionStyles from "./GarageForecastInteraction.module.css";

const WINDOWS = [
  { start: 8, label: "8am–1pm" },
  { start: 14, label: "2pm–7pm" },
  { start: 19, label: "7pm–12am" },
];
const HOLD_DELAY_MS = 350;
const HOLD_TOLERANCE_PX = 12;
const FORECAST_STEP_MINUTES = 30;

function inspectForecast(points, day, garage, index) {
  const minutes = Math.round(index * FORECAST_STEP_MINUTES);
  if (minutes % FORECAST_STEP_MINUTES === 0) return points[minutes / FORECAST_STEP_MINUTES];
  const time = day.plus({ minutes });
  const leftIndex = Math.floor(index);
  const left = points[leftIndex];
  const right = points[leftIndex + 1];
  const closed = operatingHours(garage, time).closed;
  // A gap or a closed endpoint breaks the curve.
  const occupied = closed || left.occupied === null || right.occupied === null
    ? null
    : left.occupied + (right.occupied - left.occupied) * (index - leftIndex);
  return { time, closed, occupied };
}

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
  const day = useMemo(() => selectedAt.startOf("day"), [selectedAt]);
  const dayKey = `${garage.lot_id}:${day.toMillis()}`;
  const pointCount = Math.round(day.plus({ days: 1 }).diff(day, "minutes").minutes / FORECAST_STEP_MINUTES) + 1;
  const isToday = selectedAt.hasSame(currentAt, "day");
  const nowIndex = currentAt.diff(day, "minutes").minutes / 30;
  const points = useMemo(() => Array.from({ length: pointCount }, (_, index) => {
    const time = day.plus({ minutes: index * FORECAST_STEP_MINUTES });
    const closed = operatingHours(garage, time).closed;
    const occupied = closed ? null : forecastAt(rows, time.toMillis());
    return { time, closed, occupied, tone: parkingStatus(occupied, closed).tone };
  }), [day, garage, pointCount, rows]);
  const columns = useMemo(() => points.map(({ time, occupied, tone, closed }, index) => (
    <div className={styles.barColumn} key={index} role="img" aria-label={`${time.toFormat("h:mm a")}: ${closed ? "Closed" : occupied === null ? "Estimate unavailable" : `${Math.round(occupied)}% occupied`}`}>
      <div className={styles.barTrack} aria-hidden="true">
        {occupied === null ? <span className={styles.missingBar}>{closed ? "×" : "—"}</span> : <ForecastBar occupied={occupied} tone={tone} />}
      </div>
      <span className={styles.barLabel} aria-hidden="true">{time.minute === 0 ? time.toFormat("ha").toLowerCase() : "\u00a0"}</span>
    </div>
  )), [points]);
  const hasData = points.some((point) => point.occupied !== null);
  const activeInspection = !updating && inspection?.dayKey === dayKey ? inspection : null;
  const activePoint = activeInspection ? inspectForecast(points, day, garage, activeInspection.index) : null;
  const timeLabel = activePoint?.time.toFormat("h:mm a");

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

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || !hasData) return;
    const preventScrollDuringHold = (event) => {
      if (hold.current?.held && event.touches.length === 1 && event.cancelable) event.preventDefault();
    };
    // The browser needs the listener registered before contact. Until the hold
    // wins, leaving touchmove alone lets native panning and momentum take over.
    element.addEventListener("touchmove", preventScrollDuringHold, { passive: false });
    return () => element.removeEventListener("touchmove", preventScrollDuringHold);
  }, [hasData]);

  const chartGeometry = (element) => {
    const track = element.lastElementChild;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    return { gap, step: (track.getBoundingClientRect().width + gap) / pointCount };
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
    const resize = () => element.scrollTo({ left: scrollIndex.current * chartGeometry(element).step, behavior: "instant" });
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
    element.scrollTo({ left: index * chartGeometry(element).step, behavior: reduced ? "instant" : "smooth" });
  };
  const boundIndex = (index) => Math.max(0, Math.min(pointCount - 1, index));
  const makeInspection = (element, index, contentX, source) => {
    const viewportX = contentX - element.scrollLeft;
    // Keep the label in the viewport while the line stays at the inspected coordinate.
    const inset = Math.min(60, element.clientWidth / 2);
    const tooltipShift = Math.min(Math.max(viewportX, inset), element.clientWidth - inset) - viewportX;
    return { index, contentX, source, dayKey, tooltipShift };
  };
  const inspectIndex = (index) => {
    const element = scroller.current;
    const { gap, step } = chartGeometry(element);
    const boundedIndex = boundIndex(Math.round(index));
    return makeInspection(element, boundedIndex, (boundedIndex + .5) * step - gap / 2, "keyboard");
  };
  const inspectPointer = (event, source) => {
    const element = scroller.current;
    const { gap, step } = chartGeometry(element);
    const viewportX = event.clientX - element.getBoundingClientRect().left;
    const contentX = Math.max(0, Math.min(element.clientWidth - 1, viewportX)) + element.scrollLeft;
    return makeInspection(element, boundIndex((contentX + gap / 2) / step - .5), contentX, source);
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
    }, HOLD_DELAY_MS);
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
    if (gesture.held) {
      setInspection(inspectPointer(event, "touch"));
      return;
    }
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > HOLD_TOLERANCE_PX) {
      cancelHold();
      setInspection(null);
    } else {
      gesture.inspection = inspectPointer(event, "touch");
    }
  };
  const onPointerUp = (event) => {
    const gesture = hold.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    cancelHold();
    if (!gesture.held) setInspection(null);
  };
  const onScroll = () => {
    const element = scroller.current;
    cancelHold();
    setInspection((previous) => !updating && previous?.source === "keyboard" && previous.dayKey === dayKey ? inspectIndex(previous.index) : null);
    scrollIndex.current = element.scrollLeft / chartGeometry(element).step;
    const firstTime = day.plus({ minutes: scrollIndex.current * 30 });
    scrollClock.current = firstTime.hour * 60 + firstTime.minute;
    const hour = day.plus({ minutes: (scrollIndex.current + 5) * 30 }).hour;
    setStartHour(hour < 14 ? 8 : hour < 19 ? 14 : 19);
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      cancelHold();
      setInspection(null);
      return;
    }
    if (updating) return;
    const offset = { ArrowLeft: -2, ArrowRight: 2 }[event.key];
    if (offset === undefined && !["Home", "End", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const previousIndex = activeInspection?.index ?? Math.round(scrollIndex.current + 5);
    const index = event.key === "Home" ? 0 : event.key === "End" ? pointCount - 1 : previousIndex + (offset ?? 0);
    const nextInspection = inspectIndex(index);
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
          onFocus={(event) => { if (!updating && event.currentTarget.matches(":focus-visible")) setInspection(inspectIndex(scrollIndex.current + 5)); }}
          onBlur={() => { cancelHold(); setInspection(null); }}>
          <span className={styles.srOnly}>{isToday ? `Now: ${currentAt.toFormat("h:mm a")}.` : `Forecast for ${selectedAt.toFormat("cccc, LLLL d")}.`}</span>
          <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{activePoint ? `${timeLabel}: ${activePoint.closed ? "Closed" : activePoint.occupied === null ? "Estimate unavailable" : `${Math.round(activePoint.occupied)}% occupied`}.` : ""}</span>
          <div className={`${styles.bars} ${interactionStyles.bars}`} style={{ "--point-count": pointCount, "--now-index": nowIndex }}>
            {isToday ? <span className={`${styles.nowMarker} ${interactionStyles.nowMarker}`} aria-hidden="true"><span>Now</span></span> : null}
            {activePoint ? <span className={interactionStyles.marker} aria-hidden="true" style={{ left: activeInspection.contentX, "--tooltip-shift": `${activeInspection.tooltipShift}px` }}>
              {activePoint.occupied !== null ? <span className={interactionStyles.markerDot} style={{ top: `${100 - activePoint.occupied}%` }} /> : null}
              <span className={interactionStyles.readout}><strong>{activePoint.closed ? "Closed" : activePoint.occupied === null ? "Unavailable" : `${Math.round(activePoint.occupied)}% occupied`}</strong><span key={timeLabel}>{timeLabel}</span></span>
            </span> : null}
            {columns}
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
      {hasData ? <p id="garage-forecast-scroll-hint" className={styles.forecastHint}><MoveHorizontal aria-hidden="true" size={13} />Scroll to explore · hold to see occupancy<span className={styles.srOnly}>. Hover or click a bar. On a touch screen, hold a bar until the readout appears, then drag to inspect other bars. Use left and right arrow keys to move by one hour, Home for the start, or End for the end of the day. Press Escape to hide the readout.</span></p> : null}
      {error ? <p className={styles.notice}>Forecast updates could not load. <button type="button" onClick={onRetry}>Try again</button></p> : null}
      <p className={styles.note}>Forecast occupancy uses historical patterns. Actual availability may vary.</p>
    </>
  );
}
