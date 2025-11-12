import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { getLocationData } from "@/lib/helpers/api.helpers";
import { decisionHandler } from "@/lib/arcjet/arcjet";

export async function GET(req, { params }) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision.message, decision.code), {
      status: decision.status,
    });
  }

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

  // Getting Location Data
  const { error: getLocationDataError, data: locationData } =
    await getLocationData(location_id);
  if (getLocationDataError) {
    return NextResponse.json(
      errorHandler(getLocationDataError.message, getLocationDataError.code),
      {
        status: getLocationDataError.status,
      }
    );
  }

  return NextResponse.json(successHandler(locationData));
}
