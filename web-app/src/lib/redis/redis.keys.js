import { hashValue } from "@/lib/utils/formatters";
import { DateTime } from "luxon";

// Intervals
const SEVEN_DAYS = 60 * 60 * 24 * 7;
const HALF_DAY = 60 * 60 * 12;

// ---- Keys ----
export const getLotsKey = (location_id) => {
  return {
    key: `LOCATION-LOTS:LOCATION_ID:${location_id}`,
    interval: SEVEN_DAYS,
  }; // 7 days
};

export const getLotsForecastKey = (location_id, date, lot_id) => {
  return {
    key: `LOTS-FORECAST:LOCATION_ID:${location_id}:DATE:${date}${lot_id ? `:LOT_ID:${lot_id}` : ""}`,
    interval: HALF_DAY,
  }; // 12 hours
};

export const getLocationKey = (location_id) => {
  return {
    key: `LOCATION-INFO:LOCATION_ID:${location_id}`,
    interval: SEVEN_DAYS,
  }; // 7 days
};

export const getBuildingKey = (location_id, building_id) => {
  return {
    key: `LOCATION-BUILDING-INFO:LOCATION_ID:${location_id}:BUILDING_ID:${building_id}`,
    interval: SEVEN_DAYS,
  }; // 7 days
};

export const getBuildingsKey = (location_id) => {
  return {
    key: `LOCATION-BUILDINGS:LOCATION_ID:${location_id}`,
    interval: SEVEN_DAYS,
  }; // 7 days
};

export const getBuildingCalculateKey = (location_id, building_id) => {
  return {
    key: `LOCATION-BUILDING-CALCULATE:LOCATION_ID:${location_id}:BUILDING_ID:${building_id}`,
    interval: SEVEN_DAYS,
  }; // 7 days
};

export const getOccupancyKey = (location_id) => {
  return {
    key: `LOCATION-LOTS-OCCUPANCY:LOCATION_ID:${location_id}`,
    interval: 60 * 20,
  }; // 20 minutes
};

export const getGeocodeKey = (address) => {
  return {
    key: `GEOCODE:ADDRESS:${hashValue(address)}`,
    interval: SEVEN_DAYS,
  }; // 7 days
};

export const getUserCalculateKey = (location_id, address, transportation) => {
  return {
    key: `USER_CALCULATE:LOCATION_ID:${location_id}:ADDRESS:${hashValue(
      address
    )}:TRANSPORTATION:${transportation}`,
    interval: SEVEN_DAYS,
  }; // 7 days
};

export const getRecommendationsKey = (
  location_id,
  building_id,
  scoring_model,
  arrival_time,
  address,
  transportation
) => {
  const timeTillArrivalTime =
    arrival_time.diff(DateTime.now({ zone: "UTC" })).toMillis() / 1000;

  return {
    key: `LOCATION-RECOMMENDATIONS:LOCATION_ID:${location_id}:BUILDING_ID:${building_id}:SCORING_MODEL:${scoring_model}:ARRIVAL_TIME:${hashValue(
      arrival_time.toISO({ zone: "UTC" })
    )}${address ? `:ADDRESS:${hashValue(address)}` : ""}${
      transportation ? `:TRANSPORTATION:${transportation}` : ""
    }`,
    interval: Math.round(timeTillArrivalTime + 60 * 5),
  }; // Last until time of the arrival time + 5 mins
};

export const getForecastPointsKey = (locationId, time, intervalMin) => {
  return {
    key: `FORECAST-POINTS:LOCATION_ID:${locationId}:TIME:${time}:INTERVAL_MIN:${intervalMin}`,
    interval: 60 * 60,
  }; // 1 hour
};
