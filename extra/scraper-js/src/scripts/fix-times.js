import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { DateTime } from "luxon";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const convertFromUTCToLA = (time) => {
  const localTime = time.replace("+00:00", "");
  const dt = DateTime.fromISO(localTime, { zone: "America/Los_Angeles" });
  return dt.toUTC().toISO();
};

const fixLATime = (time) => {
  const dt = DateTime.fromISO(time, { zone: "America/Los_Angeles" });
  return dt.minus({ hours: 1 }).toUTC().toISO();
};

const updateObservedAt = async (total, batchSize) => {
  for (let i = 0; i < total; i += batchSize) {
    // Fetch batch
    const { data, error } = await supabase
      .from("lot_occupancy")
      .select("*")
      .order("id", { ascending: true })
      .range(i, i + batchSize - 1);

    if (error) {
      console.log(`Error fetching batch ${i / batchSize + 1}:`, error);
      return;
    }

    // Filter Out Rows that have already been corrected
    // const batch = data.filter((lot) => {
    //   return lot.scraped_at === null || !lot.scraped_at;
    // });

    const batch = data.filter((lot) => {
      const dt = DateTime.fromISO(lot.observed_at, {
        zone: "America/Los_Angeles",
      });
      const dstEnd = DateTime.fromObject(
        { year: 2025, month: 11, day: 2 },
        { zone: "America/Los_Angeles" }
      );
      return dt < dstEnd;
    });

    batch.forEach((lot) => {
      console.log(`Updating lot ${lot.id}`);
    });

    // Correct timestamps
    const updates = batch.map((lot) => ({
      ...lot,
      observed_at: fixLATime(lot.observed_at),
      scraped_at: fixLATime(lot.observed_at),
    }));

    // Bulk update batch
    const { error: updateError } = await supabase
      .from("lot_occupancy")
      .upsert(updates, { onConflict: ["id"] });

    if (updateError) {
      console.log(`Error updating batch ${i / batchSize + 1}:`, updateError);
    } else {
      console.log(`Updated batch ${i / batchSize + 1}`);
    }
  }
};

const total = 4120;
const batchSize = 100;
updateObservedAt(total, batchSize).catch(console.error);
