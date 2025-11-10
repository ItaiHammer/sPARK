import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import { validateRoute, userLocationSchema } from "@/lib/helpers/validator";
import { supabase } from "@/lib/supabase/supabase";
import { getLocationKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import { getCoordinates } from "@/lib/opencage/opencage";

export async function POST(req) {
  // Validate Request Parameters
  const body = await req.json();
  const { data: validatedData, error: validationError } = validateRoute(
    body,
    userLocationSchema
  );
  if (validationError || !validatedData) {
    return NextResponse.json(
      errorHandler(validationError.message, validationError.code),
      {
        status: 400,
      }
    );
  }

  // Get Coordinates from Opencage
  const { address } = validatedData;
  const { error: opencageError, data: opencageData } = await getCoordinates(
    address
  );
  if (opencageError) {
    return NextResponse.json(
      errorHandler(opencageError.message, opencageError.code),
      {
        status: 400,
      }
    );
  }
  const { lat: userLatitude, lng: userLongitude } = opencageData;

  // Get Parking Lot Locations (Latitude and Longitude)

  // Calculate Distance Between User and Parking Lots

  // Calculate Time for Different Transportation Methods

  // Cache Data

  return NextResponse.json(successHandler({}));
}
