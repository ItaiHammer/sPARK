import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import { validateRoute, buildingIDSchema } from "@/lib/helpers/validator";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import { getBuildingCalculationsData } from "@/lib/helpers/api.helpers";

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

  // Getting Building Calculations Data
  const { error: getBuildingCalculationsDataError, data } =
    await getBuildingCalculationsData(location_id, building_id);
  if (getBuildingCalculationsDataError) {
    return NextResponse.json(
      errorHandler(
        getBuildingCalculationsDataError.message,
        getBuildingCalculationsDataError.code
      ),
      {
        status: getBuildingCalculationsDataError.status,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
