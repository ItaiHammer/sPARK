/*
    Forecast Point API

    Endpoint: GET /api/forecast/point

    Query parameters (required):
        location_id  (string) - location id (e.g. 'sjsu')
        lot_id       (string) - lot id
        time         (string) - local time 'HH:MM' to sample/interpolate (required)

    Query parameters (optional):
        date         (string) - 'tomorrow' (default) or ISO date YYYY-MM-DD
        intervalMin  (number) - slot size in minutes (default: 30)

    Example URL:
        /api/forecast/point?location_id=sjsu&lot_id=lot123&time=14:30&date=2025-11-20&intervalMin=30

    Headers:
        None (public read)

    Response:
    "error": null,
    "data": {
        "location_id": "sjsu",
        "lot_id": "sjsu-west-garage",
        "tz": "America/Los_Angeles",
        "request_local_time": "2025-11-23T09:48:00.000-08:00",
        "prev_boundary_local": "2025-11-23T09:30:00.000-08:00",
        "next_boundary_local": "2025-11-23T10:00:00.000-08:00",
        "interval_min": 30,
        "points": [
            {
                "forecast_ts": "2025-11-23T17:30:00+00:00",
                "prediction_pct": 9.333333333333334
            },
            {
                "forecast_ts": "2025-11-23T18:00:00+00:00",
                "prediction_pct": 9.333333333333334
            }
        ],
        "f": 0.6,
        "point": 9.333333333333334
    }
}

*/
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { supabase } from '@/lib/supabase/supabase.js';
import {
    successHandler,
    errorHandler,
    errorCodes,
} from '@/lib/helpers/responseHandler.js';

const DEFAULT_INTERVAL = 30;

function snap(dt, intervalMin, mode = 'floor') {
    const mins = dt.hour * 60 + dt.minute;
    const k =
        mode === 'ceil'
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

export async function GET(req) {
    const url = new URL(req.url);
    const locationId = (
        url.searchParams.get('location_id') || ''
    ).toLowerCase();
    const lotId = url.searchParams.get('lot_id') || '';
    const timeStr = url.searchParams.get('time') || '';
    const dateStr = url.searchParams.get('date') || 'tomorrow';
    const intervalMin = Number(
        url.searchParams.get('intervalMin') || DEFAULT_INTERVAL
    );

    if (!locationId || !lotId || !timeStr) {
        return NextResponse.json(
            errorHandler(
                new Error('location_id, lot_id, time required'),
                errorCodes.ZOD_ERROR
            ),
            { status: 400 }
        );
    }

    // timezone for location
    const { data: loc, error: locErr } = await supabase
        .from('locations')
        .select('timezone')
        .eq('location_id', locationId)
        .single();

    if (locErr || !loc) {
        return NextResponse.json(
            errorHandler(
                locErr || new Error('location not found'),
                errorCodes.SUPABASE_ERROR
            ),
            { status: 404 }
        );
    }
    const tz = loc.timezone || 'America/Los_Angeles';

    // local datetime to forecast for
    const baseDay =
        dateStr === 'tomorrow'
            ? DateTime.utc().setZone(tz).plus({ days: 1 }).startOf('day')
            : DateTime.fromISO(`${dateStr}T00:00:00`, { zone: tz });

    const [hh, mm] = timeStr.split(':').map(Number);
    const tLocal = baseDay.set({
        hour: hh,
        minute: mm,
        second: 0,
        millisecond: 0,
    });

    // prev/next boundaries
    const prevLocal = snap(tLocal, intervalMin, 'floor');
    let nextLocal = snap(tLocal, intervalMin, 'ceil');
    if (nextLocal.equals(prevLocal))
        nextLocal = prevLocal.plus({ minutes: intervalMin });

    const prevUTC = prevLocal.toUTC().toISO();
    const nextUTC = nextLocal.toUTC().toISO();

    // fetch the two bordering rows
    const { data: rows, error: fErr } = await supabase
        .from('forecasts')
        .select('forecast_ts, prediction_pct')
        .eq('lot_id', lotId)
        .in('forecast_ts', [prevUTC, nextUTC])
        .order('forecast_ts', { ascending: true });

    if (fErr) {
        return NextResponse.json(
            errorHandler(fErr, errorCodes.SUPABASE_ERROR),
            { status: 500 }
        );
    }

    // --- robust mapping (compare times, not strings) ---
    const prevMs = prevLocal.toUTC().toMillis();
    const nextMs = nextLocal.toUTC().toMillis();

    let y0 = null,
        y1 = null;
    for (const r of rows || []) {
        const ms = DateTime.fromISO(r.forecast_ts, { zone: 'utc' }).toMillis();
        if (ms === prevMs) y0 = Number(r.prediction_pct);
        else if (ms === nextMs) y1 = Number(r.prediction_pct);
    }

    // position between boundaries (0..1)
    const minsFromPrev = tLocal.diff(prevLocal, 'minutes').minutes;
    const f = Math.max(0, Math.min(1, minsFromPrev / intervalMin));

    // interpolate
    let point = null;
    if (y0 == null && y1 == null) point = null;
    else if (y0 != null && y1 == null) point = y0;
    else if (y0 == null && y1 != null) point = y1;
    else point = y0 + (y1 - y0) * f;

    return NextResponse.json(
        successHandler({
            location_id: locationId,
            lot_id: lotId,
            tz,
            request_local_time: tLocal.toISO(),
            prev_boundary_local: prevLocal.toISO(),
            next_boundary_local: nextLocal.toISO(),
            interval_min: intervalMin,
            points: rows || [],
            f,
            point: point == null ? null : Math.max(0, Math.min(100, point)),
        }),
        { status: 200 }
    );
}
