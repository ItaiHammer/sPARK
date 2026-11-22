export const PARKING_LINKS = Object.freeze({
  services: "https://www.sjsu.edu/parking/",
  permits: "https://www.sjsu.edu/parking/permits/",
  payment: "https://www.sjsu.edu/parking/permits/buy-permit.php",
  garages: "https://www.sjsu.edu/parking/maps/garages.php",
  southCampus: "https://www.sjsu.edu/parking/permits/south-campus.php",
  parkMobile: "https://www.sjsu.edu/parking/apps/parkmobile/index.php",
});

// Garage-specific locations from SJSU's payment guide, checked October 2026.
export const PAY_STATIONS = Object.freeze({
  "sjsu-north-garage": "First floor, by the elevators.",
  "sjsu-south-garage": "Sections 3A and 4H, or outside on the first floor.",
  "sjsu-west-garage": "Sections 1A and 3C.",
  "sjsu-south-campus-garage": "First floor, by the elevators.",
});

// SJSU garage guide, checked October 2026. South Campus has no 24h permit access.
export function permitHoursForGarage(garage) {
  if (["sjsu-north-garage", "sjsu-south-garage", "sjsu-west-garage"].includes(garage.lot_id)) {
    return [
      ...(garage["24_hour"] === true ? [{ label: "Special permits", hours: "24 hours", description: "E, R, H, Carpool & Overnight", start: 0, end: 1440, tone: "special" }] : []),
      { label: "Other permits", hours: "7am–12am", description: "Commuter, daily & hourly permits", start: 420, end: 1440, tone: "general" },
    ];
  }
  // Other garages use their database hours directly in the page.
  return [];
}

export function garageMapUrls(garage) {
  const name = typeof garage?.name === "string" ? garage.name.trim() : "";
  const address = typeof garage?.address === "string" ? garage.address.trim() : "";
  const latitude = garage?.latitude;
  const longitude = garage?.longitude;
  const valid = (value) => (typeof value === "number" || typeof value === "string")
    && String(value).trim() !== "" && Number.isFinite(Number(value));
  const coordinates = valid(latitude) && valid(longitude)
    && Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180
    ? `${Number(latitude)},${Number(longitude)}` : null;
  const destination = name && address ? `${name}, ${address}` : coordinates;
  if (!destination) return null;
  return {
    embed: `https://maps.google.com/maps?${new URLSearchParams({ q: destination, z: "16", output: "embed" })}`,
    view: `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: destination })}`,
    directions: `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination, travelmode: "driving" })}`,
  };
}

export function capacityLabel(value) {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "") return "Unavailable";
  const capacity = Number(value);
  return Number.isSafeInteger(capacity) && capacity >= 0 ? capacity.toLocaleString("en-US") : "Unavailable";
}
