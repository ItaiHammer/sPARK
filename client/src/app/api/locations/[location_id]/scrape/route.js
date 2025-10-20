import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import {
  errorHandler,
  successHandler,
  errorCodes,
  authValidator,
} from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { supabase } from "@/lib/supabase/supabase";
import { scrapeData } from "@/lib/helpers/scraper";

export async function GET(req, { params }) {
  // Validate API Key
  const authError = authValidator(req, process.env.SCRAPING_API_KEY);
  if (authError) {
    return NextResponse.json(errorHandler(authError.message, authError.code), {
      status: 401,
    });
  }

  // Validate Request Parameters
  const reqParams = await params;
  const { location_id } = validateRoute(reqParams, locationIDSchema);

  // Fetch Location Data
  const { data: locationData, error: locationError } = await supabase
    .from("locations")
    .select("*")
    .eq("location_id", location_id.toLowerCase());
  if (locationError) {
    return NextResponse.json(
      errorHandler(locationError, errorCodes.SUPABASE_ERROR),
      {
        status: 500,
      }
    );
  }

  if (!locationData) {
    return NextResponse.json(
      errorHandler(
        "No location found with this ID: " + location_id,
        errorCodes.LOCATION_NOT_FOUND
      ),
      {
        status: 404,
      }
    );
  }

  // Fetch Location Site
  const locationSite = locationData[0].scraping_url;
  const response = await axios.get(locationSite, {
    httpsAgent: new https.Agent({
      rejectUnauthorized: false, // Bypass SSL certificate verification
    }),
    headers: {
      "User-Agent": "sPARKs-Bot",
    },
    timeout: 1000 * 60, // 60 secs
  });
  const html = response.data;
  const data = scrapeData(html);

  // Insert data to supabase
  const { error } = await supabase.from("lot_occupancy").insert(data);
  if (error) {
    return NextResponse.json(errorHandler(error, errorCodes.SUPABASE_ERROR), {
      status: 500,
    });
  }

  return NextResponse.json(successHandler(data));
}
