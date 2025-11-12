import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
} from "@/lib/helpers/responseHandler";
import { validateRoute, buildingIDSchema } from "@/lib/helpers/validator";
import { getLotsData } from "@/lib/helpers/api.helpers";
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
  const { error: paramValidationError, data: validatedParams } = validateRoute(
    reqParams,
    buildingIDSchema
  );
  if (paramValidationError || !validatedParams) {
    return NextResponse.json(
      errorHandler(paramValidationError.message, paramValidationError.code),
      {
        status: 400,
      }
    );
  }
  const { location_id, building_id } = validatedParams;

  // Getting Building Data

  // Getting Lots Data
  const { error: getLotsDataError, data: lotsData } = await getLotsData(
    location_id,
    building_id
  );
  if (getLotsDataError) {
    return NextResponse.json(
      errorHandler(getLotsDataError.message, getLotsDataError.code),
      {
        status: getLotsDataError.status,
      }
    );
  }

  return NextResponse.json(successHandler({}));
}
