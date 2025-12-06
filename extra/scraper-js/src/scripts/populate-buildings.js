import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";
import slugify from "slugify";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populateBuildings() {
  const buildingsData = JSON.parse(
    fs.readFileSync("src/data/buildings.json", "utf8")
  );
  const buildings = [];
  for (const building of buildingsData) {
    const cooridnates = building.coordinates.split(",");
    buildings.push({
      building_id: slugify(building.name, { lower: true, strict: true }),
      location_id: "sjsu",
      name: building.name,
      abbreviation: building.abbreviation,
      address: building.address || "1 Washington Sq, San Jose, CA 95192",
      latitude: Number(cooridnates[0].trim()),
      longitude: Number(cooridnates[1].trim()),
      desc: building.desc,
    });
  }

  try {
    const { data, error } = await supabase.from("buildings").upsert(buildings);
    if (error) {
      throw error;
    }

    console.log(`Upserted ${buildings.length} buildings`);
  } catch (error) {
    console.error(error);
    return;
  }

  console.log("Buildings populated successfully");
}

populateBuildings().catch(console.error);
