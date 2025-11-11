import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { getLocationByID } from "@/lib/supabase/supabase";
import { getLocationKey } from "@/lib/redis/redis.keys";
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
  const { error: getLocationByIDError, data } = await getLocationByID(
    formattedLocationId
  );
  if (getLocationByIDError) {
    return NextResponse.json(
      errorHandler(getLocationByIDError.message, getLocationByIDError.code),
      {
        status: 500,
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
