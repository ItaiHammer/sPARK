import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import {
  validateRoute,
  locationIDSchema,
  coorindatesSchema,
} from "@/lib/helpers/validator";
import { getLotsKey, getCalculateKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import { calculateMatrix } from "@/lib/openroute/openroute";
import { getLots } from "@/lib/supabase/supabase";
import {
  convertToHours,
  convertToKM,
  convertToMinutes,
  convertToMiles,
  roundToTwoDecimalPlaces,
} from "@/lib/utils";
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
  const { error: locationIDValidationError, data: validatedLocationID } =
    validateRoute(reqParams, locationIDSchema);
  if (locationIDValidationError || !validatedLocationID) {
    return NextResponse.json(
      errorHandler(
        locationIDValidationError.message,
        locationIDValidationError.code
      ),
      {
        status: 400,
      }
    );
  }
  const { location_id } = validatedLocationID;
  const formattedLocationID = location_id.toLowerCase();

  // Validate Request Body
  const body = await req.json();
  const { data: validatedData, error: validationError } = validateRoute(
    body,
    coorindatesSchema
  );
  if (validationError || !validatedData) {
    return NextResponse.json(
      errorHandler(validationError.message, validationError.code),
      {
        status: 400,
      }
    );
  }
  const { address, coordinates, transportation } = validatedData;

  // Check if data is in Cache
  const { key: calculateKey, interval: calculateInterval } = getCalculateKey(
    formattedLocationID,
    address,
    transportation
  );
  const { error: getCalculateCacheError, data: cachedCalculateData } =
    await getCache(calculateKey);
  if (getCalculateCacheError) {
    return NextResponse.json(
      errorHandler(getCalculateCacheError.message, getCalculateCacheError.code),
      {
        status: 500,
      }
    );
  }
  if (cachedCalculateData) {
    return NextResponse.json(successHandler(JSON.parse(cachedCalculateData)));
  }

  // Check if data is in Redis
  let lotsData = [];
  const { key: lotsKey, interval: lotsInterval } =
    getLotsKey(formattedLocationID);
  const { error: getCacheError, data: cachedData } = await getCache(lotsKey);
  if (getCacheError) {
    return NextResponse.json(
      errorHandler(getCacheError.message, getCacheError.code),
      {
        status: 500,
      }
    );
  }

  if (cachedData) {
    lotsData = JSON.parse(cachedData);
  } else {
    // Get Parking Lot Locations (Latitude and Longitude) from DB
    const { error: getLotsError, data: lotsDataFromDB } = await getLots(
      formattedLocationID
    );
    if (getLotsError) {
      return NextResponse.json(
        errorHandler(getLotsError.message, getLotsError.code),
        {
          status: 500,
        }
      );
    }

    // Cache Lots Data
    const { error: cacheLotsDataError } = await setCache(
      lotsKey,
      JSON.stringify(lotsDataFromDB),
      lotsInterval
    );
    if (cacheLotsDataError) {
      return NextResponse.json(
        errorHandler(cacheLotsDataError.message, cacheLotsDataError.code),
        {
          status: 500,
        }
      );
    }

    lotsData = lotsDataFromDB;
  }

  // Calculate Distance Between User and Parking Lots
  const locations = [
    [coordinates.longitude, coordinates.latitude],
    ...lotsData.map((lot) => [lot.longitude, lot.latitude]),
  ];
  const { error: calculateMatrixError, data: calculateMatrixData } =
    await calculateMatrix(transportation, locations);
  if (calculateMatrixError) {
    return NextResponse.json(
      errorHandler(calculateMatrixError.message, calculateMatrixError.code),
      {
        status: 500,
      }
    );
  }

  // Format Data
  const formattedData = lotsData.map((lot, index) => {
    const durationInSeconds = calculateMatrixData.durations[0][index];
    const distanceInMeters = calculateMatrixData.distances[0][index];
    const snappedDistance =
      calculateMatrixData.destinations[index].snapped_distance;

    return {
      ...lot,
      latitude: lot.latitude,
      longitude: lot.longitude,
      duration: {
        seconds: roundToTwoDecimalPlaces(durationInSeconds),
        minutes: convertToMinutes(durationInSeconds),
        hours: convertToHours(durationInSeconds),
      },
      distance: {
        meters: roundToTwoDecimalPlaces(distanceInMeters),
        kilometers: convertToKM(distanceInMeters),
        miles: convertToMiles(distanceInMeters),
      },
      snapped_distance: {
        meters: roundToTwoDecimalPlaces(snappedDistance),
        kilometers: convertToKM(snappedDistance),
        miles: convertToMiles(snappedDistance),
      },
    };
  });

  // Cache Data
  const data = {
    address,
    coordinates,
    transportation,
    lots: formattedData,
  };
  const { error: cacheDataError } = await setCache(
    calculateKey,
    JSON.stringify(data),
    calculateInterval
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
