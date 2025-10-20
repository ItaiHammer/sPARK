import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { supabase } from "@/lib/supabase/supabase";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import { getLotsKey } from "@/lib/redis/redis.keys";
import { redis } from "@/lib/redis/redis";

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
  const formattedLocationId = location_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getLotsKey(formattedLocationId);
  const cachedData = await redis.get(key);
  if (cachedData) {
    return NextResponse.json(successHandler(JSON.parse(cachedData)));
  }

  // Fetch Lots Data
  const { data, error } = await supabase
    .from("lots")
    .select("*")
    .eq("location_id", formattedLocationId);

  if (error) {
    return NextResponse.json(errorHandler(error, errorCodes.SUPABASE_ERROR), {
      status: 500,
    });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      errorHandler("No garages found", errorCodes.GARAGES_NOT_FOUND),
      {
        status: 404,
      }
    );
  }

  // Cache Data
  await redis.set(key, JSON.stringify(data), "EX", interval);

  return NextResponse.json(successHandler(data));
}
