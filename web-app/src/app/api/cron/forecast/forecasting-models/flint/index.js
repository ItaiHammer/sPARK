import { DateTime } from "luxon";

const PACIFIC = "America/Los_Angeles";
const PHASE_FIELDS = "term_type,phase,is_instruction_day,is_holiday";

async function read(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function loadForecastInputs(supabase, lots, start, end, issuedAt) {
  const terms = await read(supabase.from("academic_terms")
    .select("term_id,term_type,term_start,term_end,instruction_start")
    .eq("location_id", "sjsu").order("term_start"));
  if (!terms.length) throw new Error("Missing SJSU academic terms");

  const recentStart = start.minus({ weeks: 3 });
  const termTypes = new Map(terms.map(term => [term.term_id, term.term_type]));
  const days = await read(supabase.from("academic_calendar_days")
    .select("calendar_date,term_id,phase,is_instruction_day,is_holiday")
    .eq("location_id", "sjsu").gte("calendar_date", recentStart.toISODate())
    .lte("calendar_date", end.toISODate()));
  for (const day of days) day.term_type = termTypes.get(day.term_id) ?? "break";

  const openingStarts = terms
    .filter(term => ["spring", "fall"].includes(term.term_type))
    .map(term => DateTime.fromISO(term.instruction_start, { zone: PACIFIC }));
  const containsOpening = openingStarts.some(day => day <= end && day.plus({ days: 7 }) > start);
  const recentEnd = issuedAt.setZone(PACIFIC);
  const ranges = [[recentStart, recentEnd]];
  if (containsOpening) {
    for (const day of openingStarts.filter(day => day <= end && day < recentStart)) {
      ranges.push([day, DateTime.min(day.plus({ days: 7 }), recentStart)]);
    }
  }

  const readings = [];
  for (const [from, to] of ranges) {
    let lastId = 0;
    for (;;) {
      const page = await read(supabase.from("parking_occupancy_features")
        .select("occupancy_id,lot_id,scraped_at,occupancy_pct," + PHASE_FIELDS)
        .eq("location_id", "sjsu").in("lot_id", lots)
        .gte("scraped_at", from.toUTC().toISO()).lt("scraped_at", to.toUTC().toISO())
        .gt("occupancy_id", lastId).order("occupancy_id").limit(1000));
      if (!page.length) break;
      readings.push(...page);
      lastId = page.at(-1).occupancy_id;
    }
  }
  return { terms, days, readings };
}

export async function predictFlint({ slots, readings, terms, days, issuedAt }) {
  const origin = process.env.FLINT_SERVICE_URL;
  if (!origin) throw new Error("Missing Flint service binding");
  const response = await fetch(new URL("/predict", origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slots, readings, terms, days, issuedAt }),
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Flint inference failed (${response.status})`);
  const { predictions } = await response.json();
  if (!Array.isArray(predictions) || predictions.length !== slots.length ||
      predictions.some(value => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error("Invalid Flint prediction batch");
  }
  return predictions;
}
