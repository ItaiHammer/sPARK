import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import { validateRoute, buildingIDSchema } from "@/lib/helpers/validator";
import { getBuildingData } from "@/lib/helpers/api.helpers";
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
  const { error: getBuildingDataError, data: buildingData } =
    await getBuildingData(location_id, building_id);
  if (getBuildingDataError) {
    return NextResponse.json(
      errorHandler(getBuildingDataError.message, getBuildingDataError.code),
      {
        status: getBuildingDataError.status,
      }
    );
  }

  return NextResponse.json(successHandler(buildingData));
}
