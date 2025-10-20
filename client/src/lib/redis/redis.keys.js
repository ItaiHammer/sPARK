export const getLotsKey = (location_id) => {
  return { key: `location-lots:${location_id}`, interval: 60 * 60 * 24 }; // 24 hours
};

export const getLocationKey = (location_id) => {
  return { key: `location-info:${location_id}`, interval: 60 * 60 * 24 }; // 24 hours
};

export const getOccupancyKey = (location_id) => {
  return { key: `location-occupancy:${location_id}`, interval: 60 * 20 }; // 20 minutes
};
