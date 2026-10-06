function coordinates(place) {
  const values = [place?.latitude, place?.longitude];
  if (values.some((value) => (typeof value !== "number" && typeof value !== "string")
    || (typeof value === "string" && !value.trim()))) return null;
  const [latitude, longitude] = values.map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return `${latitude},${longitude}`;
}

function endpoint(place) {
  const name = typeof place?.name === "string" ? place.name.trim() : "";
  const address = typeof place?.address === "string" ? place.address.trim() : "";
  // A named address resolves the intended place when stored coordinates point
  // at a neighboring campus building or a different tenant of a garage.
  return name && address ? `${name}, ${address}` : coordinates(place);
}

export function walkingDirectionsUrl(garage, building) {
  const origin = endpoint(garage);
  const destination = endpoint(building);
  if (!origin || !destination) return null;
  const query = new URLSearchParams({ api: "1", origin, destination, travelmode: "walking" });
  return `https://www.google.com/maps/dir/?${query}`;
}
