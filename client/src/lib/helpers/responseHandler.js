export const errorCodes = {
  SUPABASE_ERROR: "supabase-error",
  ZOD_ERROR: "zod-error",

  // Custom Errors
  GARAGES_NOT_FOUND: "garages-not-found",
  OCCUPANCY_NOT_FOUND: "occupancy-not-found",
  LOCATION_NOT_FOUND: "location-not-found",
  API_KEY_REQUIRED: "api-key-required",
  API_KEY_INVALID: "api-key-invalid",
};

export const errorHandler = (error, code) => {
  return {
    error: { message: error.message, code: code },
    data: null,
  };
};

export const successHandler = (data) => {
  return {
    error: null,
    data: data,
  };
};

// Return an error if the API key is invalid
export const authValidator = (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      message: "MUST provide an API key.",
      code: errorCodes.API_KEY_REQUIRED,
    };
  }

  const apiKey = authHeader?.split(" ")[1];
  if (!apiKey) {
    return {
      message: "MUST provide an API key.",
      code: errorCodes.API_KEY_REQUIRED,
    };
  }

  if (apiKey !== process.env.API_KEY) {
    return {
      message: "Invalid API key.",
      code: errorCodes.API_KEY_INVALID,
    };
  }

  return null;
};
