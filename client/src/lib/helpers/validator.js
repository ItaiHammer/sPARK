import { errorCodes } from "@/lib/helpers/responseHandler";
import { transportationTypes } from "@/lib/openroute/openroute";
import { scoringModels } from "@/lib/helpers/api.helpers";
import * as z from "zod";

export const validateRoute = (data, schema) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = {};

    result.error?.issues.forEach((error) => {
      errorMessages[error.path[0]] = error.message;
    });

    return {
      error: {
        message: errorMessages,
        code: errorCodes.ZOD_ERROR,
      },
      data: null,
    };
  }

  return { data: result.data, error: null };
};

// ---- Params Schemas ----
export const locationIDSchema = z.object({
  location_id: z
    .string()
    .min(3, "Location ID must be at least 3 characters")
    .max(25, "Location ID must be less than 25 characters"),
});

export const buildingIDSchema = z.object({
  location_id: z
    .string()
    .min(3, "Location ID must be at least 3 characters")
    .max(25, "Location ID must be less than 25 characters"),
  building_id: z
    .string()
    .min(3, "Building ID must be at least 3 characters")
    .max(25, "Building ID must be less than 25 characters"),
});

// ---- Body Schemas ----
export const userLocationSchema = z.object({
  address: z
    .string()
    .min(3, "Address must be at least 3 characters")
    .max(255, "Address must be less than 255 characters"),
});

export const coorindatesSchema = z.object({
  address: z
    .string()
    .min(3, "Address must be at least 3 characters")
    .max(255, "Address must be less than 255 characters"),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  transportation: z.enum(Object.values(transportationTypes)),
});

export const suggestionsSchema = z.object({
  scoring_model: z.enum(Object.values(scoringModels)),
  arrival_time: z.iso.datetime("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
  user_to_lots: z.array(
    z.object({
      lot_id: z.string(),
      duration: z.number(),
    })
  ),
  building_to_lots: z.array(
    z.object({
      lot_id: z.string(),
      duration: z.number(),
    })
  ),
});
