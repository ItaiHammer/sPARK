import test from "node:test";
import assert from "node:assert/strict";
import { createLiveOccupancy } from "./liveOccupancy.js";

const reading = (lot_id, minute, occupancy_pct = 40) => ({
  location_id: "sjsu", lot_id, occupancy_pct,
  scraped_at: `2026-11-22T18:${String(minute).padStart(2, "0")}:00Z`,
});
const response = (...lots) => ({ location_id: "sjsu", lots });

test("Realtime changes existing garage data without another API call", async () => {
  const live = createLiveOccupancy("SJSU");
  let calls = 0;
  await live.read(async () => { calls++; return response(reading("north", 0), reading("south", 0)); });
  assert.equal(live.update(reading("north", 30, 70)), true);
  assert.equal(live.getData().lots.length, 2);
  assert.equal(live.getData().lots[0].occupancy_pct, 70);
  assert.equal(live.getData().lots[1].occupancy_pct, 40);
  assert.equal(calls, 1);
});

test("new timestamps update freshness even if counts match; stale, duplicate and wrong-campus events are ignored", async () => {
  const live = createLiveOccupancy("sjsu");
  await live.read(async () => response(reading("north", 0)));
  assert.equal(live.update(reading("north", 30)), true);
  for (const row of [reading("north", 0), reading("north", 30),
    { ...reading("north", 45), location_id: "other" }, { ...reading("north", 45), scraped_at: null }]) {
    assert.equal(live.update(row), false);
  }
  assert.equal(live.getData().lots[0].scraped_at, reading("north", 30).scraped_at);
});

test("events during initial loading are buffered without replacing the full initial garage list", async () => {
  const live = createLiveOccupancy("sjsu");
  let finish;
  const request = live.read(() => new Promise((resolve) => { finish = resolve; }));
  assert.equal(live.update(reading("north", 30, 70)), false);
  assert.equal(live.getData(), null);
  finish(response(reading("north", 0), reading("south", 0)));
  const result = await request;
  assert.equal(result.lots.length, 2);
  assert.equal(result.lots.find((lot) => lot.lot_id === "north").occupancy_pct, 70);
});

test("reconnect storms share one in-flight request and reuse it for one minute", async (t) => {
  let now = 100000;
  t.mock.method(Date, "now", () => now);
  const live = createLiveOccupancy("sjsu");
  let calls = 0;
  let finish;
  const fetch = () => { calls++; return new Promise((resolve) => { finish = resolve; }); };
  const requests = Array.from({ length: 20 }, () => live.read(fetch));
  finish(response(reading("north", 0)));
  await Promise.all(requests);
  await live.read(fetch);
  assert.equal(calls, 1);
  now += 60001;
  const recovered = await live.read(async () => { calls++; return response(reading("north", 30)); });
  assert.equal(calls, 2);
  assert.equal(recovered.lots[0].scraped_at, reading("north", 30).scraped_at);
});

test("a cached API response cannot overwrite a newer pushed reading", async (t) => {
  let now = 100000;
  t.mock.method(Date, "now", () => now);
  const live = createLiveOccupancy("sjsu");
  await live.read(async () => response(reading("north", 0)));
  live.update(reading("north", 30, 80));
  now += 60001;
  const result = await live.read(async () => response(reading("north", 0, 10)));
  assert.equal(result.lots[0].occupancy_pct, 80);
});

test("failed recovery requests also have a cooldown and can recover afterward", async (t) => {
  let now = 100000;
  t.mock.method(Date, "now", () => now);
  const live = createLiveOccupancy("sjsu");
  let calls = 0;
  const offline = async () => { calls++; throw new Error("Offline"); };
  await assert.rejects(live.read(offline), /Offline/);
  await assert.rejects(live.read(offline), /Offline/);
  assert.equal(calls, 1);
  now += 60001;
  assert.equal((await live.read(async () => response(reading("north", 30)))).lots.length, 1);
});
