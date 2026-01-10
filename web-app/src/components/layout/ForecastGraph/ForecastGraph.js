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

// Components
import ForecastGraphContent from "./ForecastGraphContent";

function ForecastGraph({ lotID }) {
  const { locationID } = useUI();
  const [date, setDate] = useState(DateTime.utc().toISO());
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
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-secondary-gray">Loading...</div>
      </div>
    );
  }

  if (error || !rawData) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-secondary-gray">
          {error?.message ||
            "No forecast points found for this lot on this date"}
        </div>
      </div>
    );
  }

  const data = rawData?.data;
  const forecastedData = data?.lots[0]?.forecasted_data || [];

  if (!forecastedData || forecastedData.length === 0) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-secondary-gray">
          No forecast points found for this lot on this date
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl p-4 md:p-6 shadow-sm border border-divider-gray">
      <ForecastGraphContent forecastedData={forecastedData} />
    </div>
  );
}

export default ForecastGraph;
