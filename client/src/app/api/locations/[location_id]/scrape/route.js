import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import {
  errorHandler,
  successHandler,
  authValidator,
} from "@/lib/helpers/responseHandler";
import { validateRoute, locationIDSchema } from "@/lib/helpers/validator";
import { getLocationByID, insertLotOccupancy } from "@/lib/supabase/supabase";
import { scrapeData } from "@/lib/helpers/scraper";
import { decisionHandler } from "@/lib/arcjet/arcjet";

export async function GET(req, { params }) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision.message, decision.code), {
      status: decision.status,
    });
  }

  // Validate API Key
  const authError = authValidator(req, process.env.SCRAPING_API_KEY);
  if (authError) {
    return NextResponse.json(errorHandler(authError.message, authError.code), {
      status: 401,
    });
  }

  // Validate Request Parameters
  const reqParams = await params;
  const { data: validatedData, error: validationError } = validateRoute(
    reqParams,
    locationIDSchema
  );
  if (validationError || !validatedData) {
    return NextResponse.json(
      errorHandler(validationError.message, validationError.code),
      {
        status: 400,
      }
    );
  }
  const { location_id } = validatedData;
  const formattedLocationId = location_id.toLowerCase();

  // Fetch Location Data
  const { error: getLocationByIDError, data: locationData } =
    await getLocationByID(formattedLocationId);
  if (getLocationByIDError) {
    return NextResponse.json(
      errorHandler(getLocationByIDError.message, getLocationByIDError.code),
      {
        status: 500,
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
      "User-Agent": process.env.SCRAPER_USER_AGENT,
    },
    timeout: 1000 * 60, // 60 secs
  });
  const html = response.data;
  const data = scrapeData(html);

  // Insert data to supabase
  const { error: insertLotOccupancyError } = await insertLotOccupancy(data);
  if (insertLotOccupancyError) {
    return NextResponse.json(
      errorHandler(
        insertLotOccupancyError.message,
        insertLotOccupancyError.code
      ),
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
