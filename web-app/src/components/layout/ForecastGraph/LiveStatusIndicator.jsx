"use client";

import React from "react";
import { DateTime } from "luxon";
import { getOccupancyStatus } from "./forecastHelpers";

// Components
import LiveIcon from "../../layout/animated/LiveIcon";

function LiveStatusIndicator({ forecast, currentTime }) {
  if (!forecast) return null;

  const status = getOccupancyStatus(forecast.prediction_pct);
  const forecastTime = forecast.localTime;
  const currentHour = currentTime.hour;
  const currentMinute = currentTime.minute;

  return (
    <div className="flex items-center gap-2 mb-4 relative">
      {/* Red Dot */}
      <LiveIcon className="mr-0!" />

      {/* Status Text */}
      <p className="text-sm md:text-base text-secondary-gray">
        <span className="font-bold text-live-red">Live:</span> {status}
      </p>
    </div>
  );
}

export default LiveStatusIndicator;
