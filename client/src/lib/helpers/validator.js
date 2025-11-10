import { errorCodes } from "@/lib/helpers/responseHandler";
import { transportationTypes } from "@/lib/openroute/openroute";
import { z } from "zod";

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

// ---- Body Schemas ----
export const userLocationSchema = z.object({
  address: z
    .string()
    .min(3, "Address must be at least 3 characters")
    .max(255, "Address must be less than 255 characters"),
  transportation: z.enum(Object.values(transportationTypes)),
});
