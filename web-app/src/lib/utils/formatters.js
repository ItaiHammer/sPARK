// Custom
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

export const formatLiveDateTime = (date, time) => {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: "local" });
  if (!dt.isValid) {
    return formattedDateTime(date, time);
  }
  const weekday = dt.toFormat("cccc"); // Full weekday name
  const monthDay = dt.toFormat("M/d");
  const timeStr = dt.toFormat("h:mm a");
  return `${weekday}, ${monthDay} ${timeStr}`;
};

export const formatCustomDate = (date, time) => {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: "local" });
  if (!dt.isValid) {
    return "Monday, Nov 1";
  }
  const weekday = dt.toFormat("cccc");
  const monthDay = dt.toFormat("LLL d");
  return `${weekday}, ${monthDay}`;
};

export const formatCustomTime = (date, time) => {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: "local" });
  if (!dt.isValid) {
    return "9:45 am";
  }
  return dt.toFormat("h:mm a");
};
