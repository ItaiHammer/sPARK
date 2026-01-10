"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { DateTime } from "luxon";
import { getOccupancyColor, getOccupancyStatus } from "./forecastHelpers";
import TimeRangeSelector from "./TimeRangeSelector";
import LiveIcon from "../../layout/animated/LiveIcon";

const BARS_PER_GROUP = 8;

function ForecastBarChart({ data, currentForecast }) {
  const [selectedRange, setSelectedRange] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const chartRef = useRef(null);

  // Sort all data by timestamp first
  const sortedData = useMemo(() => {
    return [...data].sort(
      (a, b) => a.localTime.toMillis() - b.localTime.toMillis()
    );
  }, [data]);

  // Dynamically group timestamps into groups of 8
  const groupedData = useMemo(() => {
    const groups = [];
    for (let i = 0; i < sortedData.length; i += BARS_PER_GROUP) {
      const group = sortedData.slice(i, i + BARS_PER_GROUP);
      if (group.length > 0) {
        groups.push(group);
      }
    }
    return groups;
  }, [sortedData]);

  // Reset selected range if it becomes invalid
  useEffect(() => {
    if (selectedRange >= groupedData.length && groupedData.length > 0) {
      setSelectedRange(0);
    }
  }, [groupedData.length, selectedRange]);

  // Get the current group's data (always 8 bars or less for the last group)
  const currentGroupData = groupedData[selectedRange] || [];

  // Get current time position for live indicator line
  const currentTime = DateTime.utc();
  const currentTimeMs = currentTime.toMillis();

  // Check if current time is in the selected group
  const isInCurrentRange = useMemo(() => {
    if (currentGroupData.length === 0) return false;
    const firstTime = currentGroupData[0].localTime.toMillis();
    const lastTime =
      currentGroupData[currentGroupData.length - 1].localTime.toMillis();
    return currentTimeMs >= firstTime && currentTimeMs <= lastTime;
  }, [currentGroupData, currentTimeMs]);

  // Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedRange < groupedData.length - 1) {
      setSelectedRange((prev) => prev + 1);
    }
    if (isRightSwipe && selectedRange > 0) {
      setSelectedRange((prev) => prev - 1);
    }
  };

  // Format hour for display
  const formatHour = (hour, minute = 0) => {
    if (hour === 0) return "12am";
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return "12pm";
    return `${hour - 12}pm`;
  };

  // Calculate bar position and height for live indicator
  const getLiveIndicatorData = () => {
    if (!isInCurrentRange || !currentForecast || currentGroupData.length === 0)
      return null;

    // Find the index of the bar closest to current time
    let closestIndex = 0;
    let minDiff = Math.abs(
      currentGroupData[0].localTime.toMillis() - currentTimeMs
    );

    for (let i = 1; i < currentGroupData.length; i++) {
      const diff = Math.abs(
        currentGroupData[i].localTime.toMillis() - currentTimeMs
      );
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    // Calculate horizontal position as percentage (accounting for spacing)
    // Bars are evenly distributed, so position = (index / (total - 1)) * 100
    let horizontalPosition;
    if (currentGroupData.length === 1) {
      horizontalPosition = 50; // Center if only one bar
    } else {
      horizontalPosition = (closestIndex / (currentGroupData.length - 1)) * 100;
    }
    horizontalPosition = Math.max(2, Math.min(98, horizontalPosition));

    // Get the bar height percentage for the closest bar
    const closestBar = currentGroupData[closestIndex];
    const barHeight = closestBar.prediction_pct;

    // Calculate the height of the indicator line
    // The line should extend from top (0) down to the top of the bar
    // Since bars grow from bottom, top of bar is at: 100% - barHeight%
    // So the line height should be: 100% - barHeight%
    const lineHeight = 100 - barHeight;

    return {
      left: horizontalPosition,
      height: lineHeight,
    };
  };

  const liveIndicatorData = getLiveIndicatorData();

  return (
    <div className="w-full">
      {/* Chart Container */}
      <div
        ref={chartRef}
        className="relative w-full mb-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Bars */}
        <div className="relative flex items-end gap-1 md:gap-2 h-48 md:h-64">
          {/* Live Indicator Line and Text */}
          {liveIndicatorData && currentForecast && (
            <div
              className="absolute top-0 z-10 pointer-events-none flex flex-col items-center"
              style={{
                left: `${liveIndicatorData.left}%`,
                transform: "translateX(-50%)",
                height: `${liveIndicatorData.height}%`,
              }}
            >
              {/* Live Indicator Text */}
              <div className="flex items-center gap-2 shrink-0 mb-2">
                <LiveIcon className="mr-0!" />
                <p className="text-xs md:text-sm text-secondary-gray whitespace-nowrap">
                  <span className="font-bold text-live-red">Live:</span>{" "}
                  {getOccupancyStatus(currentForecast.prediction_pct)}
                </p>
              </div>
              {/* Live Indicator Line */}
              <div className="w-0.5 flex-1">
                <div className="w-full h-full border-l-2 border-dashed border-secondary-gray/30" />
              </div>
            </div>
          )}
          {currentGroupData.length > 0 ? (
            currentGroupData.map((item, index) => {
              const prediction = item.prediction_pct;
              // Use prediction for bar height (percentage of 100%)
              const barHeight = prediction;
              const barColor = getOccupancyColor(prediction);
              const hour = item.localTime.hour;
              const minute = item.localTime.minute;

              // Only show label for whole hours (minute === 0)
              const showLabel = minute === 0;
              const timeLabel = showLabel ? formatHour(hour) : null;

              return (
                <div
                  key={`${item.forecast_ts}-${index}`}
                  className="flex-1 flex flex-col items-center justify-end gap-1 md:gap-2 relative min-w-0"
                  style={{ flexBasis: 0, flexGrow: 1, flexShrink: 1 }}
                >
                  {/* Bar */}
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    style={{
                      height: `${barHeight}%`,
                      backgroundColor: barColor,
                      minHeight: barHeight > 0 ? "4px" : "0",
                    }}
                  />
                  {/* Time Label - only show for whole hours, but reserve space for alignment */}
                  <div className="h-5 flex items-center">
                    {showLabel && (
                      <span className="text-xs md:text-sm text-secondary-gray whitespace-nowrap text-center">
                        {timeLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="w-full text-center text-secondary-gray py-8">
              No data available for this time range
            </div>
          )}
        </div>
      </div>

      {/* Time Range Selector */}
      <TimeRangeSelector
        groupedData={groupedData}
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
      />
    </div>
  );
}

export default ForecastBarChart;
