import { errorCodes } from "@/lib/helpers/responseHandler";
import axios from "axios";

// Transportation Types
export const transportationTypes = {
  driving_car: "driving-car",
  foot_walking: "foot-walking",
};

export const calculateMatrix = async (transportation, locations) => {
  try {
    const destinations = Array.from(
      { length: Math.max(locations.length - 1, 0) },
      (_, index) => index + 1
    );

    const res = await axios.post(
      process.env.OPENROUTE_SERVICE_URL + "/matrix/" + transportation,
      JSON.stringify({
        locations,
        sources: [0],
        destinations,
        metrics: ["duration", "distance"],
      }),
      {
        headers: {
          Authorization: process.env.OPENROUTE_SERVICE_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return { data: res.data, error: null };
  } catch (error) {
    console.log(error);

    return {
      data: null,
      error: {
        message: error.response.data.message,
        code: errorCodes.OPENROUTESERVICE_ERROR,
      },
    };
  }
};
