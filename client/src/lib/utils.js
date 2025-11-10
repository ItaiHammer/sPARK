export const roundToTwoDecimalPlaces = (value) => {
  return Math.round(value * 100) / 100;
};

export const convertToMinutes = (seconds) =>
  roundToTwoDecimalPlaces(seconds / 60);
export const convertToHours = (seconds) =>
  roundToTwoDecimalPlaces(seconds / 3600);

export const convertToKM = (meters) => roundToTwoDecimalPlaces(meters / 1000);
export const convertToMiles = (meters) =>
  roundToTwoDecimalPlaces(meters / 1609.34);
