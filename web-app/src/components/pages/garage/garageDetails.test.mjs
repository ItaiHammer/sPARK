import test from "node:test";
import assert from "node:assert/strict";
import { capacityLabel, garageMapUrls, PAY_STATIONS, permitHoursForGarage } from "./garageDetails.js";

test("directions target the selected named garage and address", () => {
  const links = garageMapUrls({ name: "South Garage", address: "377 S 7th St, San Jose", latitude: 37, longitude: -121 });
  assert.equal(new URL(links.directions).searchParams.get("destination"), "South Garage, 377 S 7th St, San Jose");
  assert.equal(new URL(links.directions).searchParams.get("travelmode"), "driving");
  assert.equal(new URL(links.view).searchParams.get("query"), "South Garage, 377 S 7th St, San Jose");
  assert.equal(new URL(links.embed).searchParams.get("q"), "South Garage, 377 S 7th St, San Jose");
});

test("coordinates are a valid fallback, but missing or invalid locations never target zero", () => {
  assert.equal(new URL(garageMapUrls({ latitude: "37.3", longitude: "-121.8" }).directions).searchParams.get("destination"), "37.3,-121.8");
  for (const garage of [{}, { name: "Garage" }, { latitude: null, longitude: null }, { latitude: "", longitude: "" }, { latitude: 91, longitude: -121 }, { latitude: 37, longitude: 181 }, { latitude: "NaN", longitude: -121 }]) {
    assert.equal(garageMapUrls(garage), null);
  }
});

test("unknown capacities remain unavailable; explicit zero is preserved", () => {
  for (const value of [null, undefined, "", " ", -1, 1.5, Infinity, "unknown", true]) assert.equal(capacityLabel(value), "Unavailable");
  assert.equal(capacityLabel(0), "0");
  assert.equal(capacityLabel("1200"), "1,200");
});

test("pay-station information is garage specific", () => {
  assert.match(PAY_STATIONS["sjsu-north-garage"], /elevators/);
  assert.match(PAY_STATIONS["sjsu-south-garage"], /3A/);
  assert.match(PAY_STATIONS["sjsu-west-garage"], /1A/);
  assert.match(PAY_STATIONS["sjsu-south-campus-garage"], /elevators/);
});

test("24-hour permit access requires the garage's database flag", () => {
  const garage = { lot_id: "sjsu-north-garage", "24_hour": true };
  const rows = permitHoursForGarage(garage);
  assert.equal(rows.find((row) => row.label === "Special permits").end, 1440);
  assert.equal(rows.find((row) => row.label === "Other permits").start, 420);
  assert.equal(permitHoursForGarage({ ...garage, "24_hour": false }).some((row) => row.label === "Special permits"), false);
  assert.equal(permitHoursForGarage({ lot_id: garage.lot_id }).some((row) => row.label === "Special permits"), false);
});

test("South Campus and unknown garages keep database hours instead of main-campus permit rules", () => {
  assert.deepEqual(permitHoursForGarage({ lot_id: "sjsu-south-campus-garage", "24_hour": false }), []);
  assert.deepEqual(permitHoursForGarage({ lot_id: "another-garage", "24_hour": true }), []);
});
