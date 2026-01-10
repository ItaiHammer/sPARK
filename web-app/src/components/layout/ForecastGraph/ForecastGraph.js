"use client";

import React, { useState } from "react";
import { DateTime } from "luxon";
import useSWR from "swr";

// Constants
import { LOT_FORECAST_POINTS_KEY } from "@/lib/constants/SWR.keys";
import { DEFAULT_SWR_OPTIONS } from "@/lib/constants/api.constants";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";
import { useLocationAPI } from "@/contexts/API/LocationAPI.context";

function ForecastGraph({ lotID }) {
  const { locationID } = useUI();
  const [date] = useState(DateTime.utc().toISO());
  const { getLotForecastPoints } = useLocationAPI();

  // Fetch forecast points
  const {
    data: rawData,
    error,
    isLoading,
  } = useSWR(
    [LOT_FORECAST_POINTS_KEY, locationID, lotID, date],
    ([key, locationID, lotID, date]) =>
      getLotForecastPoints(locationID, lotID, date),
    DEFAULT_SWR_OPTIONS
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-secondary-gray">Loading...</div>
      </div>
    );
  }

  if (error || !rawData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-occupancy-red">
          Error:{" "}
          {error?.message ||
            "No forecast points found for this lot on this date"}
        </div>
      </div>
    );
  }

  const data = rawData?.data;
  const forecastedData = data?.forecasted_data;
  return <div>ForecastGraph</div>;
}

export default ForecastGraph;
