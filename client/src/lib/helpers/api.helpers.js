import {
  getLotsKey,
  getLocationKey,
  getBuildingKey,
  getOccupancyKey,
} from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import {
  getLots,
  getLocationByID,
  getBuildingByID,
  getLatestLotOccupancy,
} from "@/lib/supabase/supabase";
import { roundToTwoDecimalPlaces } from "@/lib/utils";
import { DateTime } from "luxon";

// ---- Data Fetching ----
export const getLotsData = async (location_id) => {
  const formattedLocationId = location_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getLotsKey(formattedLocationId);
  const { error: getCacheError, data: cachedData } = await getCache(key);
  if (getCacheError) {
    return {
      error: {
        message: getCacheError.message,
        code: getCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  if (cachedData) {
    return {
      error: null,
      data: JSON.parse(cachedData),
    };
  }

  // Fetch Lots Data
  const { error: getLotsError, data } = await getLots(formattedLocationId);
  if (getLotsError) {
    return {
      error: {
        message: getLotsError.message,
        code: getLotsError.code,
        status: 500,
      },
      data: null,
    };
  }

  // Cache Data
  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(data),
    interval
  );
  if (setCacheError) {
    return {
      error: {
        message: setCacheError.message,
        code: setCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  return {
    error: null,
    data,
  };
};

export const getLocationData = async (location_id) => {
  const formattedLocationId = location_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getLocationKey(formattedLocationId);
  const { error: getCacheError, data: cachedData } = await getCache(key);
  if (getCacheError) {
    return {
      error: {
        message: getCacheError.message,
        code: getCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  if (cachedData) {
    return {
      error: null,
      data: JSON.parse(cachedData),
    };
  }

  // Fetch Location Data
  const { error: getLocationByIDError, data } = await getLocationByID(
    formattedLocationId
  );
  if (getLocationByIDError) {
    return {
      error: {
        message: getLocationByIDError.message,
        code: getLocationByIDError.code,
        status: 500,
      },
      data: null,
    };
  }

  // Cache Data
  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(data),
    interval
  );
  if (setCacheError) {
    return {
      error: {
        message: setCacheError.message,
        code: setCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  return {
    error: null,
    data,
  };
};

export const getBuildingData = async (location_id, building_id) => {
  const formattedLocationId = location_id.toLowerCase();
  const formattedBuildingId = building_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getBuildingKey(
    formattedLocationId,
    formattedBuildingId
  );
  const { error: getCacheError, data: cachedData } = await getCache(key);
  if (getCacheError) {
    return {
      error: {
        message: getCacheError.message,
        code: getCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  if (cachedData) {
    return {
      error: null,
      data: JSON.parse(cachedData),
    };
  }

  // Fetch Building Data
  const { error: getBuildingByIDError, data } = await getBuildingByID(
    formattedLocationId,
    formattedBuildingId
  );
  if (getBuildingByIDError) {
    return {
      error: {
        message: getBuildingByIDError.message,
        code: getBuildingByIDError.code,
        status: 500,
      },
      data: null,
    };
  }

  // Cache Data
  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(data),
    interval
  );
  if (setCacheError) {
    return {
      error: {
        message: setCacheError.message,
        code: setCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  return {
    error: null,
    data,
  };
};

export const getOccupancyData = async (location_id) => {
  const formattedLocationId = location_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getOccupancyKey(formattedLocationId);
  const { error: getCacheError, data: cachedData } = await getCache(key);
  if (getCacheError) {
    return {
      error: {
        message: getCacheError.message,
        code: getCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  if (cachedData) {
    return {
      error: null,
      data: JSON.parse(cachedData),
    };
  }

  // Fetch Occupancy Data
  const { error: getLatestLotOccupancyError, data } =
    await getLatestLotOccupancy(formattedLocationId);
  if (getLatestLotOccupancyError) {
    return {
      error: {
        message: getLatestLotOccupancyError.message,
        code: getLatestLotOccupancyError.code,
        status: 500,
      },
      data: null,
    };
  }

  // Cache Data
  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(data),
    interval
  );
  if (setCacheError) {
    return {
      error: {
        message: setCacheError.message,
        code: setCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  return {
    error: null,
    data,
  };
};

// ---- Recommendation Calculations ----
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

// ---- Scoring Model ----
export const scoringModels = {
  closest: "closest",
  least_full: "least-full",
  balanced: "balanced",
};

export const calculateRecommendationScore = (
  lot,
  durationWeight,
  occupancyWeight,
  highestTotalTravelTime
) => {
  const normalizedDuration = lot.total_travel_time / highestTotalTravelTime;
  const durationScore = normalizedDuration * durationWeight;

  // Square the occupancy percentage to give make higher occupancy percentages more detrimental to score
  const normalizedOccupancy = lot.occupancy_pct / 100;
  const occupancyScore = Math.pow(normalizedOccupancy, 2) * occupancyWeight;

  const rawScore = roundToTwoDecimalPlaces(durationScore + occupancyScore);
  return {
    raw_score: rawScore,
    recommendation_score: roundToTwoDecimalPlaces(1 - rawScore), // Flip because higher scores are worse, so invert it for UI display
    duration_score: roundToTwoDecimalPlaces(durationScore),
    occupancy_score: roundToTwoDecimalPlaces(occupancyScore),
  };
};
