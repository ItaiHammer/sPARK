import { errorCodes } from "@/lib/helpers/responseHandler";
import axios from "axios";
import {
  roundToTwoDecimalPlaces,
  convertToMinutes,
  convertToHours,
  convertToKM,
  convertToMiles,
} from "@/lib/utils/formatters";

// Transportation Types
export const transportationTypes = {
  driving_car: "driving-car",
  foot_walking: "foot-walking",
};

export const calculateMatrix = async (transportation, locations) => {
  const baseUrl = process.env.OPENROUTE_SERVICE_URL?.replace(/\/+$/, "");
  if (!URL.canParse(baseUrl) || !/^https?:\/\//i.test(baseUrl)) {
    console.error("OpenRouteService matrix URL is missing or invalid.");
    return {
      data: null,
      error: {
        message: "The routing service is unavailable.",
        code: errorCodes.OPENROUTESERVICE_ERROR,
      },
    };
  }

  try {
    const destinations = Array.from(
      { length: Math.max(locations.length - 1, 0) },
      (_, index) => index + 1
    );

    const res = await axios.post(
      `${baseUrl}/matrix/${transportation}`,
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
    const providerError = error.response?.data?.error;
    console.error("OpenRouteService matrix request failed.", {
      code: error.code,
      status: error.response?.status,
      providerCode: providerError?.code,
    });

    return {
      data: null,
      error: {
        message: providerError?.message || error.response?.data?.message || "The routing service could not calculate travel times.",
        code: errorCodes.OPENROUTESERVICE_ERROR,
      },
    };
  }
};

export const formatCalculateMatrixData = (
  dataPairList,
  calculateMatrixData
) => {
  return dataPairList.map((data, index) => {
    const durationInSeconds = calculateMatrixData.durations[0][index];
    const distanceInMeters = calculateMatrixData.distances[0][index];
    const snappedDistance =
      calculateMatrixData.destinations[index].snapped_distance;

    return {
      ...data,
      duration: {
        seconds: roundToTwoDecimalPlaces(durationInSeconds),
        minutes: convertToMinutes(durationInSeconds),
        hours: convertToHours(durationInSeconds),
      },
      distance: {
        meters: roundToTwoDecimalPlaces(distanceInMeters),
        kilometers: convertToKM(distanceInMeters),
        miles: convertToMiles(distanceInMeters),
      },
      snapped_distance: {
        meters: roundToTwoDecimalPlaces(snappedDistance),
        kilometers: convertToKM(snappedDistance),
        miles: convertToMiles(snappedDistance),
      },
    };
  });
};
