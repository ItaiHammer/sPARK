import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { supabase } from "@/lib/supabase/supabase";
import { getLotsKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";

export async function GET(req, { params }) {
  // Validate Request Parameters
  const reqParams = await params;
  const { location_id } = validateRoute(reqParams, locationIDSchema);
  const formattedLocationId = location_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getLotsKey(formattedLocationId);
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

  // Fetch Lots Data
  const { data, error } = await supabase
    .from("lots")
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

  if (!data || data.length === 0) {
    return NextResponse.json(
      errorHandler("No garages found", errorCodes.GARAGES_NOT_FOUND),
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
