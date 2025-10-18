import { NextResponse } from "next/server";
import { errorHandler, errorCodes } from "@/lib/helpers/responseHandler";
import { z } from "zod";

export const validateRoute = (data, schema) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return NextResponse.json(
      errorHandler(result.error.errors[0].message, errorCodes.ZOD_ERROR),
      { status: 400 }
    );
  }

  return result.data;
};

// Schemas
export const locationIDSchema = z.object({
  location_id: z.string().min(1).max(25),
});
