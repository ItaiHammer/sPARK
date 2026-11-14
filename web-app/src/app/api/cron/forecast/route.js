import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getSupabase } from "@/lib/supabase/supabase.js";
import {
  errorHandler, errorCodes, successHandler,
} from "@/lib/helpers/responseHandler.js";
import { isWithinOpenWindow } from "@/lib/helpers/time.js";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import { loadForecastInputs, predictFlint } from "./forecasting-models/flint/index.js";
import { getModelVersion } from "./forecasting-models/mean_last_3_weeks/index.js";

export const runtime = "nodejs";

const ZONE = "America/Los_Angeles";
const INTERVAL = 30;
const meanLast3Weeks = getModelVersion();

// POST /api/cron/forecast. Optional date is the last Pacific date to generate.
export async function POST(req) {
  const cronKey = process.env.FORECASTING_API_KEY;
  if (!cronKey || req.headers.get("authorization") !== `Bearer ${cronKey}`) {
    return NextResponse.json(errorHandler("Unauthorized", errorCodes.UNAUTHORIZED), { status: 401 });
  }
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision.message, decision.code), {
      status: decision.status,
    });
  }

  const body = await req.json().catch(() => ({}));
  const location = String(body?.location_id || "all").toLowerCase();
  const issuedAt = DateTime.utc();
  const start = issuedAt.setZone(ZONE).startOf("day");
  const end = body?.date ? DateTime.fromISO(String(body.date), { zone: ZONE }).startOf("day")
    : start.plus({ days: 6 });
  if (!["all", "sjsu"].includes(location) || Number(body?.intervalMin ?? INTERVAL) !== INTERVAL ||
      !end.isValid || end < start || end >= start.plus({ days: 14 })) {
    return NextResponse.json(errorHandler(
      "Use SJSU, 30-minute slots, and a date from today through 13 days ahead.",
      errorCodes.ZOD_ERROR,
    ), { status: 400 });
  }

  try {
    const supabase = getSupabase();
    const { data: lots, error: lotError } = await supabase.from("lots")
      .select('lot_id,"24_hour",open_time,close_time').eq("location_id", "sjsu").order("lot_id");
    if (lotError) throw new Error(lotError.message);
    const slots = [];
    for (const lot of lots) {
      for (let day = start; day <= end; day = day.plus({ days: 1 })) {
        for (let time = day; time < day.plus({ days: 1 }); time = time.plus({ minutes: INTERVAL })) {
          if (isWithinOpenWindow(time, lot, ZONE)) {
            slots.push({ lot_id: lot.lot_id, target_time: time.toUTC().toISO() });
          }
        }
      }
    }
    const futureSlots = slots.filter(slot => DateTime.fromISO(slot.target_time) >= issuedAt);
    if (!futureSlots.length) return NextResponse.json(successHandler({ ok: true, slots: 0 }));

    const inputs = await loadForecastInputs(supabase, lots.map(lot => lot.lot_id), start, end, issuedAt);
    const predictions = await predictFlint({ ...inputs, slots, issuedAt: issuedAt.toISO() });
    const predictionsBySlot = new Map(slots.map((slot, i) => [slot, predictions[i]]));
    const reports = [];
    const baseline = [];
    const readingsByLot = Map.groupBy(inputs.readings, reading => reading.lot_id);
    const byLot = Map.groupBy(futureSlots, slot => slot.lot_id);
    for (const [lotId, lotSlots] of byLot) {
      const byDay = Map.groupBy(lotSlots, slot => DateTime.fromISO(slot.target_time).setZone(ZONE).toISODate());
      for (const [date, daySlots] of byDay) {
        const day = DateTime.fromISO(date, { zone: ZONE });
        const context = meanLast3Weeks.prepare({
          readings: readingsByLot.get(lotId) ?? [], tz: ZONE, intervalMin: INTERVAL, tomorrowStartTZ: day,
        });
        for (const slot of daySlots) {
          const row = { lot_id: lotId, generated_at: issuedAt.toISO(), forecast_ts: slot.target_time };
          reports.push({
            ...row, model_name: "flint", model_version: "v0.3", prediction_pct: predictionsBySlot.get(slot),
          });
          const tsLocal = DateTime.fromISO(slot.target_time, { zone: ZONE });
          const comparison = meanLast3Weeks.predict({ tsLocal, intervalMin: INTERVAL, context });
          if (comparison != null) {
            baseline.push({
              ...row, model_name: "mean_last_3_weeks", model_version: "v1", prediction_pct: comparison,
            });
          }
        }
      }
    }

    const { error } = await supabase.rpc("save_flint_forecasts", { p_flint: reports, p_baseline: baseline });
    if (error) throw new Error(error.message);
    return NextResponse.json(successHandler({
      ok: true, locations: 1, lots: lots.length, slots: reports.length,
      days_forecasted: end.diff(start, "days").days + 1,
      model: "flint", version: "v0.3", intervalMin: INTERVAL, comparison_slots: baseline.length,
    }));
  } catch (error) {
    console.error("Forecast generation failed", error);
    return NextResponse.json(errorHandler("Forecast generation failed", errorCodes.SERVER_ERROR), {
      status: 500,
    });
  }
}
