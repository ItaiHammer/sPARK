import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import {
  validateRoute,
  lotsForecastSchema,
  locationIDSchema,
} from "@/lib/helpers/validator";
import { getLotsForecastData } from "@/lib/helpers/api.helpers";
import { decisionHandler } from "@/lib/arcjet/arcjet";

export async function POST(req, { params }) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision?.message, decision?.code), {
      status: decision?.status,
    });
  }

  // Validate Request Parameters
  const reqParams = await params;
  const { data: validatedParams, error: paramsValidationError } = validateRoute(
    reqParams,
    locationIDSchema
  );
  if (paramsValidationError || !validatedParams) {
    return NextResponse.json(
      errorHandler(paramsValidationError?.message, paramsValidationError?.code),
      {
        status: 400,
      }
    );
  }
  const { location_id } = validatedParams;

  // Validate Request Body
  const body = await req.json().catch(() => ({}));
  const { data: validatedBody, error: bodyValidationError } = validateRoute(
    body,
    lotsForecastSchema
  );
  if (bodyValidationError || !validatedBody) {
    return NextResponse.json(
      errorHandler(bodyValidationError?.message, bodyValidationError?.code),
      {
        status: 400,
      }
    );
  }
  const { date, lot_id } = validatedBody;

  //  Get Lots Forecast Data
  const { error: getLotsForecastDataError, data } = await getLotsForecastData(
    location_id,
    date,
    lot_id
  );
  if (getLotsForecastDataError) {
    return NextResponse.json(
      errorHandler(
        getLotsForecastDataError?.message,
        getLotsForecastDataError?.code
      ),
      {
        status: getLotsForecastDataError?.status,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
