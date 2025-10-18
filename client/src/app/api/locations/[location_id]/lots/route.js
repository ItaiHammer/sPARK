export const runtime = "edge";

import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { supabase } from "@/lib/supabase/supabase";

export async function GET(req, { params }) {
  const reqParams = await params;
  const { location_id } = validateRoute(reqParams, locationIDSchema);
  const { data, error } = await supabase
    .from("lots")
    .select("*")
    .eq("location_id", location_id.toLowerCase());

  if (error) {
    return NextResponse.json(errorHandler(error, errorCodes.SUPABASE_ERROR), {
      status: 500,
    });
  }

  if (!data || data?.data?.length === 0) {
    return NextResponse.json(
      errorHandler("No garages found", errorCodes.GARAGES_NOT_FOUND),
      {
        status: 404,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
