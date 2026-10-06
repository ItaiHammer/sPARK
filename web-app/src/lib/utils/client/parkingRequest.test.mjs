import test from "node:test";
import assert from "node:assert/strict";
import { parkingRequest } from "./parkingRequest.js";

test("passes successful parking data through unchanged", async () => {
  const payload = { error: null, data: [{ lot_id: "garage" }] };
  const result = await parkingRequest("/lots", {}, async () => Response.json(payload));
  assert.deepEqual(result, payload);
});

test("preserves an API failure's reason and HTTP status for recovery", async () => {
  const payload = { error: { message: "Parking is unavailable", code: "service-error" }, data: null };
  const result = await parkingRequest("/lots", {}, async () => Response.json(payload, { status: 503 }));
  assert.deepEqual(result, { ...payload, status: 503 });
});

test("handles non-JSON error responses without throwing", async () => {
  const result = await parkingRequest("/lots", {}, async () => new Response("Unavailable", { status: 500 }));
  assert.equal(result.status, 500);
  assert.match(result.error.message, /HTTP 500/);
  assert.equal(result.data, null);
});

test("network failures reach the page as errors rather than uncaught exceptions", async () => {
  const result = await parkingRequest("/lots", {}, async () => { throw new TypeError("Failed to fetch"); });
  assert.equal(result.error.message, "Failed to fetch");
  assert.equal(result.data, null);
});

test("invalid success payloads do not become a false success", async () => {
  for (const payload of [null, [], {}, "not parking data"]) {
    const result = await parkingRequest("/lots", {}, async () => Response.json(payload));
    assert.match(result.error.message, /invalid response/);
    assert.equal(result.data, null);
  }
});
