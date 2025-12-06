import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import { validateRoute, userLocationSchema } from "@/lib/helpers/validator";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import { getGeocodeData } from "@/lib/helpers/api.helpers";

export async function POST(req) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision?.message, decision?.code), {
      status: decision?.status,
    });
  }

  // Validate Request Body
  const body = await req.json();
  const { data: validatedData, error: validationError } = validateRoute(
    body,
    userLocationSchema
  );
  if (validationError || !validatedData) {
    return NextResponse.json(
      errorHandler(validationError?.message, validationError?.code),
      {
        status: 400,
      }
    );
  }
  const { address } = validatedData;

  //  Get Geocode Data
  const { error: geocodeError, data } = await getGeocodeData(address);
  if (geocodeError) {
    return NextResponse.json(
      errorHandler(geocodeError?.message, geocodeError?.code),
      {
        status: geocodeError?.status,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
