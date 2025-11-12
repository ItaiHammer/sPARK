import { NextResponse } from "next/server";
import { errorHandler, successHandler } from "@/lib/helpers/responseHandler";
import { validateRoute, buildingIDSchema } from "@/lib/helpers/validator";
import { getLotsData, getBuildingData } from "@/lib/helpers/api.helpers";
import { decisionHandler } from "@/lib/arcjet/arcjet";
import {
  calculateMatrix,
  transportationTypes,
  formatCalculateMatrixData,
} from "@/lib/openroute/openroute";
import { getBuildingCalculateKey } from "@/lib/redis/redis.keys";
import { getCache, setCache } from "@/lib/redis/redis";
import {
  insertBuildingCalculations,
  getBuildingCalculations,
} from "@/lib/supabase/supabase";

export async function GET(req, { params }) {
  // Arcjet Protection
  const decision = await decisionHandler(req);
  if (decision.isDenied) {
    return NextResponse.json(errorHandler(decision.message, decision.code), {
      status: decision.status,
    });
  }

  // Validate Request Parameters
  const reqParams = await params;
  const { error: paramValidationError, data: validatedParams } = validateRoute(
    reqParams,
    buildingIDSchema
  );
  if (paramValidationError || !validatedParams) {
    return NextResponse.json(
      errorHandler(paramValidationError.message, paramValidationError.code),
      {
        status: 400,
      }
    );
  }
  const { location_id, building_id } = validatedParams;
  const formattedLocationId = location_id.toLowerCase();
  const formattedBuildingId = building_id.toLowerCase();

  // Check Cache
  const { key: buildingCalculateKey, interval: buildingCalculateInterval } =
    getBuildingCalculateKey(formattedLocationId, formattedBuildingId);
  const { error: getCacheError, data: cachedData } = await getCache(
    buildingCalculateKey
  );
  if (getCacheError) {
    return NextResponse.json(
      errorHandler(getCacheError.message, getCacheError.code),
      {
        status: getCacheError.status,
      }
    );
  }

  if (cachedData) {
    return NextResponse.json(successHandler(JSON.parse(cachedData)));
  }

  // Check if calculations have already been done
  const {
    error: checkBuildingCalculationsError,
    data: buildingCalculationsData,
  } = await getBuildingCalculations(formattedLocationId, formattedBuildingId);
  if (checkBuildingCalculationsError) {
    return NextResponse.json(
      errorHandler(
        checkBuildingCalculationsError.message,
        checkBuildingCalculationsError.code
      ),
      {
        status: checkBuildingCalculationsError.status,
      }
    );
  }

  // Getting Building Data
  const { error: getBuildingDataError, data: buildingData } =
    await getBuildingData(formattedLocationId, formattedBuildingId);
  if (getBuildingDataError) {
    return NextResponse.json(
      errorHandler(getBuildingDataError.message, getBuildingDataError.code),
      {
        status: getBuildingDataError.status,
      }
    );
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
      return NextResponse.json(
        errorHandler(getLotsDataError.message, getLotsDataError.code),
        {
          status: getLotsDataError.status,
        }
      );
    }

    // Calculate Distance & Duration from Building to Each Parking Lot
    const locations = [
      [buildingData.longitude, buildingData.latitude],
      ...lotsData.map((lot) => [lot.longitude, lot.latitude]),
    ];
    const { error: calculateMatrixError, data: calculateMatrixData } =
      await calculateMatrix(transportationTypes.foot_walking, locations);
    if (calculateMatrixError) {
      return NextResponse.json(
        errorHandler(calculateMatrixError.message, calculateMatrixError.code),
        {
          status: 500,
        }
      );
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
      return NextResponse.json(
        errorHandler(
          insertBuildingCalculationsError.message,
          insertBuildingCalculationsError.code
        ),
        {
          status: 500,
        }
      );
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
    return NextResponse.json(
      errorHandler(cacheDataError.message, cacheDataError.code),
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(successHandler(data));
}
