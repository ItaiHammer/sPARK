import opencage from "opencage-api-client";
import { errorCodes } from "../helpers/responseHandler";

export const getCoordinates = async (address) => {
  try {
    const result = await opencage.geocode({
      q: address,
      key: process.env.OPENCAGE_API_KEY,
      no_annotations: 1,
    });

    return { error: null, data: result?.results?.[0]?.geometry };
  } catch (error) {
    return {
      error: { message: error.message, code: errorCodes.OPENCAGE_ERROR },
      data: null,
    };
  }
};
