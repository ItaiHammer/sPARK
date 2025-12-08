import * as cheerio from "cheerio";
import dotenv from "dotenv";
import axios from "axios";
import https from "https";
import { createClient } from "@supabase/supabase-js";

// Loads env
dotenv.config();

const parkingLots = [
  {
    id: "sjsu-south-garage",
    name: "South Garage",
    address: "377 S. 7th St., San Jose, CA 95112",
  },
  {
    id: "sjsu-west-garage",
    name: "West Garage",
    address: "350 S. 4th St., San Jose, CA 95112",
  },
  {
    id: "sjsu-north-garage",
    name: "North Garage",
    address: "65 S. 10th St., San Jose, CA 95112",
  },
  {
    id: "sjsu-south-campus-garage",
    name: "South Campus Garage",
    address: "1278 S. 10th Street, San Jose, CA 95112",
  },
];

function parsePercentageText(fullness) {
  /*
    accepts '84%', '100% Full', '53 %', 'Full', 'Open', 'N/A', etc.
    returns an int 0–100, or None when no numeric signal.
  */

  if (typeof fullness !== "string") return null;

  // word-only signals
  const formattedFullness = fullness.trim().toLowerCase();
  const acceptedValues = ["open", "n/a", "na", "-", "—"];
  if (formattedFullness === "full") {
    return 100;
  } else if (acceptedValues.includes(formattedFullness)) {
    return 0;
  }

  //  numeric anywhere in the string (e.g., '100% Full', '53 %')
  const hasNumsRegex = new RegExp(/(\d+)/, "g");
  if (hasNumsRegex.test(formattedFullness)) {
    const fullnessVal = Number(formattedFullness.replace(/\D/g, ""));
    return fullnessVal;
  }

  return null;
}

async function scrapeData() {
  const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const response = await axios.get(process.env.SCRAPING_URL, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Bypass SSL certificate verification
      }),
      headers: {
        "User-Agent": "sPARKs-Bot",
      },
      timeout: 1000 * 60, // 60 secs
    });
    const html = response.data;
    const $ = cheerio.load(html);

    const garages = $("div.garage").find("span.garage__fullness");
    garages.each(async (index, element) => {
      const garage = $(element);
      const fullness = garage.text();
      const parkingLot = parkingLots[index];
      const parsedFullness = parsePercentageText(fullness);
      const parkingLotData = {
        lot_id: parkingLot.id,
        occupancy_pct: parsedFullness,
      };

      // Insert new data to supabase
      const { error } = await supabase
        .from("lot_occupancy")
        .insert(parkingLotData);
      console.log(error);

      if (!error)
        console.log(
          `Inserted data: ${parsedFullness}% at ${parkingLot.name} - Observed at: ${lastUpdated}`
        );
    });
  } catch (error) {
    console.error("Error scraping data:", error);
  }
}

scrapeData();
