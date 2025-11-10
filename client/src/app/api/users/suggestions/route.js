import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { supabase } from "@/lib/supabase/supabase";
import { getLocationKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";

export async function GET(req) {
  // Validate Request Parameters
  const body = await req.json();

  // Get Parking Lot Locations (Latitude and Longitude)

  // Calculate Distance Between User and Parking Lots

  // Calculate Time for Different Transportation Methods

  // Cache Data

  return NextResponse.json(successHandler({}));
}
