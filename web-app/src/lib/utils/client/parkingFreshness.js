import { DateTime } from "luxon";

export function freshnessLabel(mode, refreshedAt, selectedAt, now = DateTime.now()) {
  if (mode === "predicted") return `${selectedAt.toFormat("LLL d")} estimate`;
  if (mode === "historical") return "Historical estimate";
  const observed = typeof refreshedAt === "string" && refreshedAt
    ? DateTime.fromISO(refreshedAt, { setZone: true }) : null;
  if (!observed?.isValid) return mode === "paused" ? "Saved snapshot" : "Update time unavailable";
  if (mode === "paused") return `Snapshot · ${observed.setZone(selectedAt.zoneName).toFormat("h:mm a")}`;
  const minutesAgo = Math.max(0, Math.floor(now.diff(observed, "minutes").minutes));
  return minutesAgo < 1 ? "Updated just now"
    : minutesAgo < 60 ? `Updated ${minutesAgo}m ago`
      : `Updated ${observed.setZone(selectedAt.zoneName).toFormat("LLL d · h:mm a")}`;
}
