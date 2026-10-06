import test from "node:test";
import assert from "node:assert/strict";
import { walkingDirectionsUrl } from "./walkingDirections.js";

const garage = { latitude: 37.3201, longitude: -121.8686 };
const building = { latitude: 37.3355, longitude: -121.8833 };

test("opens walking directions from the garage to the selected building", () => {
  const url = new URL(walkingDirectionsUrl(garage, building));
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/dir/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("origin"), "37.3201,-121.8686");
  assert.equal(url.searchParams.get("destination"), "37.3355,-121.8833");
  assert.equal(url.searchParams.get("travelmode"), "walking");
});

test("changing the selected building changes the destination", () => {
  const next = { latitude: 37.337, longitude: -121.88 };
  assert.equal(new URL(walkingDirectionsUrl(garage, next)).searchParams.get("destination"), "37.337,-121.88");
});

test("accepts numeric coordinate strings and valid zero coordinates", () => {
  const url = new URL(walkingDirectionsUrl({ latitude: "0", longitude: "0" }, building));
  assert.equal(url.searchParams.get("origin"), "0,0");
});

test("prefers full place names and addresses over inaccurate stored coordinates", () => {
  const namedGarage = { ...garage, name: "South Garage", address: "377 S. 7th St., San Jose, CA 95112" };
  const namedBuilding = { ...building, name: "Dr. Martin Luther King, Jr. Library", address: "150 E San Fernando St, San Jose, CA 95112" };
  const url = new URL(walkingDirectionsUrl(namedGarage, namedBuilding));
  assert.equal(url.searchParams.get("origin"), `${namedGarage.name}, ${namedGarage.address}`);
  assert.equal(url.searchParams.get("destination"), `${namedBuilding.name}, ${namedBuilding.address}`);
  assert.equal(url.searchParams.get("travelmode"), "walking");
});

test("building selection changes named destinations even when halls share a campus address", () => {
  const first = { name: "Dudley Moorhead Hall", address: "1 Washington Sq, San Jose, CA 95192" };
  const second = { ...first, name: "Engineering Building" };
  const firstUrl = new URL(walkingDirectionsUrl(garage, first));
  const secondUrl = new URL(walkingDirectionsUrl(garage, second));
  assert.notEqual(firstUrl.searchParams.get("destination"), secondUrl.searchParams.get("destination"));
  assert.equal(secondUrl.searchParams.get("destination"), `${second.name}, ${second.address}`);
});

test("partial or malformed address metadata falls back to validated coordinates", () => {
  for (const partial of [{ name: "Library" }, { address: "Campus" }, { name: " ", address: "Campus" }, { name: 42, address: "Campus" }]) {
    assert.equal(new URL(walkingDirectionsUrl(garage, { ...building, ...partial })).searchParams.get("destination"), "37.3355,-121.8833");
  }
});

test("missing or invalid endpoints never default to the user's current location", () => {
  for (const invalid of [null, {}, { latitude: null, longitude: 0 }, { latitude: " ", longitude: 0 },
    { latitude: false, longitude: 0 }, { latitude: Infinity, longitude: 0 },
    { latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 },
    { latitude: "37,5", longitude: 0 }]) {
    assert.equal(walkingDirectionsUrl(invalid, building), null);
    assert.equal(walkingDirectionsUrl(garage, invalid), null);
  }
});
