import {
  getLotsKey,
  getLocationKey,
  getBuildingKey,
} from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import {
  getLots,
  getLocationByID,
  getBuildingByID,
} from "@/lib/supabase/supabase";

export const getLotsData = async (location_id) => {
  const formattedLocationId = location_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getLotsKey(formattedLocationId);
  const { error: getCacheError, data: cachedData } = await getCache(key);
  if (getCacheError) {
    return {
      error: {
        message: getCacheError.message,
        code: getCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  if (cachedData) {
    return {
      error: null,
      data: JSON.parse(cachedData),
    };
  }

  // Fetch Lots Data
  const { error: getLotsError, data } = await getLots(formattedLocationId);
  if (getLotsError) {
    return {
      error: {
        message: getLotsError.message,
        code: getLotsError.code,
        status: 500,
      },
      data: null,
    };
  }

  // Cache Data
  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(data),
    interval
  );
  if (setCacheError) {
    return {
      error: {
        message: setCacheError.message,
        code: setCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  return {
    error: null,
    data,
  };
};

export const getLocationData = async (location_id) => {
  const formattedLocationId = location_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getLocationKey(formattedLocationId);
  const { error: getCacheError, data: cachedData } = await getCache(key);
  if (getCacheError) {
    return {
      error: {
        message: getCacheError.message,
        code: getCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  if (cachedData) {
    return {
      error: null,
      data: JSON.parse(cachedData),
    };
  }

  // Fetch Location Data
  const { error: getLocationByIDError, data } = await getLocationByID(
    formattedLocationId
  );
  if (getLocationByIDError) {
    return {
      error: {
        message: getLocationByIDError.message,
        code: getLocationByIDError.code,
        status: 500,
      },
      data: null,
    };
  }

  // Cache Data
  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(data),
    interval
  );
  if (setCacheError) {
    return {
      error: {
        message: setCacheError.message,
        code: setCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  return {
    error: null,
    data,
  };
};

export const getBuildingData = async (location_id, building_id) => {
  const formattedLocationId = location_id.toLowerCase();
  const formattedBuildingId = building_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getBuildingKey(
    formattedLocationId,
    formattedBuildingId
  );
  const { error: getCacheError, data: cachedData } = await getCache(key);
  if (getCacheError) {
    return {
      error: {
        message: getCacheError.message,
        code: getCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  if (cachedData) {
    return {
      error: null,
      data: JSON.parse(cachedData),
    };
  }

  // Fetch Building Data
  const { error: getBuildingByIDError, data } = await getBuildingByID(
    formattedLocationId,
    formattedBuildingId
  );
  if (getBuildingByIDError) {
    return {
      error: {
        message: getBuildingByIDError.message,
        code: getBuildingByIDError.code,
        status: 500,
      },
      data: null,
    };
  }

  // Cache Data
  const { error: setCacheError } = await setCache(
    key,
    JSON.stringify(data),
    interval
  );
  if (setCacheError) {
    return {
      error: {
        message: setCacheError.message,
        code: setCacheError.code,
        status: 500,
      },
      data: null,
    };
  }

  return {
    error: null,
    data,
  };
};
