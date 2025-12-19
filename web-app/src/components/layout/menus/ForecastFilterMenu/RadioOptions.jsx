import React from "react";
import { DateTime } from "luxon";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

// Constants
import { FILTER_TYPES } from "@/lib/constants/filters";

// Components
import LiveIcon from "@/components/layout/animated/LiveIcon";

function RadioOptions() {
  const {
    timeFilterMenu: {
      form: { type },
    },
    updateTimeFilterForm,
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
                : "border border-divider-gray"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold text-primary-black mb-1">
                {option.value === FILTER_TYPES.LIVE.value ? <LiveIcon /> : null}
                {option.label}
              </div>
              <div className="text-sm text-secondary-gray">
                {option.value === FILTER_TYPES.LIVE.value
                  ? DateTime.now().toFormat("cccc, LL/d - h:mm a")
                  : "Select Custom Date and Time"}
              </div>
            </div>
            <div className="relative">
              <input
                type="radio"
                name="filterType"
                value={option.value}
                checked={isSelected}
                onChange={(e) => {
                  updateTimeFilterForm({ type: e.target.value });
                }}
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
