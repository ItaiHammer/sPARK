export const runtime = "edge";

import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/app/lib/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { supabase } from "@/app/lib/supabase/supabase";

export async function GET(req, { params }) {
  const reqParams = await params;
  const { location_id } = validateRoute(reqParams, locationIDSchema);
  const { data, error } = await supabase.rpc("get_latest_lot_occupancy", {
    location: location_id.toLowerCase(),
  });
  if (error) {
    return NextResponse.json(errorHandler(error, errorCodes.SUPABASE_ERROR), {
      status: 500,
    });
  }

  if (!data) {
    return NextResponse.json(
      errorHandler(
        "No occupancy data found for this location: " + location_id,
        errorCodes.GARAGES_NOT_FOUND
      ),
      {
        status: 404,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
