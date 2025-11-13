import {
  getLotsKey,
  getLocationKey,
  getBuildingKey,
  getOccupancyKey,
  getBuildingCalculateKey,
  getUserCalculateKey,
} from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import {
  getLots,
  getLocationByID,
  getBuildingByID,
  getLatestLotOccupancy,
  getBuildingCalculations,
  insertBuildingCalculations,
} from "@/lib/supabase/supabase";
import {
  calculateMatrix,
  transportationTypes,
  formatCalculateMatrixData,
} from "@/lib/openroute/openroute";

// ---- Data Fetching ----
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

export const getOccupancyData = async (location_id) => {
  const formattedLocationId = location_id.toLowerCase();

  // Check if data is in Redis
  const { key, interval } = getOccupancyKey(formattedLocationId);
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

  // Fetch Occupancy Data
  const { error: getLatestLotOccupancyError, data } =
    await getLatestLotOccupancy(formattedLocationId);
  if (getLatestLotOccupancyError) {
    return {
      error: {
        message: getLatestLotOccupancyError.message,
        code: getLatestLotOccupancyError.code,
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

export const getBuildingCalculationsData = async (location_id, building_id) => {
  const formattedLocationId = location_id.toLowerCase();
  const formattedBuildingId = building_id.toLowerCase();

  // Check Cache
  const { key: buildingCalculateKey, interval: buildingCalculateInterval } =
    getBuildingCalculateKey(formattedLocationId, formattedBuildingId);
  const { error: getCacheError, data: cachedData } = await getCache(
    buildingCalculateKey
  );
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

  // Check if calculations have already been done
  const {
    error: checkBuildingCalculationsError,
    data: buildingCalculationsData,
  } = await getBuildingCalculations(formattedLocationId, formattedBuildingId);
  if (checkBuildingCalculationsError) {
    return {
      error: {
        message: checkBuildingCalculationsError.message,
        code: checkBuildingCalculationsError.code,
        status: 500,
      },
      data: null,
    };
  }

  // Getting Building Data
  const { error: getBuildingDataError, data: buildingData } =
    await getBuildingData(formattedLocationId, formattedBuildingId);
  if (getBuildingDataError) {
    return {
      error: {
        message: getBuildingDataError.message,
        code: getBuildingDataError.code,
        status: 500,
      },
      data: null,
    };
  }

  // If no calculations have been done, calculate them
  let buildingCalculations = [];
  if (!buildingCalculationsData || buildingCalculationsData.length === 0) {
    // Getting Lots Data
    const { error: getLotsDataError, data: lotsData } = await getLotsData(
      formattedLocationId,
      formattedBuildingId
    );
    if (getLotsDataError) {
      return {
        error: {
          message: getLotsDataError.message,
          code: getLotsDataError.code,
          status: 500,
        },
        data: null,
      };
    }

    // Calculate Distance & Duration from Building to Each Parking Lot
    const locations = [
      [buildingData.longitude, buildingData.latitude],
      ...lotsData.map((lot) => [lot.longitude, lot.latitude]),
    ];
    const { error: calculateMatrixError, data: calculateMatrixData } =
      await calculateMatrix(transportationTypes.foot_walking, locations);
    if (calculateMatrixError) {
      return {
        error: {
          message: calculateMatrixError.message,
          code: calculateMatrixError.code,
          status: 500,
        },
        data: null,
      };
    }

    // Format Data
    const formattedData = formatCalculateMatrixData(
      lotsData,
      calculateMatrixData
    );

    const formattedLots = formattedData.map((data) => {
      return {
        location_id: data.location_id,
        building_id: formattedBuildingId,
        lot_id: data.lot_id,
        duration: data.duration.seconds,
        distance: data.distance.meters,
      };
    });

    // Store in DB
    const { error: insertBuildingCalculationsError } =
      await insertBuildingCalculations(formattedLots);
    if (insertBuildingCalculationsError) {
      return {
        error: {
          message: insertBuildingCalculationsError.message,
          code: insertBuildingCalculationsError.code,
          status: 500,
        },
        data: null,
      };
    }

    buildingCalculations = formattedLots;
  } else {
    buildingCalculations = buildingCalculationsData.map((calculation) => {
      return {
        location_id: calculation.location_id,
        building_id: formattedBuildingId,
        lot_id: calculation.lot_id,
        duration: calculation.duration,
        distance: calculation.distance,
      };
    });
  }

  // Cache Data
  const data = {
    location_id: formattedLocationId,
    building_id: formattedBuildingId,
    building: buildingData,
    lots: buildingCalculations,
  };
  const { error: cacheDataError } = await setCache(
    buildingCalculateKey,
    JSON.stringify(data),
    buildingCalculateInterval
  );
  if (cacheDataError) {
    return {
      error: {
        message: cacheDataError.message,
        code: cacheDataError.code,
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

export const getUserCalculationsData = async (
  location_id,
  address,
  coordinates,
  transportation
) => {
  const formattedLocationID = location_id.toLowerCase();

  // Check if data is in Cache
  const { key: calculateKey, interval: calculateInterval } =
    getUserCalculateKey(formattedLocationID, address, transportation);
  const { error: getCalculateCacheError, data: cachedCalculateData } =
    await getCache(calculateKey);
  if (getCalculateCacheError) {
    return {
      error: {
        message: getCalculateCacheError.message,
        code: getCalculateCacheError.code,
        status: 500,
      },
      data: null,
    };
  }
  if (cachedCalculateData) {
    return {
      error: null,
      data: JSON.parse(cachedCalculateData),
    };
  }

  // Getting Lots Data
  const { error: getLotsDataError, data: lotsData } = await getLotsData(
    formattedLocationID
  );
  if (getLotsDataError || !lotsData) {
    return {
      error: getLotsDataError,
      data: null,
    };
  }

  // Calculate Distance Between User and Parking Lots
  const locations = [
    [coordinates.longitude, coordinates.latitude],
    ...lotsData.map((lot) => [lot.longitude, lot.latitude]),
  ];
  const { error: calculateMatrixError, data: calculateMatrixData } =
    await calculateMatrix(transportation, locations);
  if (calculateMatrixError) {
    return {
      error: {
        message: calculateMatrixError.message,
        code: calculateMatrixError.code,
        status: 500,
      },
      data: null,
    };
  }

  // Format Data
  const formattedData = formatCalculateMatrixData(
    lotsData,
    calculateMatrixData
  );

  // Cache Data
  const data = {
    address,
    coordinates,
    transportation,
    lots: formattedData,
  };
  const { error: cacheDataError } = await setCache(
    calculateKey,
    JSON.stringify(data),
    calculateInterval
  );
  if (cacheDataError) {
    return {
      error: {
        message: cacheDataError.message,
        code: cacheDataError.code,
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
