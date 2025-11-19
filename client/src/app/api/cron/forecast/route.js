/*
    Cron Forecast API

    Endpoint: POST /api/cron/forecast

    Required header:
        Authorization: Bearer <API_KEY>
    Content-Type: application/json

    Body (JSON) fields:
        location_id  (string, optional) - 'all' (default) or single location id
        intervalMin  (number, optional) - interval in minutes (default: 30)
        model        (string, optional) - 'mean_last_3_weeks' (default) or 'last_week_same_time'
        modelVersion (string, optional) - e.g. 'v1' (default)
        date         (string, optional) - ISO date YYYY-MM-DD or full ISO; when omitted
                                     the route forecasts from TODAY (local) through 7 days (inclusive)
        Example body:
            {
                "location_id": "all",
                "intervalMin": 30,
                "model": "mean_last_3_weeks",
                "modelVersion": "v1",
                "date": "2025-11-20"
            }

    Response:
        {
            "error": null,
            "data": {
                "ok": true,
                "locations": 1,
                "lots": 4,
                "slots": 174,
                "days_forecasted": 4,
                "model": "mean_last_3_weeks",
                "version": "v1",
                "intervalMin": 30
            }
        }

*/
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { supabase } from '@/lib/supabase/supabase.js';
import {
    authValidator,
    errorHandler,
    errorCodes,
    successHandler,
} from '@/lib/helpers/responseHandler.js';
import { tomorrowRangeTZ, isWithinOpenWindow } from '@/lib/helpers/time.js';
import { getModelVersion as getLastWeekSameTimeModelVersion } from './forecasting-models/last_week_same_time/index.js';
import { getModelVersion as getMeanLast3WeeksModelVersion } from './forecasting-models/mean_last_3_weeks/index.js';

const DEFAULT_INTERVAL = 30;
const DEFAULT_MODEL = 'mean_last_3_weeks';
const DEFAULT_VERSION = 'v1';

function getModel(name, version) {
    if (name === 'last_week_same_time')
        return getLastWeekSameTimeModelVersion(version);
    if (name === 'mean_last_3_weeks')
        return getMeanLast3WeeksModelVersion(version);
    throw new Error(`Unknown model: ${name}`);
}

export async function POST(req) {
    const authErr = authValidator(req);
    if (authErr)
        return NextResponse.json(
            errorHandler(new Error(authErr.message), authErr.code),
            { status: 401 }
        );

    // parse request body
    const body = await req.json().catch(() => ({}));
    const locationFilter = String(body.location_id || 'all').toLowerCase();
    const intervalMin = Number(body.intervalMin || DEFAULT_INTERVAL);
    const modelName = String(body.model || DEFAULT_MODEL);
    const modelVersion = String(body.modelVersion || DEFAULT_VERSION);
    // optional ISO date string; when omitted we forecast from today through 7 days
    const targetDateInput = body.date ? String(body.date) : null;
    const MAX_DAYS = 14; // safety cap

    let model;
    try {
        model = getModel(modelName, modelVersion);
    } catch (e) {
        return NextResponse.json(errorHandler(e, errorCodes.ZOD_ERROR), {
            status: 400,
        });
    }

    let locQ = supabase
        .from('locations')
        .select('location_id, timezone')
        .order('location_id');
    if (locationFilter !== 'all') locQ = locQ.eq('location_id', locationFilter);
    const { data: locations, error: locErr } = await locQ;
    if (locErr)
        return NextResponse.json(
            errorHandler(locErr, errorCodes.SUPABASE_ERROR),
            { status: 500 }
        );
    if (!locations?.length)
        return NextResponse.json(
            successHandler({ ok: true, message: 'no locations found' }),
            { status: 200 }
        );

    const generated_at = DateTime.utc().toISO();
    let totalLots = 0;
    let totalSlots = 0;
    let totalDaysForecasted = 0;

    for (const loc of locations) {
        const tz = loc.timezone || 'America/Los_Angeles';

        // compute local start (today) and target day for this location
        const defaultStartTZ = DateTime.utc().setZone(tz).startOf('day');
        let targetDayTZ = null;
        if (targetDateInput) {
            const parsed = DateTime.fromISO(targetDateInput, { zone: tz });
            if (!parsed.isValid)
                return NextResponse.json(
                    errorHandler(
                        new Error('Invalid date input'),
                        errorCodes.ZOD_ERROR
                    ),
                    { status: 400 }
                );
            targetDayTZ = parsed.startOf('day');
        } else {
            // default: inclusive 7-day window starting today
            targetDayTZ = DateTime.utc()
                .setZone(tz)
                .plus({ days: 6 })
                .startOf('day');
        }

        // iterate from startDayTZ up to targetDayTZ (inclusive)
        let startDayTZ = defaultStartTZ;
        if (targetDayTZ < startDayTZ) startDayTZ = targetDayTZ;

        const daysSpan =
            Math.floor(targetDayTZ.diff(startDayTZ, 'days').days) + 1;
        if (daysSpan > MAX_DAYS)
            return NextResponse.json(
                errorHandler(
                    new Error(`date range too large (max ${MAX_DAYS} days)`),
                    errorCodes.ZOD_ERROR
                ),
                { status: 400 }
            );

        const { data: lots, error: lotsErr } = await supabase
            .from('lots')
            .select(`lot_id, name, "24_hour", open_time, close_time`)
            .eq('location_id', loc.location_id)
            .order('name');
        if (lotsErr)
            return NextResponse.json(
                errorHandler(lotsErr, errorCodes.SUPABASE_ERROR),
                { status: 500 }
            );
        if (!lots?.length) continue;

        totalLots += lots.length;
        for (const lot of lots) {
            // iterate each calendar day in the range for this lot
            for (
                let day = startDayTZ;
                day <= targetDayTZ;
                day = day.plus({ days: 1 })
            ) {
                const startTZ = day.startOf('day');
                const endTZ = day.endOf('day');
                const dayStartUTC = startTZ.toUTC().toISO();
                const dayEndUTC = endTZ.toUTC().toISO();

                // skip this day if forecasts already exist for the lot
                const {
                    data: existing,
                    count,
                    error: cntErr,
                } = await supabase
                    .from('forecasts')
                    .select('forecast_ts', { count: 'exact', head: true })
                    .eq('lot_id', lot.lot_id)
                    .gte('forecast_ts', dayStartUTC)
                    .lt('forecast_ts', dayEndUTC);
                if (cntErr)
                    return NextResponse.json(
                        errorHandler(cntErr, errorCodes.SUPABASE_ERROR),
                        { status: 500 }
                    );

                // If any forecasts exist for this day, skip forecasting it
                if (typeof count === 'number' && count > 0) continue;

                // prepare model context for this day/lot (optional)
                const context = model.prepare
                    ? await model.prepare({
                          supabase,
                          lot,
                          tz,
                          intervalMin,
                          tomorrowStartTZ: startTZ,
                      })
                    : null;

                // build list of time slots for this day that are within open hours
                const slots = [];
                for (
                    let t = startTZ;
                    t < endTZ;
                    t = t.plus({ minutes: intervalMin })
                ) {
                    if (isWithinOpenWindow(t, lot, tz)) slots.push(t.toUTC());
                }

                const rows = [];
                for (const tsUTC of slots) {
                    const tsLocal = tsUTC.setZone(tz);
                    let prediction = 0;

                    try {
                        prediction = await model.predict({
                            supabase,
                            lot,
                            tsLocal,
                            tz,
                            intervalMin,
                            context,
                        });
                    } catch {
                        continue; // skip slot on model error
                    }

                    // skip missing/non-finite predictions to avoid bias
                    if (prediction == null || !Number.isFinite(prediction))
                        continue;

                    rows.push({
                        lot_id: lot.lot_id,
                        model_name: modelName,
                        model_version: modelVersion,
                        generated_at,
                        forecast_ts: tsUTC.toISO(),
                        prediction_pct: Math.max(0, Math.min(100, prediction)),
                    });
                }

                // safe delete then insert (delete mostly no-op since we checked existence)
                await supabase
                    .from('forecasts')
                    .delete()
                    .eq('lot_id', lot.lot_id)
                    .gte('forecast_ts', dayStartUTC)
                    .lt('forecast_ts', dayEndUTC);

                if (rows.length) await supabase.from('forecasts').insert(rows);
                totalSlots += rows.length;
                totalDaysForecasted += 1;
            }
        }
    }

    return NextResponse.json(
        successHandler({
            ok: true,
            locations: locations.length,
            lots: totalLots,
            slots: totalSlots,
            days_forecasted: totalDaysForecasted,
            model: modelName,
            version: modelVersion,
            intervalMin,
        }),
        { status: 200 }
    );
}
