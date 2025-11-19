import { getLocationByID, getForecastPoints } from "@/lib/supabase/supabase";
import { errorCodes } from "@/lib/helpers/responseHandler";
import { DateTime } from "luxon";

function snap(dt, intervalMin, mode = "floor") {
  const mins = dt.hour * 60 + dt.minute;
  const k =
    mode === "ceil"
      ? Math.ceil(mins / intervalMin)
      : Math.floor(mins / intervalMin);
  const m2 = Math.max(0, k * intervalMin);
  return dt.set({
    hour: Math.floor(m2 / 60),
    minute: m2 % 60,
    second: 0,
    millisecond: 0,
  });
}

export const calculateForecastPoints = async (
  location_id,
  lot_id,
  dateStr,
  timeStr,
  intervalMin
) => {
  // timezone for location
  const { error: locErr, data: loc } = await getLocationByID(location_id);
  if (locErr || !loc) {
    return {
      error: {
        message: locErr || "location not found",
        code: errorCodes.LOCATION_NOT_FOUND,
        status: 404,
      },
      data: null,
    };
  }
  const tz = loc.timezone || "America/Los_Angeles";

  // local datetime to forecast for
  const baseDay =
    dateStr === "tomorrow"
      ? DateTime.utc().setZone(tz).plus({ days: 1 }).startOf("day")
      : DateTime.fromISO(`${dateStr}T00:00:00`, { zone: tz });

  const [hh, mm] = timeStr.split(":").map(Number);
  const tLocal = baseDay.set({
    hour: hh,
    minute: mm,
    second: 0,
    millisecond: 0,
  });

  // prev/next boundaries
  const prevLocal = snap(tLocal, intervalMin, "floor");
  let nextLocal = snap(tLocal, intervalMin, "ceil");
  if (nextLocal.equals(prevLocal))
    nextLocal = prevLocal.plus({ minutes: intervalMin });

  const prevUTC = prevLocal.toUTC().toISO();
  const nextUTC = nextLocal.toUTC().toISO();

  // fetch the two bordering rows
  const { error: fErr, data: rows } = await getForecastPoints(
    lot_id,
    prevUTC,
    nextUTC
  );
  if (fErr) {
    return {
      error: {
        message: fErr?.message,
        code: errorCodes.SUPABASE_ERROR,
        status: 500,
      },
      data: null,
    };
  }

  // --- robust mapping (compare times, not strings) ---
  const prevMs = prevLocal.toUTC().toMillis();
  const nextMs = nextLocal.toUTC().toMillis();

  let y0 = null,
    y1 = null;
  for (const r of rows || []) {
    const ms = DateTime.fromISO(r.forecast_ts, { zone: "utc" }).toMillis();
    if (ms === prevMs) y0 = Number(r.prediction_pct);
    else if (ms === nextMs) y1 = Number(r.prediction_pct);
  }

  // position between boundaries (0..1)
  const minsFromPrev = tLocal.diff(prevLocal, "minutes").minutes;
  const f = Math.max(0, Math.min(1, minsFromPrev / intervalMin));

  // interpolate
  let point = null;
  if (y0 == null && y1 == null) point = null;
  else if (y0 != null && y1 == null) point = y0;
  else if (y0 == null && y1 != null) point = y1;
  else point = y0 + (y1 - y0) * f;

  const data = {
    location_id,
    lot_id,
    tz,
    request_local_time: tLocal.toISO(),
    prev_boundary_local: prevLocal.toISO(),
    next_boundary_local: nextLocal.toISO(),
    interval_min: intervalMin,
    points: rows || [],
    f,
    point: point == null ? null : Math.max(0, Math.min(100, point)),
  };

  return {
    error: null,
    data,
  };
};
