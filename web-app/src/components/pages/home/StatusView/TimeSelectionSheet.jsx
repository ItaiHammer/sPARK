"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { DateTime } from "luxon";
import { openNativePicker } from "@/lib/utils/client/nativePicker";
import styles from "./TimeSelectionSheet.module.css";

const STEP = 15;
const LAST_MINUTE = 1439;
const LAST_DETENT = 1425;
const PIXELS_PER_MINUTE = 1.6;
const SHEET_PEEK = 28;
const ELASTIC_LIMIT = 20;
const SHEET_ID = "spark-time-selection-sheet";
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const snap = (value) => clamp(Math.round(value / STEP) * STEP, 0, LAST_DETENT);

function timeParts(minutes) {
  const hour = Math.floor(minutes / 60);
  return { time: `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")}`, period: hour < 12 ? "AM" : "PM" };
}

function elasticOffset(value, maximum) {
  const logical = clamp(value, 0, maximum);
  const excess = value - logical;
  return logical + Math.sign(excess) * ELASTIC_LIMIT * (1 - Math.exp(-Math.abs(excess) * 0.22 / ELASTIC_LIMIT));
}

function rawOffset(value, maximum) {
  const logical = clamp(value, 0, maximum);
  const excess = value - logical;
  return logical - Math.sign(excess) * ELASTIC_LIMIT / 0.22 * Math.log(1 - Math.min(0.999999, Math.abs(excess) / ELASTIC_LIMIT));
}

/** Native date/time controls and a relative, 15-minute ruler. Data stays owned by the page. */
export default function TimeSelectionSheet({
  selection,
  todayISO,
  maxDateISO,
  expanded,
  onExpandedChange,
  onSelect,
  onToggleLive,
  onVisibleHeightChange,
  canPauseLive = true,
  zone = "America/Los_Angeles",
}) {
  const reducedMotion = useReducedMotion();
  const nativeId = useId();
  const sheetRef = useRef(null);
  const rulerRef = useRef(null);
  const sheetGesture = useRef(null);
  const rulerGesture = useRef(null);
  const sheetAnimation = useRef(null);
  const rulerAnimation = useRef(null);
  const suppressedClickUntil = useRef(0);
  const hapticTime = useRef(0);
  const selectionRef = useRef(selection);
  const heightCallback = useRef(onVisibleHeightChange);
  const [geometry, setGeometry] = useState({ height: 214, peek: SHEET_PEEK });
  const [rulerWidth, setRulerWidth] = useState(200);
  const [sheetDragging, setSheetDragging] = useState(false);
  const [rulerDragging, setRulerDragging] = useState(false);
  const [rulerPointerFocus, setRulerPointerFocus] = useState(false);
  const [handlePointerFocus, setHandlePointerFocus] = useState(false);
  const [settledClosed, setSettledClosed] = useState(!expanded);
  const sheetY = useMotionValue(expanded ? 0 : 214 - SHEET_PEEK);
  const rulerMinutes = useMotionValue(selection.minutes);
  const tickX = useTransform(rulerMinutes, (value) => rulerWidth / 2 - value * PIXELS_PER_MINUTE);
  const travel = Math.max(0, geometry.height - geometry.peek);
  const selectedTime = timeParts(selection.minutes);

  useEffect(() => {
    // Native pickers can make focus restoration look like keyboard focus.
    // Remember input modality across the outside toggle and handle refocus.
    const pointerInput = () => setHandlePointerFocus(true);
    const keyboardInput = () => setHandlePointerFocus(false);
    document.addEventListener("pointerdown", pointerInput, true);
    document.addEventListener("keydown", keyboardInput, true);
    return () => {
      document.removeEventListener("pointerdown", pointerInput, true);
      document.removeEventListener("keydown", keyboardInput, true);
    };
  }, []);

  useEffect(() => {
    selectionRef.current = selection;
    heightCallback.current = onVisibleHeightChange;
  }, [onVisibleHeightChange, selection]);

  const days = useMemo(() => Array.from({ length: 4 }, (_, index) => {
    const date = DateTime.fromISO(todayISO, { zone }).plus({ days: index });
    return { iso: date.toISODate(), label: index === 0 ? "Today" : date.toFormat("ccc"), day: date.day, accessible: date.toFormat("cccc, LLLL d, yyyy") };
  }), [todayISO, zone]);
  const quickIndex = days.findIndex((day) => day.iso === selection.dateISO);
  const selectedDay = DateTime.fromISO(selection.dateISO, { zone });
  const ticks = useMemo(() => Array.from({ length: 97 }, (_, index) => {
    const minutes = index * STEP;
    const hour = Math.floor(minutes / 60) % 24;
    return { minutes, major: minutes % 60 === 0, label: `${hour % 12 || 12}${hour < 12 ? "AM" : "PM"}` };
  }), []);

  const settleSheet = useCallback((open) => {
    sheetAnimation.current?.stop();
    setSettledClosed(false);
    const target = open ? 0 : travel;
    if (reducedMotion) {
      sheetY.set(target);
      setSettledClosed(!open);
    } else {
      sheetAnimation.current = animate(sheetY, target, {
        type: "spring", stiffness: 410, damping: 34, mass: 0.8,
        onComplete: () => setSettledClosed(!open),
      });
    }
  }, [reducedMotion, sheetY, travel]);

  useEffect(() => {
    const sheet = sheetRef.current;
    const ruler = rulerRef.current;
    if (!sheet || !ruler) return;
    const measure = () => {
      const safeArea = Math.max(0, (Number.parseFloat(getComputedStyle(sheet).paddingBottom) || 12) - 12);
      const next = { height: sheet.offsetHeight, peek: SHEET_PEEK + safeArea };
      setGeometry((previous) => previous.height === next.height && previous.peek === next.peek ? previous : next);
      setRulerWidth(ruler.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    observer.observe(ruler);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!sheetGesture.current) {
        if (!expanded && sheetRef.current?.querySelector(`.${styles.content}`)?.contains(document.activeElement)) {
          sheetRef.current.querySelector(`.${styles.handle}`)?.focus({ preventScroll: true });
        }
        settleSheet(expanded);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [expanded, settleSheet]);

  useEffect(() => {
    let frame;
    const publishHeight = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => heightCallback.current?.(geometry.height - clamp(sheetY.get(), 0, travel)));
    };
    publishHeight();
    const unsubscribe = sheetY.on("change", publishHeight);
    return () => { unsubscribe(); cancelAnimationFrame(frame); };
  }, [geometry.height, sheetY, travel]);

  useEffect(() => {
    if (rulerGesture.current) return;
    rulerAnimation.current?.stop();
    if (reducedMotion) rulerMinutes.set(selection.minutes);
    else rulerAnimation.current = animate(rulerMinutes, selection.minutes, { duration: 0.19, ease: [0.2, 0.9, 0.3, 1] });
  }, [reducedMotion, rulerMinutes, selection.minutes]);

  useEffect(() => () => {
    sheetAnimation.current?.stop();
    rulerAnimation.current?.stop();
  }, []);

  useEffect(() => {
    const cancelGestures = () => {
      const sheetPointer = sheetGesture.current?.pointer;
      const sheetCaptureTarget = sheetGesture.current?.captureTarget;
      const rulerPointer = rulerGesture.current?.pointer;
      sheetGesture.current = null;
      rulerGesture.current = null;
      if (sheetPointer !== undefined) {
        if (sheetCaptureTarget?.hasPointerCapture(sheetPointer)) sheetCaptureTarget.releasePointerCapture(sheetPointer);
        setSheetDragging(false);
        settleSheet(expanded);
      }
      if (rulerPointer !== undefined) {
        if (rulerRef.current?.hasPointerCapture(rulerPointer)) rulerRef.current.releasePointerCapture(rulerPointer);
        setRulerDragging(false);
        rulerMinutes.set(selectionRef.current.minutes);
      }
    };
    window.addEventListener("blur", cancelGestures);
    return () => window.removeEventListener("blur", cancelGestures);
  }, [expanded, rulerMinutes, settleSheet]);

  function haptic() {
    const now = performance.now();
    if (now - hapticTime.current < 45) return;
    hapticTime.current = now;
    if (typeof navigator.vibrate === "function") {
      try { navigator.vibrate(5); } catch { /* Unsupported browser policies leave the control usable. */ }
    }
  }

  function selectMinutes(minutes, continuous = false) {
    return onSelect(selectionRef.current.dateISO, clamp(Math.round(minutes), 0, LAST_MINUTE), { continuous });
  }

  function beginSheetDrag(event) {
    if (event.button !== 0 || !event.isPrimary || sheetGesture.current || rulerGesture.current) return;
    const onHandle = event.target.closest(`.${styles.handle}`);
    if (!onHandle && event.target.closest("input, button, label, a, select, textarea, [role=slider]")) return;
    suppressedClickUntil.current = 0;
    sheetAnimation.current?.stop();
    // Capture before the first move can leave the compact collapsed handle.
    // Keeping the initial capture on the button preserves ordinary tap clicks.
    const captureTarget = onHandle || event.currentTarget;
    sheetGesture.current = {
      pointer: event.pointerId, x: event.clientX, y: event.clientY, lastY: event.clientY,
      lastTime: performance.now(), velocity: 0, axis: null, onHandle: Boolean(onHandle),
      start: rawOffset(sheetY.get(), travel), offset: sheetY.get(), open: expanded,
      captureTarget,
    };
    captureTarget.setPointerCapture(event.pointerId);
  }

  function moveSheetDrag(event) {
    const gesture = sheetGesture.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 6) {
      gesture.axis = Math.abs(dy) > Math.abs(dx) * (gesture.onHandle ? 0.65 : 1) ? "vertical" : "horizontal";
    }
    if (gesture.axis !== "vertical") return;
    event.preventDefault();
    if (gesture.captureTarget !== event.currentTarget) {
      // The old button's lost-capture event is ignored during this handoff.
      gesture.captureTarget = event.currentTarget;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setSheetDragging(true);
    setSettledClosed(false);
    const now = performance.now();
    const elapsed = now - gesture.lastTime;
    if (elapsed > 0) gesture.velocity = gesture.velocity * 0.35 + (event.clientY - gesture.lastY) / elapsed * 0.65;
    gesture.lastY = event.clientY;
    gesture.lastTime = now;
    gesture.offset = gesture.start + dy;
    sheetY.set(elasticOffset(gesture.offset, travel));
  }

  function finishSheetDrag(event, cancelled = false) {
    const gesture = sheetGesture.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    sheetGesture.current = null;
    setSheetDragging(false);
    if (gesture.captureTarget.hasPointerCapture(event.pointerId)) gesture.captureTarget.releasePointerCapture(event.pointerId);
    if (gesture.axis !== "vertical" || cancelled) { settleSheet(gesture.open); return; }
    suppressedClickUntil.current = performance.now() + 400;
    const velocity = performance.now() - gesture.lastTime > 120 ? 0 : gesture.velocity;
    const open = Math.abs(velocity) > 0.45 ? velocity < 0 : clamp(gesture.offset, 0, travel) < travel / 2;
    settleSheet(open);
    onExpandedChange(open);
  }

  function beginRulerDrag(event) {
    if (event.button !== 0 || !event.isPrimary || rulerGesture.current || sheetGesture.current) return;
    event.preventDefault();
    // Programmatic focus can inherit the native picker's keyboard focus ring.
    setRulerPointerFocus(true);
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    rulerAnimation.current?.stop();
    rulerGesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, minutes: selectionRef.current.minutes, axis: null, moved: false, lastMinutes: selectionRef.current.minutes };
  }

  function moveRulerDrag(event) {
    const gesture = rulerGesture.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 6) gesture.axis = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    if (gesture.axis !== "horizontal") return;
    event.preventDefault();
    gesture.moved = true;
    setRulerDragging(true);
    const visual = clamp(gesture.minutes - dx / PIXELS_PER_MINUTE, 0, LAST_MINUTE);
    rulerMinutes.set(visual);
    const minutes = snap(visual);
    if (minutes !== gesture.lastMinutes || selectionRef.current.mode === "live") {
      if (selectMinutes(minutes, true) !== false) {
        gesture.lastMinutes = minutes;
        haptic();
      } else rulerMinutes.set(selectionRef.current.minutes);
    }
  }

  function finishRulerDrag(event, cancelled = false) {
    const gesture = rulerGesture.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    rulerGesture.current = null;
    setRulerDragging(false);
    // Cancellation returns the ruler to the actual accepted selection, including
    // a live clock update or a selection rejected by the parent during the drag.
    let minutes = cancelled ? selectionRef.current.minutes : gesture.lastMinutes;
    if (!cancelled && !gesture.moved && gesture.axis !== "vertical") {
      const bounds = event.currentTarget.getBoundingClientRect();
      minutes = snap(gesture.minutes + (event.clientX - bounds.left - bounds.width / 2) / PIXELS_PER_MINUTE);
      if (selectMinutes(minutes) === false) minutes = selectionRef.current.minutes;
    }
    if (!cancelled && gesture.moved && selectMinutes(minutes) === false) minutes = selectionRef.current.minutes;
    rulerAnimation.current?.stop();
    if (reducedMotion) rulerMinutes.set(minutes);
    else rulerAnimation.current = animate(rulerMinutes, minutes, { duration: 0.19, ease: [0.2, 0.9, 0.3, 1] });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function rulerKeyDown(event) {
    setRulerPointerFocus(false);
    const deltas = { ArrowLeft: -STEP, ArrowDown: -STEP, ArrowRight: STEP, ArrowUp: STEP, PageDown: -60, PageUp: 60 };
    if (!(event.key in deltas) && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    selectMinutes(event.key === "Home" ? 0 : event.key === "End" ? LAST_MINUTE : selection.minutes + deltas[event.key]);
  }

  function chooseDate(event) {
    const value = event.target.value;
    const date = DateTime.fromISO(value, { zone });
    if (!date.isValid || date.toISODate() !== value || value > maxDateISO) {
      event.target.value = selection.dateISO;
      return;
    }
    if (onSelect(value, selection.minutes) === false) event.target.value = selection.dateISO;
  }

  function chooseTime(event) {
    const match = /^(\d{2}):(\d{2})$/.exec(event.target.value);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return;
    const minutes = Number(match[1]) * 60 + Number(match[2]);
    if (onSelect(selection.dateISO, minutes) === false) event.target.value = `${String(Math.floor(selection.minutes / 60)).padStart(2, "0")}:${String(selection.minutes % 60).padStart(2, "0")}`;
  }

  return (
    <motion.section
      ref={sheetRef}
      id={SHEET_ID}
      className={styles.sheet}
      style={{ y: sheetY }}
      aria-label="Choose a day and time"
      data-dragging={sheetDragging || undefined}
      onPointerDown={beginSheetDrag}
      onPointerMove={moveSheetDrag}
      onPointerUp={(event) => finishSheetDrag(event)}
      onPointerCancel={(event) => finishSheetDrag(event, true)}
      onLostPointerCapture={(event) => {
        if (sheetGesture.current?.captureTarget === event.target) finishSheetDrag(event, true);
      }}
      onKeyDown={(event) => { if (event.key === "Escape" && expanded) onExpandedChange(false); }}
    >
      <button
        type="button"
        className={styles.handle}
        data-pointer-focus={handlePointerFocus || undefined}
        aria-label={`${expanded ? "Collapse" : "Expand"} date and time controls`}
        aria-expanded={expanded}
        aria-controls={`${nativeId}-content`}
        onClick={() => { if (performance.now() >= suppressedClickUntil.current) onExpandedChange(!expanded); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            onExpandedChange(event.key === "ArrowUp");
          }
        }}
      ><span /></button>
      <div
        id={`${nativeId}-content`}
        className={styles.content}
        style={{ visibility: settledClosed ? "hidden" : undefined }}
        inert={!expanded && !sheetDragging}
        aria-hidden={!expanded && !sheetDragging}
      >
        <div className={styles.days}>
          <span
            className={styles.dayHighlight}
            style={{ "--selected-index": quickIndex < 0 ? 4 : quickIndex }}
            aria-hidden="true"
          />
          {days.map((day) => (
            <button key={day.iso} className={styles.day} type="button" aria-label={`${day.label === "Today" ? "Today, " : ""}${day.accessible}`} aria-pressed={selection.dateISO === day.iso} onClick={() => onSelect(day.iso, selection.minutes)}>
              <span>{day.label}</span><strong>{day.day}</strong>
            </button>
          ))}
          <label className={styles.nativeDate} data-selected={quickIndex < 0 || undefined}>
            {quickIndex < 0 ? <span className={styles.customDateLabel} aria-hidden="true"><span>{selectedDay.toFormat("LLL")}</span><strong>{selectedDay.day}</strong></span> : <Calendar size={18} aria-hidden="true" />}
            <input id={`${nativeId}-date`} className={styles.nativeInput} type="date" max={maxDateISO} value={selection.dateISO} onClick={openNativePicker} onInput={chooseDate} onChange={chooseDate} aria-label="Selected date" />
          </label>
        </div>
        <div className={styles.timeHeading}>
          <label className={styles.nativeTime}>
            <Clock3 size={16} aria-hidden="true" />
            <span className={styles.timeLabel} aria-hidden="true">{selectedTime.time} <span>{selectedTime.period}</span></span>
            <input id={`${nativeId}-time`} className={styles.nativeInput} type="time" min="00:00" max="23:59" step="60" value={`${String(Math.floor(selection.minutes / 60)).padStart(2, "0")}:${String(selection.minutes % 60).padStart(2, "0")}`} onClick={openNativePicker} onInput={chooseTime} onChange={chooseTime} aria-label="Selected time" />
          </label>
          <button type="button" className={styles.now} role="switch" aria-checked={selection.mode === "live"} aria-label="Now, live updates" disabled={selection.mode === "live" && !canPauseLive} onClick={onToggleLive}>
            <span className={styles.nowDot} aria-hidden="true" /><span>Now</span>
          </button>
        </div>
        <div className={styles.rulerRow}>
          <button className={styles.step} type="button" aria-label="15 minutes earlier" disabled={selection.minutes === 0} onClick={() => selectMinutes(selection.minutes - STEP)}><ChevronLeft size={15} aria-hidden="true" /></button>
          <div
            ref={rulerRef}
            className={styles.ruler}
            role="slider"
            tabIndex={0}
            aria-label="Time ruler"
            aria-valuemin={0}
            aria-valuemax={LAST_MINUTE}
            aria-valuenow={selection.minutes}
            aria-valuetext={`${selectedTime.time} ${selectedTime.period}`}
            data-dragging={rulerDragging || undefined}
            data-pointer-focus={rulerPointerFocus || undefined}
            onKeyDown={rulerKeyDown}
            onBlur={() => setRulerPointerFocus(false)}
            onPointerDown={beginRulerDrag}
            onPointerMove={moveRulerDrag}
            onPointerUp={(event) => finishRulerDrag(event)}
            onPointerCancel={(event) => finishRulerDrag(event, true)}
            onLostPointerCapture={(event) => finishRulerDrag(event, true)}
          >
            <div className={styles.tickWindow} aria-hidden="true">
              <motion.div className={styles.ticks} style={{ x: tickX }}>
                {ticks.map((tick) => <span key={tick.minutes} className={`${styles.tick} ${tick.major ? styles.tickMajor : ""}`} style={{ left: tick.minutes * PIXELS_PER_MINUTE }}>{tick.major && <span>{tick.label}</span>}</span>)}
              </motion.div>
            </div>
            <span className={styles.marker} aria-hidden="true" />
          </div>
          <button className={styles.step} type="button" aria-label="15 minutes later" disabled={selection.minutes === LAST_MINUTE} onClick={() => selectMinutes(selection.minutes + STEP)}><ChevronRight size={15} aria-hidden="true" /></button>
        </div>
      </div>
    </motion.section>
  );
}
