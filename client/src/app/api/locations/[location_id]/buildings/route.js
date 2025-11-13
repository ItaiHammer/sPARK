import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import { getBuildings } from "@/lib/supabase/supabase";
import { getBuildingsKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";

export async function GET(req, { params }) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision?.message, decision?.code), {
      status: decision?.status,
    });
  }

  // Validate Request Parameters
  const reqParams = await params;
  const { error: paramValidationError, data: validatedParams } = validateRoute(
    reqParams,
    locationIDSchema
  );
  if (paramValidationError || !validatedParams) {
    return NextResponse.json(
      errorHandler(paramValidationError?.message, paramValidationError?.code),
      {
        status: 400,
      }
    );
  }
  const { location_id } = validatedParams;
  const formattedLocationId = location_id.toLowerCase();

  // Checking Cache
  const { key, interval } = getBuildingsKey(formattedLocationId);
  const { error: getCacheError, data: cachedData } = await getCache(key);
  if (getCacheError) {
    return NextResponse.json(
      errorHandler(getCacheError?.message, getCacheError?.code),
      {
        status: getCacheError?.status,
      }
    );
  }

  if (cachedData) {
    return NextResponse.json(successHandler(JSON.parse(cachedData)));
  }

  // Getting Building Data
  const { error: getBuildingsDataError, data } = await getBuildings(
    formattedLocationId
  );
  if (getBuildingsDataError) {
    return NextResponse.json(
      errorHandler(getBuildingsDataError?.message, getBuildingsDataError?.code),
      {
        status: getBuildingsDataError?.status,
      }
    );
  }

  // Caching Data
  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(data),
    interval
  );
  if (setCacheError) {
    return NextResponse.json(
      errorHandler(setCacheError?.message, setCacheError?.code),
      {
        status: setCacheError?.status,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
