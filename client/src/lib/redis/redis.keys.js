import { hashAddress } from "../utils";

// ---- Keys ----
export const getLotsKey = (location_id) => {
  return {
    key: `LOCATION-LOTS:LOCATION_ID:${location_id}`,
    interval: 60 * 60 * 24,
  }; // 24 hours
};

export const getLocationKey = (location_id) => {
  return {
    key: `LOCATION-INFO:LOCATION_ID:${location_id}`,
    interval: 60 * 60 * 24 * 7,
  }; // 24 hours
};

export const getOccupancyKey = (location_id) => {
  return {
    key: `LOCATION-OCCUPANCY:LOCATION_ID:${location_id}`,
    interval: 60 * 20,
  }; // 20 minutes
};

export const getGeocodeKey = (address) => {
  return {
    key: `GEOCODE:ADDRESS:${hashAddress(address)}`,
    interval: 60 * 60 * 24 * 7,
  }; // 7 days
};

export const getCalculateKey = (location_id, address, transportation) => {
  return {
    key: `CALCULATE:LOCATION_ID:${location_id}:ADDRESS:${hashAddress(
      address
    )}:TRANSPORTATION:${transportation}`,
    interval: 60 * 60 * 24,
  }; // 24 hours
};
