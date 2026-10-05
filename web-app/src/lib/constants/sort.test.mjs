import test from "node:test";
import assert from "node:assert/strict";
import { SORT_TYPES, getSortLabel, getSpotCategorySort, getSpotCategoryCount, getSortedLots } from "./sort.js";
import { normalizeParkingLots, forecastOccupancyLots, indexForecastRows } from "../utils/client/parking.js";
import { DateTime } from "luxon";

const categorySorts = Object.values(SORT_TYPES).filter((type) => type.category);

for (const sort of categorySorts) {
  test(`${sort.label}: rank totals above zero and unknown counts`, () => {
    const key = sort.category.key;
    const lots = [
      { name: "A missing" },
      { name: "B zero", spot_categories: { [key]: 0 } },
      { name: "C highest", closed: true, spaces: 0, spot_categories: [{ spot_category_id: key, spot_count: 8 }] },
      { name: "D invalid", spot_categories: { [key]: null } },
      { name: "E second", spaces: 200, spot_categories: { [key]: 3 } },
      { name: "F tied", spot_categories: { [key]: "3" } },
    ];
    const original = structuredClone(lots);
    const sorted = getSortedLots(lots, sort.value);
    assert.deepEqual(sorted.map((lot) => lot.name), ["C highest", "E second", "F tied", "B zero", "A missing", "D invalid"]);
    assert.deepEqual(sorted.map((lot) => getSpotCategoryCount(lot, key)), [8, 3, 3, 0, null, null]);
    assert.deepEqual(lots, original);
    assert.equal(getSortLabel(sort.value), sort.label);
    assert.equal(getSpotCategorySort(sort.value), sort);
  });
}

test("missing and invalid counts never become a reported zero", () => {
  for (const value of [undefined, null, "", " ", false, true, -1, "unknown", NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(getSpotCategoryCount({ spot_categories: { disabled: value } }, "disabled"), null);
    assert.equal(getSpotCategoryCount({ spot_categories: [{ spot_category_id: "disabled", spot_count: value }] }, "disabled"), null);
  }
  assert.equal(getSpotCategoryCount({ spot_categories: [{ spot_category_id: "employee", spot_count: 8 }, null] }, "disabled"), null);
  assert.equal(getSpotCategoryCount({ spot_categories: [{ spot_category_id: "disabled", spot_count: 0 }] }, "disabled"), 0);
});

test("category totals stay independent of live occupancy and forecast availability", () => {
  const metadata = [{ lot_id: "garage", name: "Garage", spot_count: 100, "24_hour": true,
    spot_categories: [{ spot_category_id: "ev_charging", spot_count: 8 }] }];
  const selection = { mode: "live", dateISO: "2026-10-05", minutes: 540, zone: "America/Los_Angeles" };
  const live = normalizeParkingLots({ metadataLots: metadata, occupancyLots: [{ lot_id: "garage", occupancy_pct: 100 }], selection });
  const selectedAt = DateTime.fromISO("2026-10-05T09:00", { zone: selection.zone });
  const forecastByLot = indexForecastRows([{ lots: [{ lot_id: "garage", forecasted_data: [
    { forecast_ts: selectedAt.toUTC().toISO(), prediction_pct: 0 },
  ] }] }]);
  const forecast = normalizeParkingLots({ metadataLots: metadata,
    occupancyLots: forecastOccupancyLots(metadata, forecastByLot, selectedAt),
    selection: { ...selection, mode: "forecast" }, forecastByLot });
  assert.equal(getSpotCategoryCount(live[0], "ev_charging"), 8);
  assert.equal(getSpotCategoryCount(forecast[0], "ev_charging"), 8);
  assert.equal(live[0].spaces, 0);
  assert.equal(forecast[0].spaces, 100);
});

test("existing sorts keep their ordering and have no category metric", () => {
  const lots = [
    { name: "C closed", closed: true, occupied: 0, spaces: 100, travel: { meters: 10 } },
    { name: "B full", closed: false, occupied: 90, spaces: 10, travel: { meters: 20 } },
    { name: "A open", closed: false, occupied: 20, spaces: 80, travel: { meters: 30 } },
  ];
  for (const type of [SORT_TYPES.MOST_SPACES, SORT_TYPES.EMPTIEST_FIRST, SORT_TYPES.GARAGE_NAME]) {
    assert.deepEqual(getSortedLots(lots, type.value).map((lot) => lot.name), ["A open", "B full", "C closed"]);
    assert.equal(getSpotCategorySort(type.value), null);
  }
  assert.deepEqual(getSortedLots(lots, SORT_TYPES.DISTANCE_TO_BUILDING.value).map((lot) => lot.name), ["C closed", "B full", "A open"]);
  assert.equal(getSpotCategorySort(SORT_TYPES.DISTANCE_TO_BUILDING.value), null);
});
