/*
    Forecast Point API

    Endpoint: GET /api/forecast/points

    Query parameters (required):
        location_id  (string) - location id (e.g. 'sjsu')
        time         (string) - UTC ISO datetime (required)

    Query parameters (optional):
        intervalMin  (number) - slot size in minutes (default: 30)

    Example URL:
        /api/forecast/points?location_id=sjsu&time=2025-11-14T00:30:00Z&intervalMin=30

    Headers:
        None (public read)

    Response:
    "error": null,
    "data": {
       
        "lots": [
            {
              ...lot information,
              "location_id": "sjsu",
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
            ...other lots...
        ],
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
import { getLocationData, getLotsData } from "@/lib/helpers/api.helpers.js";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import { getForecastPointsKey } from "@/lib/redis/redis.keys.js";
import { getCache, setCache } from "@/lib/redis/redis.js";

const DEFAULT_INTERVAL = 30;

export async function GET(req) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision?.message, decision?.code), {
      status: decision?.status,
    });
  }

  // Validation
  const url = new URL(req.url);
  const locationId = (url.searchParams.get("location_id") || "").toLowerCase();
  const time = url.searchParams.get("time") || "";
  const intervalMin = Number(
    url.searchParams.get("intervalMin") || DEFAULT_INTERVAL
  );

  if (!locationId || !time) {
    return NextResponse.json(
      errorHandler(
        new Error("location_id, time required"),
        errorCodes.ZOD_ERROR
      ),
      { status: 400 }
    );
  }

  // Check Cache
  const { key, interval } = getForecastPointsKey(locationId, time, intervalMin);
  const { error: cacheError, data: cacheData } = await getCache(key);
  if (cacheError) {
    return NextResponse.json(
      errorHandler(cacheError?.message, cacheError?.code),
      { status: 500 }
    );
  }
  if (cacheData) {
    return NextResponse.json(successHandler(JSON.parse(cacheData)), {
      status: 200,
    });
  }

  // Get Location Data
  const { error: locationError, data: locationData } = await getLocationData(
    locationId
  );
  if (locationError || !locationData) {
    return NextResponse.json(
      errorHandler(locationError?.message, locationError?.code),
      { status: 500 }
    );
  }

  // Get Lots
  const { error: lotsError, data: lotsData } = await getLotsData(locationId);
  if (lotsError || !lotsData) {
    return NextResponse.json(
      errorHandler(lotsError?.message, lotsError?.code),
      { status: 500 }
    );
  }

  // Calculate Forecast Points for all lots
  const results = [];
  for (const lot of lotsData) {
    const { error: forecastPointsError, data } = await calculateForecastPoints(
      locationId,
      lot.lot_id,
      time,
      intervalMin,
      locationData
    );
    if (forecastPointsError) {
      return NextResponse.json(
        errorHandler(forecastPointsError?.message, forecastPointsError?.code),
        { status: 500 }
      );
    }

    results.push({
      ...lot,
      ...data,
    });
  }

  // Cache Data
  const data = {
    lots: results,
  };

  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(data),
    interval
  );
  if (setCacheError) {
    return NextResponse.json(
      errorHandler(setCacheError?.message, setCacheError?.code),
      { status: 500 }
    );
  }

  return NextResponse.json(successHandler(data), { status: 200 });
}
