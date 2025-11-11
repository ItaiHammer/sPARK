import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import { validateRoute, userLocationSchema } from "@/lib/helpers/validator";
import { getGeocodeKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import { getCoordinates } from "@/lib/opencage/opencage";
import { decisionHandler } from "@/lib/arcjet/arcjet";

export async function POST(req) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision.message, decision.code), {
      status: decision.status,
    });
  }

  // Validate Request Body
  const body = await req.json();
  const { data: validatedData, error: validationError } = validateRoute(
    body,
    userLocationSchema
  );
  if (validationError || !validatedData) {
    return NextResponse.json(
      errorHandler(validationError.message, validationError.code),
      {
        status: 400,
      }
    );
  }
  const { address } = validatedData;

  // Check if data is in Cache
  const { key: geocodeKey, interval: geocodeInterval } = getGeocodeKey(address);
  const { error: getCacheError, data: cachedData } = await getCache(geocodeKey);
  if (getCacheError) {
    return NextResponse.json(
      errorHandler(getCacheError.message, getCacheError.code),
      {
        status: 500,
      }
    );
  }
  if (cachedData) {
    return NextResponse.json(successHandler(JSON.parse(cachedData)));
  }

  // Get Coordinates from Opencage
  const { error: opencageError, data: opencageData } = await getCoordinates(
    address
  );
  if (opencageError) {
    return NextResponse.json(
      errorHandler(opencageError.message, opencageError.code),
      {
        status: 400,
      }
    );
  }
  const { lat: userLatitude, lng: userLongitude } = opencageData;

  // Cache Data
  const data = {
    coordinates: {
      latitude: userLatitude,
      longitude: userLongitude,
    },
    address,
  };
  const { error: cacheDataError } = await setCache(
    geocodeKey,
    JSON.stringify(data),
    geocodeInterval
  );
  if (cacheDataError) {
    return NextResponse.json(
      errorHandler(cacheDataError.message, cacheDataError.code),
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
