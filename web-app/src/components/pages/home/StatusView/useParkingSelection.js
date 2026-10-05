"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { selectionDateTime } from "@/lib/utils/client/parking";

const STORAGE_VERSION = 1;
const DEFAULT_ZONE = "America/Los_Angeles";
const MAX_STORAGE_LENGTH = 200000;
const ALERT_TYPES = new Set([
  "opening", "closing", "fullSoon", "busySoon", "recovery", "availableSoon",
  "moreSpaces", "fewerSpaces", "limited", "roomy", "available", "unknown", "info",
]);
const LOT_TEXT_FIELDS = [
  "id", "lot_id", "name", "hours", "hoursLabel", "status", "statusTone",
  "open_time", "close_time", "scraped_at", "request_local_time",
];
const LOT_NUMBER_FIELDS = ["capacity", "spot_count", "occupancy_pct", "point"];

function validZone(zone) {
  return typeof zone === "string" && DateTime.now().setZone(zone).isValid
    ? zone
    : DEFAULT_ZONE;
}

export function liveParkingSelection(zone, now = Date.now()) {
  const current = DateTime.fromMillis(now, { zone: validZone(zone) });
  return {
    mode: "live",
    dateISO: current.toISODate(),
    minutes: current.hour * 60 + current.minute,
    zone: current.zoneName,
  };
}

export function validateParkingSelection(value, zone, now = Date.now()) {
  if (!value || !["live", "paused", "forecast"].includes(value.mode)) return null;
  const selection = {
    mode: value.mode,
    dateISO: value.dateISO,
    minutes: value.minutes,
    zone: validZone(zone),
  };
  const selectedAt = selectionDateTime(selection);
  const maximum = DateTime.fromMillis(now, { zone: selection.zone }).plus({ days: 6 }).toISODate();
  return selectedAt && selection.dateISO <= maximum ? selection : null;
}

function snapshotAlert(value) {
  if (!value || typeof value.text !== "string" || !value.text.trim() || value.text.length > 160) return null;
  return { text: value.text, type: ALERT_TYPES.has(value.type) ? value.type : "unknown" };
}

// Persist only card data, rather than API payloads or complete forecast curves.
// Counts and alerts are copied together so a paused card remains a snapshot.
export function copyPausedParkingSnapshot(value) {
  if (!value || !Array.isArray(value.lots) || value.lots.length > 100) return null;
  const lots = [];
  for (const lot of value.lots) {
    if (!lot || typeof lot !== "object" || Array.isArray(lot)
      || typeof lot.name !== "string" || !lot.name.trim() || lot.name.length > 200
      || ![lot.lot_id, lot.id].some((id) => typeof id === "string" && id.length > 0 && id.length <= 128)
      || !(lot.occupied === null || (Number.isInteger(lot.occupied) && lot.occupied >= 0 && lot.occupied <= 100))
      || !(lot.spaces === null || (Number.isInteger(lot.spaces) && lot.spaces >= 0 && lot.spaces <= 10000000))
      || typeof lot.closed !== "boolean") return null;

    const copy = { occupied: lot.occupied, spaces: lot.spaces, closed: lot.closed };
    for (const key of LOT_TEXT_FIELDS) {
      if (typeof lot[key] === "string" && lot[key].length <= 200) copy[key] = lot[key];
    }
    for (const key of LOT_NUMBER_FIELDS) {
      if (lot[key] === null || (typeof lot[key] === "number" && Number.isFinite(lot[key]))) copy[key] = lot[key];
    }
    if (typeof lot["24_hour"] === "boolean") copy["24_hour"] = lot["24_hour"];
    if (lot.spot_categories && typeof lot.spot_categories === "object") {
      copy.spot_categories = {};
      for (const key of ["disabled", "employee", "limited_time", "motorcycle", "ev_charging"]) {
        const count = lot.spot_categories[key];
        if (Number.isFinite(count) && count >= 0) copy.spot_categories[key] = count;
      }
    }
    const indicator = snapshotAlert(lot.alert || lot.indicator);
    copy.alert = indicator;
    copy.indicator = indicator;
    if (lot.travel && typeof lot.travel === "object") {
      const travel = {};
      for (const key of ["meters", "seconds", "minutes", "miles"]) {
        if (typeof lot.travel[key] === "number" && Number.isFinite(lot.travel[key]) && lot.travel[key] >= 0) travel[key] = lot.travel[key];
      }
      if (typeof lot.travel.buildingAbbreviation === "string" && lot.travel.buildingAbbreviation.length <= 200) {
        travel.buildingAbbreviation = lot.travel.buildingAbbreviation;
      }
      copy.travel = travel;
    } else copy.travel = null;
    lots.push(copy);
  }
  const refreshedAt = typeof value.refreshedAt === "string"
    && value.refreshedAt.length <= 100
    && DateTime.fromISO(value.refreshedAt, { setZone: true }).isValid
    ? value.refreshedAt
    : null;
  return { lots, refreshedAt };
}

export function decodeParkingSelection(serialized, zone, now = Date.now()) {
  if (typeof serialized !== "string" || serialized.length > MAX_STORAGE_LENGTH) return null;
  try {
    const value = JSON.parse(serialized);
    if (!value || value.version !== STORAGE_VERSION) return null;
    const selection = validateParkingSelection(value.selection, zone, now);
    if (!selection) return null;
    const pausedSnapshot = selection.mode === "paused" ? copyPausedParkingSnapshot(value.pausedSnapshot) : null;
    if (selection.mode === "paused" && !pausedSnapshot) return null;
    return {
      selection: selection.mode === "live" ? liveParkingSelection(zone, now) : selection,
      expanded: typeof value.expanded === "boolean" ? value.expanded : true,
      pausedSnapshot,
    };
  } catch {
    return null;
  }
}

function initialState(storageKey, zone) {
  let restored = null;
  if (typeof window !== "undefined") {
    try { restored = decodeParkingSelection(window.localStorage.getItem(storageKey), zone); }
    catch { /* Private browsing and blocked storage still allow the picker to work. */ }
  }
  return {
    storageKey,
    ...(restored || { selection: liveParkingSelection(zone), expanded: true, pausedSnapshot: null }),
  };
}

export default function useParkingSelection({ locationId, zone = DEFAULT_ZONE }) {
  const locationZone = validZone(zone);
  const storageKey = `spark:parking-selection:v${STORAGE_VERSION}:${String(locationId || "default")}`;
  const [state, setState] = useState(() => initialState(storageKey, locationZone));
  const [now, setNow] = useState(() => Date.now());

  // Reconcile location props before children render, avoiding one frame of the
  // previous campus's saved selection or a write to the wrong storage key.
  if (state.storageKey !== storageKey) {
    setState(initialState(storageKey, locationZone));
  } else if (state.selection.zone !== locationZone) {
    const selection = state.selection.mode === "live"
      ? liveParkingSelection(locationZone)
      : validateParkingSelection(state.selection, locationZone);
    setState({
      ...state,
      selection: selection || liveParkingSelection(locationZone),
      pausedSnapshot: selection ? state.pausedSnapshot : null,
    });
  }

  useEffect(() => {
    const tick = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      setState((previous) => {
        if (previous.selection.mode !== "live") return previous;
        const selection = liveParkingSelection(previous.selection.zone, timestamp);
        return selection.dateISO === previous.selection.dateISO && selection.minutes === previous.selection.minutes
          ? previous
          : { ...previous, selection };
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") tick();
    };
    const interval = window.setInterval(tick, 30000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (state.storageKey !== storageKey || state.selection.zone !== locationZone) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: STORAGE_VERSION,
        selection: state.selection,
        expanded: state.expanded,
        pausedSnapshot: state.selection.mode === "paused" ? state.pausedSnapshot : null,
      }));
    } catch { /* UI state remains usable when browser storage is unavailable. */ }
  }, [state, storageKey, locationZone]);

  const setExpanded = useCallback((value) => {
    setState((previous) => {
      const expanded = typeof value === "function" ? Boolean(value(previous.expanded)) : Boolean(value);
      return previous.expanded === expanded ? previous : { ...previous, expanded };
    });
  }, []);

  const select = useCallback((dateISO, minutes, options = {}) => {
    const selection = validateParkingSelection({ mode: "forecast", dateISO, minutes }, locationZone);
    if (!selection) return false;
    setState((previous) => {
      const expanded = typeof options.expanded === "boolean" ? options.expanded : previous.expanded;
      if (previous.selection.mode === "forecast" && previous.selection.dateISO === dateISO
        && previous.selection.minutes === minutes && previous.selection.zone === locationZone
        && previous.expanded === expanded) return previous;
      return { storageKey, selection, expanded, pausedSnapshot: null };
    });
    return true;
  }, [locationZone, storageKey]);

  const toggleLive = useCallback(({ lots = [], refreshedAt = null } = {}) => {
    const timestamp = Date.now();
    const pausedSnapshot = copyPausedParkingSnapshot({ lots, refreshedAt });
    setNow(timestamp);
    setState((previous) => {
      if (previous.selection.mode === "live") {
        const selection = { ...liveParkingSelection(locationZone, timestamp), mode: "paused" };
        return { storageKey, selection, expanded: previous.expanded, pausedSnapshot: pausedSnapshot || { lots: [], refreshedAt: null } };
      }
      return { storageKey, selection: liveParkingSelection(locationZone, timestamp), expanded: previous.expanded, pausedSnapshot: null };
    });
  }, [locationZone, storageKey]);

  const calendar = useMemo(() => {
    const current = DateTime.fromMillis(now, { zone: locationZone });
    return { todayISO: current.toISODate(), maxDateISO: current.plus({ days: 6 }).toISODate() };
  }, [now, locationZone]);
  const selectedAt = selectionDateTime(state.selection);
  const displayMode = state.selection.mode === "live" ? "live"
    : state.selection.mode === "paused" ? "paused"
      : selectedAt && selectedAt.toMillis() > now ? "predicted" : "historical";

  return {
    selection: state.selection,
    expanded: state.expanded,
    setExpanded,
    select,
    toggleLive,
    pausedSnapshot: state.pausedSnapshot,
    ...calendar,
    displayMode,
  };
}
