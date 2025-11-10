import { createClient } from "@supabase/supabase-js";
import { errorCodes } from "../helpers/responseHandler";

export const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Locations
export const getLocationByID = async (locationID) => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("location_id", locationID);

  if (error) {
    return {
      error: { message: error.message, code: errorCodes.SUPABASE_ERROR },
      data: null,
    };
  }

  if (!data || data.length === 0) {
    return {
      error: {
        message: "Location not found",
        code: errorCodes.LOCATION_NOT_FOUND,
      },
      data: null,
    };
  }

  return { error: null, data };
};

export const insertLotOccupancy = async (lotOccupancy) => {
  const { error } = await supabase.from("lot_occupancy").insert(lotOccupancy);
  if (error) {
    return {
      error: { message: error.message, code: errorCodes.SUPABASE_ERROR },
    };
  }
  return { error: null };
};

export const getLatestLotOccupancy = async (locationID) => {
  const { data, error } = await supabase.rpc("get_latest_lot_occupancy", {
    p_location_id: locationID,
  });

  if (error) {
    return {
      error: { message: error.message, code: errorCodes.SUPABASE_ERROR },
      data: null,
    };
  }

  if (!data || data.length === 0) {
    return {
      error: {
        message: "No occupancy data found",
        code: errorCodes.OCCUPANCY_NOT_FOUND,
      },
      data: null,
    };
  }

  return { error: null, data };
};

export const getLots = async (locationID) => {
  const { data, error } = await supabase
    .from("lots")
    .select("*")
    .eq("location_id", locationID);
  if (error) {
    return {
      error: { message: error.message, code: errorCodes.SUPABASE_ERROR },
      data: null,
    };
  }

  if (!data || data.length === 0) {
    return {
      error: { message: "No lots found", code: errorCodes.LOTS_NOT_FOUND },
      data: null,
    };
  }

  return { error: null, data };
};
