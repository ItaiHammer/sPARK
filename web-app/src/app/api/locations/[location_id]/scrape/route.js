import { NextResponse } from "next/server";
import {
  errorCodes,
  errorHandler,
  successHandler,
  authValidator,
} from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { insertLotOccupancy } from "@/lib/supabase/supabase";
import { getLocationData } from "@/lib/helpers/api.helpers";
import { fetchParkingOccupancy } from "@/lib/helpers/scraper";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import { clearCache } from "@/lib/redis/redis";
import { getOccupancyKey } from "@/lib/redis/redis.keys";

export async function GET(req, { params }) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision?.message, decision?.code), {
      status: decision?.status,
    });
  }

  // Validate API Key
  const authError = authValidator(req, process.env.SCRAPING_API_KEY);
  if (authError) {
    return NextResponse.json(
      errorHandler(authError?.message, authError?.code),
      {
        status: 401,
      }
    );
  }

  // Validate Request Parameters
  const reqParams = await params;
  const { data: validatedData, error: validationError } = validateRoute(
    reqParams,
    locationIDSchema
  );
  if (validationError || !validatedData) {
    return NextResponse.json(
      errorHandler(validationError?.message, validationError?.code),
      {
        status: 400,
      }
    );
  }
  const { location_id } = validatedData;

  // Fetch Location Data
  const { error: getLocationDataError, data: locationData } =
    await getLocationData(location_id);
  if (getLocationDataError) {
    return NextResponse.json(
      errorHandler(getLocationDataError?.message, getLocationDataError?.code),
      {
        status: getLocationDataError?.status,
      }
    );
  }

  let data;
  try {
    data = await fetchParkingOccupancy(locationData.scraping_url, location_id.toLowerCase(), process.env.SCRAPER_USER_AGENT);
  } catch (error) {
    console.error("Parking occupancy refresh failed", {
      locationId: location_id,
      code: error.code ?? "invalid-parking-feed",
      upstreamStatus: error.response?.status,
    });
    return NextResponse.json(
      errorHandler("The parking source could not be read.", errorCodes.SERVER_ERROR),
      { status: 502 }
    );
  }

  // Insert data to supabase
  const { error: insertLotOccupancyError } = await insertLotOccupancy(data);
  if (insertLotOccupancyError) {
    return NextResponse.json(
      errorHandler(
        insertLotOccupancyError?.message,
        insertLotOccupancyError?.code
      ),
      {
        status: 500,
      }
    );
  }

  // Clear Cache
  const { key } = getOccupancyKey(location_id.toLowerCase());
  const { error: clearCacheError } = await clearCache(key);
  if (clearCacheError) {
    return NextResponse.json(
      errorHandler(clearCacheError?.message, clearCacheError?.code),
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
