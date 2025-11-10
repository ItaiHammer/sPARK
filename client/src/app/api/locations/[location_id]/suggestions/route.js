import { NextResponse } from "next/server";
import {
  errorHandler,
  successHandler,
  errorCodes,
} from "@/lib/helpers/responseHandler";
import {
  validateRoute,
  userLocationSchema,
  locationIDSchema,
} from "@/lib/helpers/validator";
import { getLotsKey, getSuggestionsKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import { getCoordinates } from "@/lib/opencage/opencage";
import {
  calculateMatrix,
  transportationTypes,
} from "@/lib/openroute/openroute";
import { getLots } from "@/lib/supabase/supabase";
import {
  convertToHours,
  convertToKM,
  convertToMinutes,
  convertToMiles,
  roundToTwoDecimalPlaces,
} from "@/lib/utils";

export async function POST(req, { params }) {
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

  // Get Cached Suggestions
  const { address, transportation } = validatedData;
  const { key: suggestionsKey, interval: suggestionsInterval } =
    getSuggestionsKey(formattedLocationID, address, transportation);
  const { error: getCachedSuggestionsError, data: cachedSuggestions } =
    await getCache(suggestionsKey);
  if (getCachedSuggestionsError) {
    return NextResponse.json(
      errorHandler(
        getCachedSuggestionsError.message,
        getCachedSuggestionsError.code
      ),
      {
        status: 500,
      }
    );
  }

  if (cachedSuggestions) {
    return NextResponse.json(successHandler(JSON.parse(cachedSuggestions)));
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
    [userLongitude, userLatitude],
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
    user: {
      latitude: userLatitude,
      longitude: userLongitude,
    },
    lots: formattedData,
  };
  const { error: cacheDataError } = await setCache(
    suggestionsKey,
    JSON.stringify(data),
    suggestionsInterval
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
