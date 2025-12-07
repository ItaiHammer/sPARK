import crypto from "crypto";
import { DateTime } from "luxon";

// ---- Math Functions ----
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

// ---- Formatting Functions ----
export const hashValue = (value) => {
  return crypto
    .createHash("sha256")
    .update(value.toLowerCase())
    .digest("hex")
    .slice(0, 8);
};

export const formattedDateTime = (date, time) => {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: "local" });
  if (!dt.isValid) {
    const fallback = DateTime.fromISO(date);
    return fallback.isValid ? fallback.toLocaleString() : "";
  }
  const weekday = dt.toFormat("ccc");
  const timeStr = dt.toFormat("h:mm a").toLowerCase();
  return `${weekday}, ${timeStr}`;
};
