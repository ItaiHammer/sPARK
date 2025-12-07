export const errorCodes = {
  // 3rd Party Errors
  SUPABASE_ERROR: "supabase-error",
  ZOD_ERROR: "zod-error",
  REDIS_ERROR: "redis-error",
  OPENCAGE_ERROR: "opencage-error",
  OPENROUTESERVICE_ERROR: "openrouteservice-error",

  // Arcjet
  TOO_MANY_REQUESTS: "too-many-requests",
  BOTS_DETECTED: "bots-detected",
  ACCESS_DENIED: "access-denied",

  // Server
  SERVER_ERROR: "server-error",
  UNAUTHORIZED: "unauthorized",
  API_KEY_REQUIRED: "api-key-required",
  API_KEY_INVALID: "api-key-invalid",

  // Custom Errors
  LOTS_NOT_FOUND: "lots-not-found",
  OCCUPANCY_NOT_FOUND: "occupancy-not-found",
  LOCATION_NOT_FOUND: "location-not-found",
  BUILDING_NOT_FOUND: "building-not-found",
  BUILDINGS_NOT_FOUND: "buildings-not-found",
  BUILDING_CALCULATIONS_NOT_FOUND: "building-calculations-not-found",
};

export const errorHandler = (message, code) => {
  if (process.env.NODE_ENV === "development") {
    console.log("Error:", message, code);
  }

  return {
    error: {
      message: message || "An unknown error occurred.",
      code: code || errorCodes.SERVER_ERROR,
    },
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
export const authValidator = (req, internalAPIKey) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      message: "MUST provide an API key.",
      code: errorCodes.API_KEY_REQUIRED,
    };
  }

    const apiKey = authHeader?.split(' ')[1];
    if (!apiKey) {
        return {
            message: 'MUST provide an API key.',
            code: errorCodes.API_KEY_REQUIRED,
        };
    }

  if (apiKey !== internalAPIKey) {
    return {
      message: "Invalid API key.",
      code: errorCodes.API_KEY_INVALID,
    };
  }

    return null;
};
