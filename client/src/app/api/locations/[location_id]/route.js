export const runtime = "edge";

import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { supabase } from "@/lib/supabase/supabase";
import { decisionHandler } from "@/lib/arcjet/arcjet";

export async function GET(req, { params }) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied()) {
    return NextResponse.json(errorHandler(decision.message, decision.code), {
      status: decision.status,
    });
  }

  // Validate Request Parameters
  const reqParams = await params;
  const { location_id } = validateRoute(reqParams, locationIDSchema);

  // Fetch Location Data
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("location_id", location_id.toLowerCase());

  if (error) {
    return NextResponse.json(errorHandler(error, errorCodes.SUPABASE_ERROR), {
      status: 500,
    });
  }

  if (!data) {
    return NextResponse.json(
      errorHandler("No location found", errorCodes.LOCATION_NOT_FOUND),
      {
        status: 404,
      }
    );
  }

  return NextResponse.json(successHandler(data[0]));
}
