/*
    Forecast Point API

    Endpoint: GET /api/forecast/point

    Query parameters (required):
        location_id  (string) - location id (e.g. 'sjsu')
        lot_id       (string) - lot id
        time         (string) - UTC ISO datetime (required)

    Query parameters (optional):
        intervalMin  (number) - slot size in minutes (default: 30)

    Example URL:
        /api/forecast/point?location_id=sjsu&lot_id=lot123&time=2025-11-14T00:30:00Z&intervalMin=30

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
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  successHandler,
  errorHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler.js";
import { calculateForecastPoints } from "@/lib/helpers/forecast.helpers.js";

const DEFAULT_INTERVAL = 30;

export async function GET(req) {
  const url = new URL(req.url);
  const locationId = (url.searchParams.get("location_id") || "").toLowerCase();
  const lotId = url.searchParams.get("lot_id") || "";
  const time = url.searchParams.get("time") || "";
  const intervalMin = Number(
    url.searchParams.get("intervalMin") || DEFAULT_INTERVAL
  );

  if (!locationId || !lotId || !time) {
    return NextResponse.json(
      errorHandler(
        new Error("location_id, lot_id, time required"),
        errorCodes.ZOD_ERROR
      ),
      { status: 400 }
    );
  }

  const { error: forecastPointsError, data } = await calculateForecastPoints(
    locationId,
    lotId,
    time,
    intervalMin
  );
  if (forecastPointsError) {
    return NextResponse.json(
      errorHandler(forecastPointsError?.message, forecastPointsError?.code),
      { status: 500 }
    );
  }

  return NextResponse.json(successHandler(data), { status: 200 });
}
