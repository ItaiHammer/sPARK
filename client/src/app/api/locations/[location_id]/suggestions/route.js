import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import {
  validateRoute,
  userLocationSchema,
  locationIDSchema,
} from "@/lib/helpers/validator";
import { getLotsKey, getSuggestionsKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import { getCoordinates } from "@/lib/opencage/opencage";
import {
  calculateMatrix,
  transportationTypes,
} from "@/lib/openroute/openroute";
import { getLots } from "@/lib/supabase/supabase";
import {
  convertToHours,
  convertToKM,
  convertToMinutes,
  convertToMiles,
  roundToTwoDecimalPlaces,
} from "@/lib/utils";

export async function POST(req, { params }) {
  // Validate Request Parameters
  const reqParams = await params;
  const { error: locationIDValidationError, data: validatedLocationID } =
    validateRoute(reqParams, locationIDSchema);
  if (locationIDValidationError || !validatedLocationID) {
    return NextResponse.json(
      errorHandler(
        locationIDValidationError.message,
        locationIDValidationError.code
      ),
      {
        status: 400,
      }
    );
  }
  const { location_id } = validatedLocationID;
  const formattedLocationID = location_id.toLowerCase();

  return NextResponse.json(successHandler(data));
}
