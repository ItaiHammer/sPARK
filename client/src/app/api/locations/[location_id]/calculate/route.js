import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import {
  validateRoute,
  locationIDSchema,
  coorindatesSchema,
} from "@/lib/helpers/validator";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import { getUserCalculationsData } from "@/lib/helpers/api.helpers";

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

  // Validate Request Body
  const body = await req.json();
  const { data: validatedData, error: validationError } = validateRoute(
    body,
    coorindatesSchema
  );
  if (validationError || !validatedData) {
    return NextResponse.json(
      errorHandler(validationError.message, validationError.code),
      {
        status: 400,
      }
    );
  }
  const { address, coordinates, transportation } = validatedData;

  // Calculate Data
  const { error: calculateDataError, data } = await getUserCalculationsData(
    location_id,
    address,
    coordinates,
    transportation
  );
  if (calculateDataError) {
    return NextResponse.json(
      errorHandler(calculateDataError.message, calculateDataError.code),
      { status: calculateDataError.status }
    );
  }

  return NextResponse.json(successHandler(data));
}
