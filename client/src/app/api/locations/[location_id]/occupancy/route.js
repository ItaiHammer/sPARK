import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { getLatestLotOccupancy } from "@/lib/supabase/supabase";
import { getOccupancyKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import { decisionHandler } from "@/lib/arcjet/arcjet";

export async function GET(req, { params }) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision.message, decision.code), {
      status: decision.status,
    });
  }

  // Validate Request Parameters
  const reqParams = await params;
  const { data: validatedData, error: validationError } = validateRoute(
    reqParams,
    locationIDSchema
  );
  if (validationError || !validatedData) {
    return NextResponse.json(
      errorHandler(validationError.message, validationError.code),
      {
        status: 400,
      }
    );
  }
  const { location_id } = validatedData;
  const formattedLocationId = location_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getOccupancyKey(formattedLocationId);
  const { error: getCacheError, data: cachedData } = await getCache(key);
  if (getCacheError) {
    return NextResponse.json(
      errorHandler(getCacheError.message, getCacheError.code),
      {
        status: 500,
      }
    );
  }

  if (cachedData) {
    return NextResponse.json(successHandler(JSON.parse(cachedData)));
  }

  // Fetch Occupancy Data
  const { error: getLatestLotOccupancyError, data } =
    await getLatestLotOccupancy(formattedLocationId);
  if (getLatestLotOccupancyError) {
    return NextResponse.json(
      errorHandler(
        getLatestLotOccupancyError.message,
        getLatestLotOccupancyError.code
      ),
      {
        status: 500,
      }
    );
  }

  // Cache Data
  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(data),
    interval
  );
  if (setCacheError) {
    return NextResponse.json(
      errorHandler(setCacheError.message, setCacheError.code),
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
