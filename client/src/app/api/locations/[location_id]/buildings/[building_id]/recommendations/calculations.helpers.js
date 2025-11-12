import { DateTime } from "luxon";
import { errorCodes } from "@/lib/helpers/responseHandler";
import { roundToTwoDecimalPlaces } from "@/lib/utils";

export const calculateNewLeaveTime = (
  oldData,
  currentTime,
  user_to_lot,
  building_to_lot,
  arrivalTimeToBuilding
) => {
  const data = { ...oldData };

  // Set New Leave time to current time
  data.rec_leave_time = currentTime.toISO({ zone: "UTC" });

  // New Leave time + time it takes from user to lot
  const expectedArrivalTimeToLot = currentTime.toMillis() + user_to_lot * 1000;

  // Set Expected Arrival Time to Lot to new late time arrival time
  data.expected_arrival_time_to_lot = DateTime.fromMillis(
    expectedArrivalTimeToLot
  ).toISO({ zone: "UTC" });

  // New expected arrival time to lot + time it takes from lot to building
  const expectedArrivalTimeToBuildingMillis =
    expectedArrivalTimeToLot + building_to_lot * 1000;

  // Set Expected Arrival Time to Building to new late time arrival time
  const expectedArrivalTimeToBuilding = DateTime.fromMillis(
    expectedArrivalTimeToBuildingMillis
  ).toISO({ zone: "UTC" });
  data.expected_arrival_time_to_building = expectedArrivalTimeToBuilding;

  // Find late time: Time past the recommended arrival time to building
  data.late_by = roundToTwoDecimalPlaces(
    Math.abs(
      (arrivalTimeToBuilding.toMillis() - expectedArrivalTimeToBuildingMillis) /
        1000
    )
  );

  return data;
};

export const getRecommendations = (
  arrivalTimeToBuilding,
  recommended_arrival_time,
  user_to_lot,
  building_to_lot
) => {
  const recommendedArrivalTime = DateTime.fromISO(recommended_arrival_time, {
    zone: "UTC",
  });
  const recommendedLeaveTime =
    recommendedArrivalTime.toMillis() - user_to_lot * 1000;

  // Data
  const expectedArrivalTime = recommendedArrivalTime.toISO({ zone: "UTC" });
  return {
    rec_leave_time: DateTime.fromMillis(recommendedLeaveTime).toISO({
      zone: "UTC",
    }),
    rec_arrival_time_to_lot: expectedArrivalTime,
    expected_arrival_time_to_lot: expectedArrivalTime,
    expected_arrival_time_to_building: arrivalTimeToBuilding.toISO({
      zone: "UTC",
    }),
    late_by: 0.0,
    travel_time_to_lot: roundToTwoDecimalPlaces(user_to_lot),
    travel_time_to_building: roundToTwoDecimalPlaces(building_to_lot),
    total_travel_time: roundToTwoDecimalPlaces(user_to_lot + building_to_lot),
  };
};

export const checkArrivalTime = (arrivalTime) => {
  //  Calculate the time difference between the arrival time and the current time
  const currentTime = DateTime.now({ zone: "UTC" });
  const arrivalTimeToBuilding = DateTime.fromISO(arrivalTime, {
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
    return {
      error: {
        message: {
          arrival_time:
            "Arrival Time must be in the future and within 24 hours.",
        },
        code: errorCodes.ZOD_ERROR,
        status: 400,
      },
      data: null,
    };
  }

  return {
    error: null,
    data: {
      currentTime,
      arrivalTimeToBuilding,
      arrivalTimeToBuildingWithBuffer,
    },
  };
};

export const calculateRecommendedArrivalTimesToLots = (
  buildingCalculationsData,
  { currentTime, arrivalTimeToBuilding, arrivalTimeToBuildingWithBuffer }
) => {
  return buildingCalculationsData.lots.map((lot) => {
    const building_to_lot = lot.duration;
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
          currentTime.toMillis() + withBufferDiff - building_to_lot * 1000
        ).toISO({ zone: "UTC" }),
      },
      without_buffer: {
        recommended_arrival_time: DateTime.fromMillis(
          currentTime.toMillis() + withoutBufferDiff - building_to_lot * 1000
        ).toISO({ zone: "UTC" }),
      },
      travel_time_to_building: building_to_lot,
    };
  });
};

export const calculateRecommendedLeaveTimesToLots = (
  recommendedArrivalTimesToLots,
  { currentTime, arrivalTimeToBuilding, arrivalTimeToBuildingWithBuffer },
  user_to_lots
) => {
  return recommendedArrivalTimesToLots.map((lot) => {
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
    const diffFromCTtoRLCwithoutBuffer = DateTime.fromISO(data.rec_leave_time, {
      zone: "UTC",
    })
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
  });
};

export const formatArrivalTimeRecommendations = (
  recommendedArrivalTimesToLots,
  { arrivalTimeToBuilding }
) => {
  return recommendedArrivalTimesToLots.map((lot) => {
    const travelTimeToBuilding = roundToTwoDecimalPlaces(
      lot.travel_time_to_building
    );

    return {
      lot_id: lot.lot_id,
      rec_leave_time: null,
      rec_arrival_time_to_lot: lot.buffer.recommended_arrival_time,
      expected_arrival_time_to_lot: null,
      expected_arrival_time_to_building: arrivalTimeToBuilding.toISO({
        zone: "UTC",
      }),
      late_by: 0,
      travel_time_to_lot: null,
      travel_time_to_building: travelTimeToBuilding,
      total_travel_time: travelTimeToBuilding,
    };
  });
};

export const addOccupancyDataToRecommendations = (
  lotRecommendations,
  lotsOccupancyData
) => {
  let highestTotalTravelTime = 0;
  const recommendations = lotRecommendations.map((recommendation) => {
    const totalTravelTime = recommendation.total_travel_time;
    if (totalTravelTime > highestTotalTravelTime) {
      highestTotalTravelTime = totalTravelTime;
    }

    const occupancyData = lotsOccupancyData.find(
      (occupancy) => occupancy.lot_id === recommendation.lot_id
    );

    if (!occupancyData) {
      return null;
    }

    return {
      ...recommendation,
      ...occupancyData,
    };
  });

  return {
    highestTotalTravelTime,
    recommendations,
  };
};
