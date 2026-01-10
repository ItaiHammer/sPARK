"use client";

import React, { useState, useRef, useMemo } from "react";
import { DateTime } from "luxon";

function TimeRangeSelector({ groupedData, selectedRange, onRangeChange }) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const containerRef = useRef(null);

  // Format hour for display
  const formatHour = (hour, showPeriod) => {
    if (hour === 0) return `12:00 ${showPeriod ? "am" : ""}`;
    if (hour < 12) return `${hour}:00 ${showPeriod ? "am" : ""}`;
    if (hour === 12) return `12:00 ${showPeriod ? "pm" : ""}`;
    return `${hour - 12}:00 ${showPeriod ? "pm" : ""}`;
  };

  // Format time for range labels
  const formatTimeForLabel = (dateTime, showPeriod) => {
    const hour = dateTime.hour;
    const minute = dateTime.minute;
    if (minute === 0) {
      return formatHour(hour, showPeriod);
    }
    // For non-hour marks, show hour:minute format
    const period = hour >= 12 ? " pm" : " am";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

    return `${displayHour}:${minute.toString().padStart(2, "0")}${
      showPeriod ? period : ""
    }`;
  };

  // Generate time range labels from grouped data
  const timeRanges = useMemo(() => {
    return groupedData.map((group, index) => {
      if (group.length === 0) {
        return { label: "No data", index };
      }

      const firstTime = group[0].localTime;
      const lastTime = group[group.length - 1].localTime;

      const startLabel = formatTimeForLabel(firstTime, true);
      const endLabel = formatTimeForLabel(lastTime, true);

      return {
        label: `${startLabel} - ${endLabel}`,
        index,
        hasData: true,
      };
    });
  }, [groupedData]);

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

    if (isLeftSwipe && selectedRange < timeRanges.length - 1) {
      onRangeChange(selectedRange + 1);
    }
    if (isRightSwipe && selectedRange > 0) {
      onRangeChange(selectedRange - 1);
    }
  };

  // Don't render if no groups
  if (timeRanges.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Time Range Buttons */}
      <div
        ref={containerRef}
        className="flex gap-2 md:gap-3 mb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        {timeRanges.map((range, index) => {
          const isSelected = selectedRange === index;
          return (
            <button
              key={index}
              onClick={() => onRangeChange(index)}
              className={`shrink-0 px-4 md:px-6 py-2 md:py-3 rounded-full text-sm md:text-base transition-all duration-200 ${
                isSelected
                  ? "bg-main-blue text-white"
                  : "bg-distance-fill-blue text-secondary-gray hover:bg-divider-gray"
              }`}
            >
              {range.label}
            </button>
          );
        })}
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 pt-2">
        {timeRanges.map((range, index) => {
          const isSelected = selectedRange === index;
          return (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                isSelected ? "bg-main-blue w-6" : "bg-divider-gray"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default TimeRangeSelector;
