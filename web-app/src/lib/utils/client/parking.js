import { DateTime } from "luxon";

export const PARKING_THRESHOLDS = Object.freeze({
  busy: 80,
  nearlyFull: 93,
  warning: 90,
  hourlyChange: 8,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const number = (value) =>
  value === null || value === undefined || value === "" || !Number.isFinite(Number(value))
    ? null
    : Number(value);

export function selectionDateTime(selection) {
  if (!selection?.dateISO || !Number.isInteger(selection.minutes) || selection.minutes < 0 || selection.minutes > 1439) return null;
  const day = DateTime.fromISO(selection.dateISO, {
    zone: selection.zone || "America/Los_Angeles",
  });
  if (!day.isValid || day.toISODate() !== selection.dateISO) return null;
  const selected = day.set({
    hour: Math.floor(selection.minutes / 60),
    minute: selection.minutes % 60,
    second: 0,
    millisecond: 0,
  });
  // A local time skipped by daylight saving must not silently select another time.
  return selected.hour * 60 + selected.minute === selection.minutes ? selected : null;
}

export function parkingStatus(occupied, closed = false) {
  if (closed) return { label: "Closed", tone: "full" };
  if (occupied === null || !Number.isFinite(occupied)) return { label: "Unavailable", tone: "unknown" };
  if (occupied >= PARKING_THRESHOLDS.nearlyFull) return { label: "Nearly full", tone: "full" };
  if (occupied >= PARKING_THRESHOLDS.busy) return { label: "Busy", tone: "busy" };
  return { label: "Available", tone: "available" };
}

// Opening hours are recurring wall-clock business hours. Keep the clock portion
// of Postgres timetz; its stored UTC offset is not a date-specific DST rule.
function clockMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/.exec(String(value || ""));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clockLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const minutePart = minutes % 60;
  return `${hours % 12 || 12}${minutePart ? `:${String(minutePart).padStart(2, "0")}` : ""} ${hours < 12 ? "AM" : "PM"}`;
}

export function operatingHours(lot, selectedAt) {
  if (lot?.["24_hour"] === true) return { known: true, closed: false, label: "Open 24h", closesIn: null };
  const opens = clockMinutes(lot?.open_time);
  const closes = clockMinutes(lot?.close_time);
  if (opens === null || closes === null || !selectedAt?.isValid) {
    return { known: false, closed: false, label: "Hours unavailable", closesIn: null };
  }
  const minutes = selectedAt.hour * 60 + selectedAt.minute;
  const closed = closes > opens
    ? minutes < opens || minutes >= closes
    : closes < opens ? minutes >= closes && minutes < opens : true;
  return {
    known: true,
    closed,
    label: opens === closes ? "Closed today" : `${clockLabel(opens)}–${clockLabel(closes)}`,
    opensAt: opens === closes ? null : clockLabel(opens),
    closesIn: closed ? null : (closes - minutes + 1440) % 1440,
  };
}

export function parkingValues(percentage, capacity) {
  const pct = number(percentage);
  const total = number(capacity);
  if (pct === null) return { occupied: null, spaces: null };
  const bounded = clamp(pct, 0, 100);
  const spaces = total !== null && total > 0
    ? Math.max(0, Math.floor((100 - bounded) * total / 100))
    : null;
  const occupied = spaces !== null
    ? Math.min(spaces === 0 ? 100 : 99, Math.round(bounded))
    : Math.round(bounded);
  return { occupied, spaces };
}

export function indexForecastRows(dayData = []) {
  const byLot = new Map();
  for (const day of dayData) {
    for (const lot of day?.lots || []) {
      const points = byLot.get(lot.lot_id) || new Map();
      for (const point of lot.forecasted_data || []) {
        const timestamp = DateTime.fromISO(point.forecast_ts, { setZone: true }).toMillis();
        const occupied = number(point.prediction_pct);
        if (Number.isFinite(timestamp) && occupied !== null) {
          points.set(timestamp, { timestamp, occupied: clamp(occupied, 0, 100) });
        }
      }
      byLot.set(lot.lot_id, points);
    }
  }
  return new Map(Array.from(byLot, ([id, points]) => [
    id, Array.from(points.values()).sort((a, b) => a.timestamp - b.timestamp),
  ]));
}

// Interpolate only between real adjacent half-hour points. A missing interval
// remains unknown rather than becoming a synthetic zero or a flat projection.
export function forecastAt(rows, timestamp) {
  if (!rows?.length || !Number.isFinite(timestamp)) return null;
  let previous = null;
  for (const point of rows) {
    if (point.timestamp === timestamp) return point.occupied;
    if (point.timestamp > timestamp) {
      if (!previous || point.timestamp - previous.timestamp > 30 * 60 * 1000) return null;
      const fraction = (timestamp - previous.timestamp) / (point.timestamp - previous.timestamp);
      return previous.occupied + (point.occupied - previous.occupied) * fraction;
    }
    previous = point;
  }
  return null;
}

// The bulk API returns UTC calendar days. Cover the whole selected local day,
// plus alert/interpolation lookahead, so moving the ruler never changes keys.
export function forecastDayDates(selectedAt, lookaheadMinutes = 270) {
  if (!selectedAt?.isValid) return [];
  const start = selectedAt.startOf("day");
  const end = start.plus({ days: 1, minutes: lookaheadMinutes }).toUTC();
  const dates = [];
  for (let day = start.toUTC().startOf("day"); day <= end; day = day.plus({ days: 1 })) {
    dates.push(day.toISODate());
  }
  return dates;
}

export function forecastOccupancyLots(metadataLots = [], forecastByLot = new Map(), selectedAt) {
  const timestamp = selectedAt?.toMillis();
  return metadataLots.map((lot) => ({
    ...lot,
    point: forecastAt(forecastByLot.get(lot.lot_id), timestamp),
  }));
}

const durationLabel = (minutes) => minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m`;
const alert = (text, type) => ({ text, type });
const statusBucket = (occupied) => occupied >= PARKING_THRESHOLDS.nearlyFull
  ? "full" : occupied >= PARKING_THRESHOLDS.busy ? "busy" : "available";

export function parkingAlert({ lot, occupied, spaces, selectedAt, forecastRows = [], mode = "live" }) {
  const hours = operatingHours(lot, selectedAt);
  if (hours.closed) return hours.opensAt ? alert(`Opens at ${hours.opensAt}`, "opening") : alert("Closed today", "closing");
  if (hours.closesIn !== null && hours.closesIn <= 60) return alert(`Closes in ${durationLabel(hours.closesIn)}`, "closing");
  if (occupied === null || !selectedAt?.isValid) {
    return alert(mode === "live" ? "Availability unavailable" : "Forecast unavailable", "unknown");
  }
  const future = (ahead) => {
    const time = selectedAt.plus({ minutes: ahead });
    if (operatingHours(lot, time).closed) return null;
    const pct = forecastAt(forecastRows, time.toMillis());
    return pct === null ? null : parkingValues(pct, lot.spot_count);
  };
  const currentStatus = statusBucket(occupied);
  for (let ahead = 15; ahead <= 240; ahead += 15) {
    const value = future(ahead);
    if (!value) break;
    const nextStatus = statusBucket(value.occupied);
    if (nextStatus === currentStatus) continue;
    if (nextStatus === "full") return alert(`Full in ${durationLabel(ahead)}`, "fullSoon");
    if (nextStatus === "busy") return alert(`Busy in ${durationLabel(ahead)}`, "busySoon");
    return alert(`Available in ${durationLabel(ahead)}`, "recovery");
  }
  const inAnHour = future(60);
  if (spaces !== null && inAnHour?.spaces !== null && inAnHour?.spaces !== undefined) {
    if (inAnHour.occupied <= occupied - PARKING_THRESHOLDS.hourlyChange) {
      return alert(`~${(inAnHour.spaces - spaces).toLocaleString("en-US")} more spaces in 1h`, "moreSpaces");
    }
    if (inAnHour.occupied >= occupied + PARKING_THRESHOLDS.hourlyChange) {
      return alert(`~${(spaces - inAnHour.spaces).toLocaleString("en-US")} fewer spaces in 1h`, "fewerSpaces");
    }
  }
  if (occupied >= PARKING_THRESHOLDS.warning) return alert("Parking likely limited", "limited");
  let comfortable = hours.known && occupied < PARKING_THRESHOLDS.busy;
  for (let ahead = 15; comfortable && ahead <= 120; ahead += 15) {
    const value = future(ahead);
    comfortable = Boolean(value) && value.occupied < PARKING_THRESHOLDS.busy;
  }
  if (comfortable) return alert("Spaces expected for 2h", "roomy");
  return occupied < PARKING_THRESHOLDS.busy
    ? alert("Spaces available", "available")
    : alert("Parking is busy", "busySoon");
}

export function latestObservation(lots = []) {
  let latest = null;
  for (const lot of lots) {
    const timestamp = DateTime.fromISO(lot.scraped_at || "", { setZone: true });
    if (timestamp.isValid && (!latest || timestamp.toMillis() > latest.toMillis())) latest = timestamp;
  }
  return latest?.toISO() || null;
}

export function travelForLot(lotId, buildingData) {
  const route = buildingData?.lots?.find((item) => item.lot_id === lotId);
  const meters = number(route?.distance);
  const seconds = number(route?.duration);
  if (meters === null || seconds === null || meters < 0 || seconds < 0) return null;
  return {
    meters,
    seconds,
    minutes: Math.max(1, Math.round(seconds / 60)),
    miles: Number((meters / 1609.344).toFixed(2)),
    buildingAbbreviation: buildingData.building?.abbreviation || buildingData.building?.name || "building",
  };
}

export function normalizeParkingLots({ metadataLots = [], occupancyLots = [], selection, forecastByLot = new Map(), buildingData }) {
  const observed = new Map(occupancyLots.map((lot) => [lot.lot_id, lot]));
  const metadata = new Map(metadataLots.map((lot) => [lot.lot_id, lot]));
  const selectedAt = selectionDateTime(selection);
  return Array.from(new Set([...metadata.keys(), ...observed.keys()]), (id) => {
    const observation = observed.get(id);
    const lot = { ...metadata.get(id), ...observation };
    const percentage = selection?.mode === "live" ? observation?.occupancy_pct : observation?.point;
    const values = parkingValues(percentage, lot.spot_count);
    const hours = operatingHours(lot, selectedAt);
    const status = parkingStatus(values.occupied, hours.closed);
    const indicator = parkingAlert({ lot, ...values, selectedAt, forecastRows: forecastByLot.get(id), mode: selection?.mode });
    return {
      ...lot,
      id,
      lot_id: id,
      capacity: number(lot.spot_count),
      ...values,
      closed: hours.closed,
      hours: hours.label,
      hoursLabel: hours.label,
      status: status.label,
      statusTone: status.tone,
      alert: indicator,
      indicator,
      travel: travelForLot(id, buildingData),
    };
  });
}
