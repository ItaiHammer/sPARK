import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { getLotsData } from "@/lib/helpers/api.helpers";
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

  // Gettin Lots Data
  const { error: getLotsError, data: lotsData } = await getLotsData(
    location_id
  );
  if (getLotsError) {
    return NextResponse.json(
      errorHandler(getLotsError.message, getLotsError.code),
      {
        status: getLotsError.status,
      }
    );
  }

  return NextResponse.json(successHandler(lotsData));
}
