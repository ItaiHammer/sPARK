import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import {
  validateRoute,
  buildingIDSchema,
  suggestionsSchema,
} from "@/lib/helpers/validator";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import {
  getOccupancyData,
  getBuildingCalculationsData,
} from "@/lib/helpers/api.helpers";
import { getCache, setCache } from "@/lib/redis/redis";
import { getRecommendationsKey } from "@/lib/redis/redis.keys";
import {
  checkArrivalTime,
  calculateRecommendedArrivalTimesToLots,
  calculateRecommendedLeaveTimesToLots,
  formatArrivalTimeRecommendations,
  addOccupancyDataToRecommendations,
} from "./calculations.helpers";
import { getScoringModel, sortRecommendationsByScore } from "./scoring.helpers";

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

  // Validate Request Body
  const reqBody = await req.json();
  const { error: bodyValidationError, data: validatedBody } = validateRoute(
    reqBody,
    suggestionsSchema
  );
  if (bodyValidationError || !validatedBody) {
    return NextResponse.json(
      errorHandler(bodyValidationError.message, bodyValidationError.code),
      {
        status: 400,
      }
    );
  }
  const { user_to_lots, arrival_time, scoring_model } = validatedBody;
  const didUserProvideLocation = user_to_lots.length > 0;

  // Check Arrival Time
  const { error: arrivalTimeError, data: arrivalTimeData } =
    checkArrivalTime(arrival_time);
  if (arrivalTimeError || !arrivalTimeData) {
    return NextResponse.json(
      errorHandler(arrivalTimeError.message, arrivalTimeError.code),
      {
        status: arrivalTimeError.status,
      }
    );
  }

  const { arrivalTimeToBuilding } = arrivalTimeData;

  // Check Cache (Only if user did NOT provide a location)
  const { key: recommendationsKey, interval: recommendationsInterval } =
    getRecommendationsKey(
      location_id,
      building_id,
      scoring_model,
      arrivalTimeToBuilding
    );
  if (!didUserProvideLocation) {
    const { error: cacheDataError, data: cachedData } = await getCache(
      recommendationsKey
    );
    if (cacheDataError) {
      return NextResponse.json(
        errorHandler(cacheDataError.message, cacheDataError.code),
        {
          status: 500,
        }
      );
    }
    if (cachedData) {
      return NextResponse.json(successHandler(JSON.parse(cachedData)));
    }
  }

  // Get Building Calculations Data
  const {
    error: getBuildingCalculationsDataError,
    data: buildingCalculationsData,
  } = await getBuildingCalculationsData(location_id, building_id);
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

  // Lot Recommendations
  let lotRecommendations = [];

  // Calculate the Recommended Arrival Times to each lot (Walking time from lots to building)
  const recommendedArrivalTimesToLots = calculateRecommendedArrivalTimesToLots(
    buildingCalculationsData,
    arrivalTimeData
  );

  // If user provided a location
  if (didUserProvideLocation) {
    // Calculate the Recommended Leave Times to each lot (Driving time from user to lots)
    lotRecommendations = calculateRecommendedLeaveTimesToLots(
      recommendedArrivalTimesToLots,
      arrivalTimeData,
      user_to_lots
    );
  } else {
    // If user did not provide a location, use the recommended arrival times to lots
    lotRecommendations = formatArrivalTimeRecommendations(
      recommendedArrivalTimesToLots,
      arrivalTimeData
    );
  }

  // Get Occupancy Data
  const { error: getOccupancyError, data: lotsOccupancyData } =
    await getOccupancyData(location_id);
  if (getOccupancyError) {
    return NextResponse.json(
      errorHandler(getOccupancyError.message, getOccupancyError.code),
      {
        status: 500,
      }
    );
  }

  // Adding Occupancy Data to Recommendations
  const { highestTotalTravelTime, recommendations: combinedRecommendations } =
    addOccupancyDataToRecommendations(lotRecommendations, lotsOccupancyData);

  // Calculate the Score for each lot & Sort by the recommendation Score
  const scoredRecommendations = sortRecommendationsByScore(
    scoring_model,
    combinedRecommendations,
    highestTotalTravelTime
  );

  // Cache Data (Only if user did NOT provide a location)
  const { durationWeight, occupancyWeight } = getScoringModel(scoring_model);
  const data = {
    scoring: {
      model: scoring_model,
      duration_weight: durationWeight,
      occupancy_weight: occupancyWeight,
    },
    desired_arrival_time: arrivalTimeToBuilding.toISO({ zone: "UTC" }),
    recommendations: scoredRecommendations,
  };
  if (!didUserProvideLocation) {
    const { error: cacheDataError } = await setCache(
      recommendationsKey,
      JSON.stringify(data),
      recommendationsInterval
    );
    if (cacheDataError) {
      return NextResponse.json(
        errorHandler(cacheDataError.message, cacheDataError.code),
        {
          status: 500,
        }
      );
    }
  }

  return NextResponse.json(successHandler(data));
}
