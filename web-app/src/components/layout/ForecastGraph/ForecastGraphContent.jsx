"use client";

import React, { useState, useMemo } from "react";
import { DateTime } from "luxon";
import { ChartNoAxesColumn, ChevronDown } from "lucide-react";

// Components
import ForecastBarChart from "./ForecastBarChart";
import LiveStatusIndicator from "./LiveStatusIndicator";

function ForecastGraphContent({ forecastedData }) {
  // Process forecast data and keep in UTC timezone
  const processedData = useMemo(() => {
    if (!forecastedData || forecastedData.length === 0) return [];

    return forecastedData
      .map((item) => {
        const forecastTime = DateTime.fromISO(item.forecast_ts, {
          zone: "utc",
        });
        return {
          ...item,
          localTime: forecastTime,
          hour: forecastTime.hour,
          minute: forecastTime.minute,
        };
      })
      .sort((a, b) => a.localTime.toMillis() - b.localTime.toMillis());
  }, [forecastedData]);

  // Get current time forecast for live indicator
  const currentForecast = useMemo(() => {
    if (!processedData || processedData.length === 0) return null;

    const now = DateTime.utc();
    // Find the closest forecast to current time
    let closest = processedData[0];
    let minDiff = Math.abs(
      processedData[0].localTime.toMillis() - now.toMillis()
    );

    for (const item of processedData) {
      const diff = Math.abs(item.localTime.toMillis() - now.toMillis());
      if (diff < minDiff) {
        minDiff = diff;
        closest = item;
      }
    }

    // Only show if within 1 hour of current time
    if (minDiff < 60 * 60 * 1000) {
      return closest;
    }
    return null;
  }, [processedData]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartNoAxesColumn className="w-5 h-5 text-primary-black" />
          <h2 className="text-lg md:text-xl font-semibold text-primary-black">
            Forecast
          </h2>
        </div>
        {/* Date selector placeholder - not implementing per requirements */}
        <div className="flex items-center gap-1 text-sm text-secondary-gray">
          <span>Today, Mon</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Live Status Indicator */}
      {/* {currentForecast && (
        <LiveStatusIndicator
          forecast={currentForecast}
          currentTime={DateTime.utc()}
        />
      )} */}

      {/* Bar Chart and Time Range Selector */}
      <ForecastBarChart
        data={processedData}
        currentForecast={currentForecast}
      />

      {/* Footer */}
      <p className="text-xs text-secondary-gray text-center mt-4">
        Forecast is based on historical patterns
      </p>
    </>
  );
}

export default ForecastGraphContent;
