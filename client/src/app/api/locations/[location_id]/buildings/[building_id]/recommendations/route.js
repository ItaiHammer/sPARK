import { NextResponse } from "next/server";
import {
  errorHandler,
  errorCodes,
  successHandler,
} from "@/lib/helpers/responseHandler";
import {
  validateRoute,
  buildingIDSchema,
  suggestionsSchema,
} from "@/lib/helpers/validator";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import { DateTime } from "luxon";
import {
  getRecommendations,
  calculateNewLeaveTime,
  getOccupancyData,
  scoringModels,
  calculateRecommendationScore,
} from "@/lib/helpers/api.helpers";

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
  const { user_to_lots, building_to_lots, arrival_time, scoring_model } =
    validatedBody;

  //  Calculate the time difference between the arrival time and the current time
  const currentTime = DateTime.now({ zone: "UTC" });
  const arrivalTimeToBuilding = DateTime.fromISO(arrival_time, {
    zone: "UTC",
  });
  const arrivalTimeToBuildingWithBuffer = arrivalTimeToBuilding.minus({
    minutes: 5,
  });

  // Check the time to make sure its today
  if (
    arrivalTimeToBuilding.toMillis() < currentTime.toMillis() ||
    arrivalTimeToBuilding.toMillis() > currentTime.plus({ days: 1 }).toMillis()
  ) {
    return NextResponse.json(
      errorHandler(
        {
          arrival_time:
            "Arrival Time must be in the future and within 24 hours.",
        },
        errorCodes.ZOD_ERROR
      ),
      {
        status: 400,
      }
    );
  }

  // Calculate the Recommended Arrival Times to each lot (Walking time from lots to building)
  const recommendedArrivalTimesToLots = building_to_lots.map((lot) => {
    const withBufferDiff = arrivalTimeToBuildingWithBuffer
      .diff(currentTime)
      .toMillis();
    const withoutBufferDiff = arrivalTimeToBuilding
      .diff(currentTime)
      .toMillis();

    return {
      lot_id: lot.lot_id,
      buffer: {
        recommended_arrival_time: DateTime.fromMillis(
          currentTime.toMillis() + withBufferDiff - lot.duration * 1000
        ).toISO({ zone: "UTC" }),
      },
      without_buffer: {
        recommended_arrival_time: DateTime.fromMillis(
          currentTime.toMillis() + withoutBufferDiff - lot.duration * 1000
        ).toISO({ zone: "UTC" }),
      },
      travel_time_to_building: lot.duration,
    };
  });

  // Calculate the Recommended Leave Times to each lot (Driving time from user to lots)
  const recommendedLeaveTimesToUser = recommendedArrivalTimesToLots.map(
    (lot) => {
      const user_to_lot = user_to_lots.find(
        (user_lot) => user_lot.lot_id === lot.lot_id
      ).duration;
      const building_to_lot = lot.travel_time_to_building;
      let data = {};

      // Calculate with Buffer
      const withBufferRecommendations = getRecommendations(
        arrivalTimeToBuildingWithBuffer,
        lot.buffer.recommended_arrival_time,
        user_to_lot,
        building_to_lot
      );
      data = withBufferRecommendations;

      // Diff from current time to recommended leave time w/ buffer in milliseconds
      const diffFromCTtoRLCwithBuffer = DateTime.fromISO(
        withBufferRecommendations.rec_leave_time,
        {
          zone: "UTC",
        }
      )
        .diff(currentTime)
        .toMillis();

      // Check if recommended leave time w/ buffer is at least 1 minute before current time
      if (diffFromCTtoRLCwithBuffer <= -1000 * 60) {
        // Get Recommendations without buffer
        data = getRecommendations(
          arrivalTimeToBuilding,
          lot.without_buffer.recommended_arrival_time,
          user_to_lot,
          building_to_lot
        );
      }

      // Diff from current time to recommended leave time w/o buffer in milliseconds
      const diffFromCTtoRLCwithoutBuffer = DateTime.fromISO(
        data.rec_leave_time,
        {
          zone: "UTC",
        }
      )
        .diff(currentTime)
        .toMillis();

      // Check if recommended leave time w/o buffer is at least 1 minute before current time
      if (diffFromCTtoRLCwithoutBuffer <= -1000 * 60) {
        // Calculate new times even if late
        data = calculateNewLeaveTime(
          data,
          currentTime,
          user_to_lot,
          building_to_lot,
          arrivalTimeToBuilding
        );
      }

      return {
        lot_id: lot.lot_id,
        ...data,
      };
    }
  );

  // Get Occupancy Data
  const recommendationsWithOccupancy = [];
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
  let highestTotalTravelTime = 0;
  for (const recommendation of recommendedLeaveTimesToUser) {
    const totalTravelTime = recommendation.total_travel_time;
    if (totalTravelTime > highestTotalTravelTime) {
      highestTotalTravelTime = totalTravelTime;
    }

    const occupancyData = lotsOccupancyData.find(
      (occupancy) => occupancy.lot_id === recommendation.lot_id
    );
    if (occupancyData) {
      recommendationsWithOccupancy.push({
        ...recommendation,
        ...occupancyData,
      });
    }
  }

  // Scoring Weights
  let durationWeight = 0.6;
  let occupancyWeight = 0.4;

  // Selecting weights based on scoring model
  switch (scoring_model) {
    case scoringModels.closest:
      durationWeight = 0.8;
      occupancyWeight = 0.2;
      break;

    case scoringModels.least_full:
      durationWeight = 0.2;
      occupancyWeight = 0.8;
      break;

    case scoringModels.balanced:
      durationWeight = 0.6;
      occupancyWeight = 0.4;
      break;

    default:
      durationWeight = 0.6;
      occupancyWeight = 0.4;
      break;
  }

  // Calculate the Score for each lot
  const scoredRecommendations = recommendationsWithOccupancy.map((lot) => {
    return {
      ...lot,
      scoring: calculateRecommendationScore(
        lot,
        durationWeight,
        occupancyWeight,
        highestTotalTravelTime
      ),
    };
  });

  // Sort the recommendations by the recommendation score
  scoredRecommendations.sort(
    (a, b) => b.scoring.recommendation_score - a.scoring.recommendation_score
  );

  return NextResponse.json(
    successHandler({
      scoring: {
        model: scoring_model,
        duration_weight: durationWeight,
        occupancy_weight: occupancyWeight,
      },
      desired_arrival_time: arrivalTimeToBuilding.toISO({ zone: "UTC" }),
      recommendations: scoredRecommendations,
    })
  );
}
