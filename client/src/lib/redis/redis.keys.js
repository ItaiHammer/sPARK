import { hashAddress } from "../utils";

// Intervals
const SEVEN_DAYS = 60 * 60 * 24 * 7;

// ---- Keys ----
export const getLotsKey = (location_id) => {
  return {
    key: `LOCATION-LOTS:LOCATION_ID:${location_id}`,
    interval: SEVEN_DAYS,
  }; // 7 days
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
    key: `GEOCODE:ADDRESS:${hashAddress(address)}`,
    interval: SEVEN_DAYS,
  }; // 7 days
};

export const getUserCalculateKey = (location_id, address, transportation) => {
  return {
    key: `USER_CALCULATE:LOCATION_ID:${location_id}:ADDRESS:${hashAddress(
      address
    )}:TRANSPORTATION:${transportation}`,
    interval: SEVEN_DAYS,
  }; // 7 days
};
