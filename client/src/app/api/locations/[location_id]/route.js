import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { supabase } from "@/lib/supabase/supabase";
import { getLocationKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";

export async function GET(req, { params }) {
  // Validate Request Parameters
  const reqParams = await params;
  const { location_id } = validateRoute(reqParams, locationIDSchema);
  const formattedLocationId = location_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getLocationKey(formattedLocationId);
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

  // Fetch Location Data
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("location_id", formattedLocationId);

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
      errorHandler("No location found", errorCodes.LOCATION_NOT_FOUND),
      {
        status: 404,
      }
    );
  }

  // Cache Data
  const locationData = data[0];
  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(locationData),
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

  return NextResponse.json(successHandler(locationData));
}
