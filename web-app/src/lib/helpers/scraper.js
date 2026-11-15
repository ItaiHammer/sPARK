import { Agent } from "node:https";
import tls from "node:tls";
import axios from "axios";
import * as cheerio from "cheerio";
import { DateTime } from "luxon";
import { LOTS } from "../constants/sjsu.js";
import { sjsuIssuingCertificate } from "./sjsu-issuing-certificate.js";

const sjsuHost = "sjsuparkingstatus.sjsu.edu";
const lotIdsByName = new Map(Object.entries(LOTS).map(([id, name]) => [name.toLowerCase(), id]));
const verifiedAgent = new Agent({ rejectUnauthorized: true });
const sjsuAgent = new Agent({
  // Complete the chain for this host while still requiring a trusted root.
  ca: [...(tls.getCACertificates?.("default") ?? tls.rootCertificates), sjsuIssuingCertificate],
  allowPartialTrustChain: false,
  rejectUnauthorized: true,
});

export async function fetchParkingOccupancy(sourceUrl, locationId, userAgent) {
  const source = new URL(sourceUrl);
  if (source.protocol !== "https:") throw new Error("Parking sources must use HTTPS.");

  const response = await axios.get(source.href, {
    httpsAgent: source.hostname === sjsuHost ? sjsuAgent : verifiedAgent,
    maxRedirects: 0,
    headers: { "User-Agent": userAgent },
    timeout: 15_000,
  });
  return scrapeData(response.data, locationId);
}

function parsePercentageText(fullness) {
  const value = fullness.trim().toLowerCase();
  if (value === "full") return 100;
  const match = /^(\d+(?:\.\d+)?)\s*%(?:\s+full)?$/.exec(value);
  const percentage = match ? Number(match[1]) : null;
  return percentage !== null && percentage <= 100 ? percentage : null;
}

export function scrapeData(html, locationID) {
  const $ = cheerio.load(html);
  const readings = [];
  const seen = new Set();
  const scrapedAt = DateTime.utc().toISO();

  for (const element of $(".garage > .garage__name").toArray()) {
    const heading = $(element);
    const lotId = lotIdsByName.get(heading.text().trim().toLowerCase());
    if (!lotId) continue;
    const fullness = heading.next(".garage__text").find(".garage__fullness");
    if (seen.has(lotId) || fullness.length !== 1) throw new Error("Ambiguous parking reading.");

    seen.add(lotId);
    readings.push({
      lot_id: lotId,
      location_id: locationID,
      occupancy_pct: parsePercentageText(fullness.text()),
      scraped_at: scrapedAt,
    });
  }

  if (seen.size !== lotIdsByName.size) throw new Error("Incomplete garage feed.");
  return readings;
}
