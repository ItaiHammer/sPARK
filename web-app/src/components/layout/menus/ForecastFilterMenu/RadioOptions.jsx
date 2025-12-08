import React from "react";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

// Constants
import { FILTER_TYPES } from "@/lib/constants/filters";

// Components
import LiveIcon from "@/components/layout/animated/LiveIcon";

function RadioOptions() {
  const {
    timeFilterMenu: { type, date },
    updateTimeFilterMenu,
  } = useUI();
  const options = Object.values(FILTER_TYPES);

  return (
    <div className="flex flex-col gap-4 mb-8">
      {options.map((option) => {
        const isSelected = type === option.value;

        return (
          <label
            key={`radio-option-${option.value}`}
            className={`gap-4 cursor-pointer group flex items-start rounded-xl p-4 ${
              isSelected
                ? "border-2 border-main-blue bg-main-blue/5"
                : "border-1 border-divider-gray"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold text-primary-black mb-1">
                {option.value === FILTER_TYPES.LIVE.value ? <LiveIcon /> : null}
                {option.label}
              </div>
              <div className="text-sm text-secondary-gray">
                {option.value === FILTER_TYPES.LIVE.value
                  ? date.toFormat("cccc, LL/d - hh:mm a")
                  : "Select Custom Date and Time"}
              </div>
            </div>
            <div className="relative">
              <input
                type="radio"
                name="filterType"
                value={option.value}
                checked={isSelected}
                onChange={(e) => updateTimeFilterMenu({ type: e.target.value })}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "border-main-blue bg-main-blue"
                    : "border-gray-300 group-hover:border-gray-400"
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default RadioOptions;
