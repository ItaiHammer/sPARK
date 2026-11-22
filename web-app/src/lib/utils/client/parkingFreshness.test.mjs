import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { freshnessLabel } from "./parkingFreshness.js";

const now = DateTime.fromISO("2026-10-06T10:30:00", { zone: "America/Los_Angeles" });

test("missing or invalid observation times stay unavailable", () => {
  for (const timestamp of [undefined, null, "", "invalid", 0]) {
    assert.equal(freshnessLabel("live", timestamp, now, now), "Update time unavailable");
    assert.equal(freshnessLabel("paused", timestamp, now, now), "Saved snapshot");
  }
});

test("live freshness changes from relative time to a dated local observation", () => {
  assert.equal(freshnessLabel("live", now.minus({ seconds: 30 }).toUTC().toISO(), now, now), "Updated just now");
  assert.equal(freshnessLabel("live", now.minus({ minutes: 59 }).toUTC().toISO(), now, now), "Updated 59m ago");
  assert.equal(freshnessLabel("live", now.minus({ hours: 1 }).toUTC().toISO(), now, now), "Updated Oct 6 · 9:30 AM");
  assert.equal(freshnessLabel("live", now.minus({ days: 1 }).toUTC().toISO(), now, now), "Updated Oct 5 · 10:30 AM");
});

test("future, paused, and historical selections keep their own status wording", () => {
  assert.equal(freshnessLabel("live", now.plus({ seconds: 20 }).toISO(), now, now), "Updated just now");
  assert.equal(freshnessLabel("paused", now.toUTC().toISO(), now, now), "Snapshot · 10:30 AM");
  assert.equal(freshnessLabel("predicted", null, now.plus({ days: 1 }), now), "Oct 7 estimate");
  assert.equal(freshnessLabel("historical", null, now, now), "Historical estimate");
});
