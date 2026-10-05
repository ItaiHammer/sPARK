import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import {
  selectionDateTime,
  parkingStatus,
  operatingHours,
  parkingValues,
  indexForecastRows,
  forecastAt,
  forecastDayDates,
  forecastOccupancyLots,
  parkingAlert,
  latestObservation,
  travelForLot,
  normalizeParkingLots,
} from "./parking.js";

const zone = "America/Los_Angeles";
const at = (time = "09:00", date = "2026-10-05") => DateTime.fromISO(`${date}T${time}`, { zone });
const garage = { lot_id: "test-garage", name: "Test Garage", spot_count: 1000, "24_hour": true };
const campus = { ...garage, "24_hour": false, open_time: "07:00:00-07", close_time: "22:00:00-07" };
const rows = (percentages, start = at()) => percentages.map((occupied, index) => ({ timestamp: start.plus({ minutes: index * 30 }).toMillis(), occupied }));
const message = (occupied, forecastRows, options = {}) => parkingAlert({
  lot: garage, occupied, spaces: 1000 - occupied * 10, selectedAt: at(), forecastRows, ...options,
});

test("status boundaries match the approved occupancy thresholds", () => {
  assert.equal(parkingStatus(79).label, "Available");
  assert.equal(parkingStatus(80).label, "Busy");
  assert.equal(parkingStatus(92).label, "Busy");
  assert.equal(parkingStatus(93).label, "Nearly full");
  assert.equal(parkingStatus(100).label, "Nearly full");
  assert.deepEqual(parkingStatus(0, true), { label: "Closed", tone: "full" });
  assert.equal(parkingStatus(null).label, "Unavailable");
});

test("forecast zero remains valid and missing readings remain unknown", () => {
  assert.deepEqual(parkingValues(0, 1000), { occupied: 0, spaces: 1000 });
  assert.deepEqual(parkingValues(null, 1000), { occupied: null, spaces: null });
  assert.deepEqual(parkingValues(undefined, 1000), { occupied: null, spaces: null });
  assert.deepEqual(parkingValues("", 1000), { occupied: null, spaces: null });
  assert.deepEqual(parkingValues(120, 1000), { occupied: 100, spaces: 0 });
  assert.deepEqual(parkingValues(-20, 1000), { occupied: 0, spaces: 1000 });
  assert.deepEqual(parkingValues(50, null), { occupied: 50, spaces: null });
});

test("rounded occupancy cannot say Full while spaces remain", () => {
  assert.deepEqual(parkingValues(99.8, 1000), { occupied: 99, spaces: 2 });
  assert.deepEqual(parkingValues(99.99, 1000), { occupied: 100, spaces: 0 });
});

test("date selection respects the location timezone and DST gaps", () => {
  const selected = selectionDateTime({ dateISO: "2026-10-05", minutes: 555, zone });
  assert.equal(selected.toUTC().toISO(), "2026-10-05T16:15:00.000Z");
  assert.equal(selectionDateTime(null), null);
  assert.equal(selectionDateTime({ dateISO: "2026-02-30", minutes: 555, zone }), null);
  assert.equal(selectionDateTime({ dateISO: "2026-10-05", minutes: 1440, zone }), null);
  assert.equal(selectionDateTime({ dateISO: "2026-03-08", minutes: 150, zone }), null);
});

test("business hours use recurring local clock times rather than stale timetz offsets", () => {
  assert.equal(operatingHours(campus, at("06:59", "2026-01-05")).closed, true);
  assert.equal(operatingHours(campus, at("07:00", "2026-01-05")).closed, false);
  assert.equal(operatingHours(campus, at("21:59")).closed, false);
  assert.equal(operatingHours(campus, at("22:00")).closed, true);
  assert.equal(operatingHours(campus, at()).label, "7 AM–10 PM");
  assert.equal(operatingHours({}, at()).label, "Hours unavailable");
  assert.equal(operatingHours(garage, at()).label, "Open 24h");
});

test("overnight hours correctly wrap midnight", () => {
  const nightLot = { "24_hour": false, open_time: "20:00:00", close_time: "06:00:00" };
  assert.equal(operatingHours(nightLot, at("23:00")).closed, false);
  assert.equal(operatingHours(nightLot, at("05:30")).closesIn, 30);
  assert.equal(operatingHours(nightLot, at("06:00")).closed, true);
  assert.equal(operatingHours(nightLot, at("19:59")).closed, true);
});

test("opening and imminent closing messages take priority over forecast alerts", () => {
  assert.deepEqual(message(99, rows([99, 99]), { lot: campus, selectedAt: at("06:00") }), { text: "Opens at 7 AM", type: "opening" });
  assert.deepEqual(message(20, [], { lot: campus, selectedAt: at("21:00") }), { text: "Closes in 1h", type: "closing" });
  assert.deepEqual(message(20, [], { lot: campus, selectedAt: at("21:59") }), { text: "Closes in 1m", type: "closing" });
});

test("forecast interpolation uses only supported adjacent real points", () => {
  assert.equal(forecastAt(rows([70, 90]), at("09:15").toMillis()), 80);
  assert.equal(forecastAt(rows([0, 20]), at().toMillis()), 0);
  assert.equal(forecastAt(rows([70, 90]), at("08:45").toMillis()), null);
  assert.equal(forecastAt(rows([70, 90]), at("10:00").toMillis()), null);
  assert.equal(forecastAt([{ timestamp: at().toMillis(), occupied: 70 }, { timestamp: at("10:00").toMillis(), occupied: 90 }], at("09:15").toMillis()), null);
});

test("daily curves merge UTC day boundaries without losing zero forecasts", () => {
  const byLot = indexForecastRows([
    { lots: [{ lot_id: "a", forecasted_data: [{ forecast_ts: "2026-10-05T23:30:00Z", prediction_pct: 20 }] }] },
    { lots: [{ lot_id: "a", forecasted_data: [{ forecast_ts: "2026-10-06T00:00:00Z", prediction_pct: 0 }, { forecast_ts: "2026-10-06T00:30:00Z", prediction_pct: null }] }] },
  ]);
  assert.equal(byLot.get("a").length, 2);
  assert.equal(forecastAt(byLot.get("a"), DateTime.fromISO("2026-10-05T23:45:00Z").toMillis()), 10);
});

test("day-cache requests stay stable while scrubbing a campus-local date", () => {
  const expectedDates = ["2026-10-05", "2026-10-06"];
  for (const time of ["00:00", "08:17", "16:59", "23:59"]) {
    assert.deepEqual(forecastDayDates(at(time)), expectedDates, time);
  }
  assert.deepEqual(forecastDayDates(at("09:00", "2026-10-06")), ["2026-10-06", "2026-10-07"]);
});

test("cached UTC days cover local midnight and the final minute before the next date", () => {
  const byLot = indexForecastRows([
    { lots: [{ lot_id: garage.lot_id, forecasted_data: [
      { forecast_ts: "2026-10-05T07:00:00Z", prediction_pct: 0 },
      { forecast_ts: "2026-10-05T07:30:00Z", prediction_pct: 30 },
    ] }] },
    { lots: [{ lot_id: garage.lot_id, forecasted_data: [
      { forecast_ts: "2026-10-06T06:30:00Z", prediction_pct: 30 },
      { forecast_ts: "2026-10-06T07:00:00Z", prediction_pct: 60 },
    ] }] },
  ]);
  const midnight = forecastOccupancyLots([garage], byLot, at("00:00"))[0];
  const finalMinute = forecastOccupancyLots([garage], byLot, at("23:59"))[0];
  assert.equal(midnight.point, 0);
  assert.equal(finalMinute.point, 59);
  assert.deepEqual(parkingValues(finalMinute.point, finalMinute.spot_count), { occupied: 59, spaces: 410 });
});

test("day-cache ranges respect both 23-hour and 25-hour daylight-saving dates", () => {
  const spring = at("12:00", "2026-03-08");
  const autumn = at("12:00", "2026-11-01");
  assert.deepEqual(forecastDayDates(spring), ["2026-03-08", "2026-03-09"]);
  assert.deepEqual(forecastDayDates(autumn), ["2026-11-01", "2026-11-02"]);
  // This wider lookahead makes an erroneous fixed 24-hour day cross the
  // opposite UTC boundary on each DST transition.
  assert.deepEqual(forecastDayDates(spring, 990), ["2026-03-08", "2026-03-09"]);
  assert.deepEqual(forecastDayDates(autumn, 990), ["2026-11-01", "2026-11-02", "2026-11-03"]);
});

test("a European local day plus alert lookahead can require three UTC-day payloads", () => {
  const selected = DateTime.fromISO("2026-10-05T23:59", { zone: "Europe/Berlin" });
  assert.deepEqual(forecastDayDates(selected), ["2026-10-04", "2026-10-05", "2026-10-06"]);
  assert.deepEqual(forecastDayDates(selected, 0), ["2026-10-04", "2026-10-05"]);
});

test("cached forecasts retain garage metadata without mutating the source lots", () => {
  const metadata = {
    ...campus,
    location_id: "sjsu",
    name: "South Campus Garage",
    spot_categories: [{ spot_category_id: "general", spot_count: 900 }],
  };
  const original = structuredClone(metadata);
  const byLot = new Map([[metadata.lot_id, rows([20, 40])]]);
  const [forecastLot] = forecastOccupancyLots([metadata], byLot, at("09:15"));
  assert.deepEqual(forecastLot, { ...metadata, point: 30 });
  assert.deepEqual(metadata, original);
  assert.notEqual(forecastLot, metadata);
  assert.deepEqual(forecastOccupancyLots([], byLot, at()), []);
});

test("custom-minute cached predictions produce the same normalized count and status", () => {
  const selected = at("09:17");
  const byLot = new Map([[garage.lot_id, rows([10, 40])]]);
  const occupancyLots = forecastOccupancyLots([garage], byLot, selected);
  assert.equal(occupancyLots[0].point, 27);
  const [normalized] = normalizeParkingLots({
    metadataLots: [garage],
    occupancyLots,
    selection: { mode: "forecast", dateISO: "2026-10-05", minutes: 557, zone },
    forecastByLot: byLot,
  });
  assert.equal(normalized.occupied, 27);
  assert.equal(normalized.spaces, 730);
  assert.equal(normalized.status, "Available");
});

test("missing cached intervals stay unknown while exact zero forecasts remain valid", () => {
  const missingGarage = { ...garage, lot_id: "missing-garage" };
  const gapGarage = { ...garage, lot_id: "gap-garage" };
  const byLot = new Map([
    [garage.lot_id, rows([0, 30])],
    [gapGarage.lot_id, [
      { timestamp: at().toMillis(), occupied: 10 },
      { timestamp: at("10:00").toMillis(), occupied: 30 },
    ]],
  ]);
  const exact = forecastOccupancyLots([garage, missingGarage], byLot, at());
  assert.equal(exact[0].point, 0);
  assert.equal(exact[1].point, null);
  const gap = forecastOccupancyLots([gapGarage], byLot, at("09:17"));
  assert.equal(gap[0].point, null);
  const [normalized] = normalizeParkingLots({
    metadataLots: [missingGarage],
    occupancyLots: [exact[1]],
    selection: { mode: "forecast", dateISO: "2026-10-05", minutes: 540, zone },
    forecastByLot: byLot,
  });
  assert.equal(normalized.occupied, null);
  assert.equal(normalized.spaces, null);
  assert.equal(normalized.status, "Unavailable");
});

test("closed garage hours take priority when the cached day has no predictions", () => {
  const occupancyLots = forecastOccupancyLots([campus], new Map(), at("06:59"));
  const [normalized] = normalizeParkingLots({
    metadataLots: [campus],
    occupancyLots,
    selection: { mode: "forecast", dateISO: "2026-10-05", minutes: 419, zone },
  });
  assert.equal(normalized.closed, true);
  assert.equal(normalized.status, "Closed");
  assert.equal(normalized.alert.text, "Opens at 7 AM");
});

test("Full in follows the nearly-full threshold, with 15-minute estimates", () => {
  assert.deepEqual(message(90, rows([90, 97])), { text: "Full in 15m", type: "fullSoon" });
});

test("Busy in describes the first transition from available to busy", () => {
  assert.deepEqual(message(79, rows([79, 84, 99])), { text: "Busy in 15m", type: "busySoon" });
});

test("Available in means a recovery below 80 percent", () => {
  assert.deepEqual(message(83, rows([83, 74])), { text: "Available in 15m", type: "recovery" });
});

test("the next status may become Busy when a nearly-full garage improves", () => {
  assert.deepEqual(message(95, rows([95, 88, 50])), { text: "Busy in 15m", type: "busySoon" });
});

test("the status-change lookahead is bounded to four hours", () => {
  assert.equal(message(70, rows([70, 70, 70, 70, 70, 70, 70, 70, 80])).text, "Busy in 4h");
  assert.equal(message(70, rows([70, 70, 70, 70, 70, 70, 70, 70, 79, 85])).text, "Spaces expected for 2h");
});

test("one-hour trends count actual estimated spaces and retain the eight-point threshold", () => {
  assert.deepEqual(message(60, rows([60, 55, 50])), { text: "~100 more spaces in 1h", type: "moreSpaces" });
  assert.deepEqual(message(60, rows([60, 65, 70])), { text: "~100 fewer spaces in 1h", type: "fewerSpaces" });
  assert.notEqual(message(60, rows([60, 64, 67])).type, "fewerSpaces");
});

test("90 percent is an early caution while 93 is the status boundary", () => {
  assert.equal(message(90, []).text, "Parking likely limited");
  assert.equal(parkingStatus(90).label, "Busy");
  assert.equal(message(89, []).text, "Parking is busy");
});

test("two-hour reassurance requires complete real forecasts below 80 percent", () => {
  assert.deepEqual(message(60, rows([60, 60, 60, 60, 60])), { text: "Spaces expected for 2h", type: "roomy" });
  assert.equal(message(60, []).text, "Spaces available");
  assert.equal(message(60, rows([60, 60, 60])).text, "Spaces available");
  assert.equal(message(60, rows([60, 60, 60, 60, 60]), { lot: campus, selectedAt: at("20:30") }).type, "available");
  assert.equal(message(60, rows([60, 60, 60, 60, 60]), { lot: { ...garage, "24_hour": false } }).type, "available");
});

test("missing occupancy cannot generate a fabricated available message", () => {
  assert.equal(message(null, rows([20, 20, 20, 20, 20])).text, "Availability unavailable");
  assert.equal(message(null, [], { mode: "forecast" }).text, "Forecast unavailable");
});

test("normalization uses forecast zero instead of falling back to old live occupancy", () => {
  const lots = normalizeParkingLots({
    metadataLots: [garage],
    occupancyLots: [{ lot_id: garage.lot_id, point: 0, occupancy_pct: 60 }],
    selection: { mode: "forecast", dateISO: "2026-10-05", minutes: 540, zone },
  });
  assert.equal(lots[0].occupied, 0);
  assert.equal(lots[0].spaces, 1000);
  assert.equal(lots[0].hours, "Open 24h");
  assert.equal(lots[0].id, garage.lot_id);
});

test("metadata garages absent from occupancy retain truthful unknown values", () => {
  const lots = normalizeParkingLots({ metadataLots: [garage], selection: { mode: "live", dateISO: "2026-10-05", minutes: 540, zone } });
  assert.equal(lots.length, 1);
  assert.equal(lots[0].occupied, null);
  assert.equal(lots[0].spaces, null);
  assert.equal(lots[0].status, "Unavailable");
});

test("closed status is derived from real opening metadata even without a forecast", () => {
  const [lot] = normalizeParkingLots({ metadataLots: [campus], selection: { mode: "forecast", dateISO: "2026-10-05", minutes: 1380, zone } });
  assert.equal(lot.closed, true);
  assert.equal(lot.status, "Closed");
  assert.equal(lot.statusTone, "full");
  assert.equal(lot.alert.text, "Opens at 7 AM");
});

test("walking data uses real meters and seconds and preserves unavailable routes", () => {
  assert.deepEqual(travelForLot("a", { building: { abbreviation: "ART" }, lots: [{ lot_id: "a", distance: 432.24, duration: 311.2 }] }), {
    meters: 432.24, seconds: 311.2, minutes: 5, miles: 0.27, buildingAbbreviation: "ART",
  });
  assert.equal(travelForLot("missing", { lots: [] }), null);
  assert.equal(travelForLot("a", { lots: [{ lot_id: "a", distance: null, duration: 20 }] }), null);
});

test("last update uses actual scraped timestamps instead of the current clock", () => {
  assert.equal(latestObservation([{ scraped_at: "2026-10-05T16:00:00Z" }, { scraped_at: "2026-10-05T16:05:00Z" }, { scraped_at: "invalid" }]), "2026-10-05T16:05:00.000Z");
  assert.equal(latestObservation([]), null);
});
