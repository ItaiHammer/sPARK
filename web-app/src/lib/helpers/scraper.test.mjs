import assert from "node:assert/strict";
import test from "node:test";
import { fetchParkingOccupancy, scrapeData } from "./scraper.js";

const readings = [
  ["North Garage", "24.5 %"],
  ["South Garage", "0 %"],
  ["West Garage", "Full"],
  ["South Campus Garage", "N/A"],
];

function feed(garages) {
  return `<div class="garage">${garages.map(([name, fullness]) => `
    <h2 class="garage__name">${name}</h2>
    <p class="garage__text"><span class="garage__fullness">${fullness}</span></p>
  `).join("")}</div>`;
}

test("maps each named garage to its own reading regardless of the feed order", () => {
  const parsed = scrapeData(feed([...readings].reverse()), "sjsu");
  const byLotId = Object.fromEntries(parsed.map(({ lot_id, occupancy_pct }) => [lot_id, occupancy_pct]));
  assert.deepEqual(byLotId, {
    "sjsu-north-garage": 24.5,
    "sjsu-south-garage": 0,
    "sjsu-west-garage": 100,
    "sjsu-south-campus-garage": null,
  });
  assert.equal(new Set(parsed.map(({ scraped_at }) => scraped_at)).size, 1);
});

test("preserves ambiguous or out-of-range readings as unknown", () => {
  const fullness = ["Open", "101 %", "—", "-5%"];
  const parsed = scrapeData(feed(readings.map(([name], index) => [name, fullness[index]])), "sjsu");
  assert.deepEqual(parsed.map(({ occupancy_pct }) => occupancy_pct), [null, null, null, null]);
});

test("rejects incomplete or duplicate garage data before publishing a snapshot", () => {
  assert.throws(() => scrapeData(feed(readings.slice(1)), "sjsu"), /incomplete garage feed/i);
  assert.throws(() => scrapeData(feed([...readings, readings[0]]), "sjsu"), /ambiguous parking reading/i);
});

test("rejects insecure source URLs before making a request", async () => {
  await assert.rejects(fetchParkingOccupancy("http://example.invalid/", "sjsu"), /must use HTTPS/);
});

test("rejects sources outside the approved SJSU HTTPS origin", async () => {
  await assert.rejects(fetchParkingOccupancy("https://example.invalid/", "sjsu"), /unexpected SJSU parking source/i);
});
