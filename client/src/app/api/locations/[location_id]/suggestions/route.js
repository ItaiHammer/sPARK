import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import {
  validateRoute,
  locationIDSchema,
  suggestionsSchema,
} from "@/lib/helpers/validator";
import { getLotsKey, getSuggestionsKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import { getCoordinates } from "@/lib/opencage/opencage";
import {
  calculateMatrix,
  transportationTypes,
} from "@/lib/openroute/openroute";
import { getLots } from "@/lib/supabase/supabase";
import { decisionHandler } from "@/lib/arcjet/arcjet";

export async function POST(req, { params }) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision.message, decision.code), {
      status: decision.status,
    });
  }

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

  // Validate Request Body
  const body = await req.json();
  const { data: validatedData, error: validationError } = validateRoute(
    body,
    suggestionsSchema
  );
  if (validationError || !validatedData) {
    return NextResponse.json(
      errorHandler(validationError.message, validationError.code),
      {
        status: 400,
      }
    );
  }
  const { address, coordinates, transportation, lots } = validatedData;

  return NextResponse.json(successHandler({}));
}
