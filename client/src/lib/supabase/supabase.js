import { createClient } from "@supabase/supabase-js";
import { errorCodes } from "../helpers/responseHandler";

let supabase;
export const getSupabase = () => {
  if (global.supabase) {
    return global.supabase;
  }
  supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("Supabase Connected");

  global.supabase = supabase;
  return supabase;
};

// Locations
export const getLocationByID = async (locationID) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("location_id", locationID);

  if (error) {
    return {
      error: { message: error?.message, code: errorCodes.SUPABASE_ERROR },
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

  return { error: null, data: data[0] };
};

export const insertLotOccupancy = async (lotOccupancy) => {
  const supabase = getSupabase();
  const { error } = await supabase.from("lot_occupancy").insert(lotOccupancy);
  if (error) {
    return {
      error: { message: error?.message, code: errorCodes.SUPABASE_ERROR },
    };
  }
  return { error: null };
};

export const getLatestLotOccupancy = async (locationID) => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_latest_lot_occupancy", {
    p_location_id: locationID,
  });

  if (error) {
    return {
      error: { message: error?.message, code: errorCodes.SUPABASE_ERROR },
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
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("lots")
    .select("*")
    .eq("location_id", locationID);
  if (error) {
    return {
      error: { message: error?.message, code: errorCodes.SUPABASE_ERROR },
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

export const getBuildingByID = async (locationID, buildingID) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("buildings")
    .select("*")
    .eq("location_id", locationID)
    .eq("building_id", buildingID);

  if (error) {
    return {
      error: { message: error?.message, code: errorCodes.SUPABASE_ERROR },
      data: null,
    };
  }

  if (!data || data.length === 0) {
    return {
      error: {
        message: "Building not found",
        code: errorCodes.BUILDING_NOT_FOUND,
      },
      data: null,
    };
  }

  return { error: null, data: data[0] };
};

export const getBuildings = async (locationID) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("buildings")
    .select("*")
    .eq("location_id", locationID);
  if (error) {
    return {
      error: { message: error?.message, code: errorCodes.SUPABASE_ERROR },
      data: null,
    };
  }

  if (!data || data.length === 0) {
    return {
      error: {
        message: "No buildings found",
        code: errorCodes.BUILDINGS_NOT_FOUND,
      },
      data: null,
    };
  }

  return { error: null, data };
};

export const insertBuildingCalculations = async (buildingCalculations) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("lot_to_building_times")
    .upsert(buildingCalculations, {
      onConflict: "location_id, building_id, lot_id",
    });
  if (error) {
    return {
      error: { message: error?.message, code: errorCodes.SUPABASE_ERROR },
    };
  }

  return { error: null };
};

export const getBuildingCalculations = async (locationID, buildingID) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("lot_to_building_times")
    .select("*")
    .eq("location_id", locationID)
    .eq("building_id", buildingID);

  if (error) {
    return {
      error: { message: error?.message, code: errorCodes.SUPABASE_ERROR },
      data: null,
    };
  }

  return { error: null, data };
};
