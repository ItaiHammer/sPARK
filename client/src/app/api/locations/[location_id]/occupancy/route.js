import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { supabase } from "@/lib/supabase/supabase";
import { getOccupancyKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";

export async function GET(req, { params }) {
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
  const { data, error } = await supabase.rpc("get_latest_lot_occupancy", {
    p_location_id: formattedLocationId,
  });
  if (error) {
    return NextResponse.json(
      errorHandler(error.message, errorCodes.SUPABASE_ERROR),
      {
        status: 500,
      }
    );
  }

  if (!data) {
    return NextResponse.json(
      errorHandler(
        "No occupancy data found for this location: " + formattedLocationId,
        errorCodes.OCCUPANCY_NOT_FOUND
      ),
      {
        status: 404,
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
