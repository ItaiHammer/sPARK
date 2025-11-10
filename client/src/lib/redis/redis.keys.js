export const getLotsKey = (location_id) => {
  return {
    key: `LOCATION-LOTS:LOCATION_ID:${location_id}`,
    interval: 60 * 60 * 24,
  }; // 24 hours
};

export const getLocationKey = (location_id) => {
  return {
    key: `LOCATION-INFO:LOCATION_ID:${location_id}`,
    interval: 60 * 60 * 24,
  }; // 24 hours
};

export const getOccupancyKey = (location_id) => {
  return {
    key: `LOCATION-OCCUPANCY:LOCATION_ID:${location_id}`,
    interval: 60 * 20,
  }; // 20 minutes
};

export const getSuggestionsKey = (location_id, address, transportation) => {
  return {
    key: `LOCATION-SUGGESTIONS:LOCATION_ID:${location_id}&USER_ADDRESS:${address
      .toLowerCase()
      .replace(/ /g, "-")}&TRANSPORTATION:${transportation}`,
    interval: 60 * 60 * 24,
  }; // 24 hours
};
