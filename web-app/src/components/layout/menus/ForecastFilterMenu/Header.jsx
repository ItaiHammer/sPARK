import React from "react";
import { X } from "lucide-react";
import { DateTime } from "luxon";

// Constants
import { FILTER_TYPES } from "@/lib/constants/filters";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

// Components
import LiveIcon from "@/components/layout/animated/LiveIcon";

function Header() {
  const {
    timeFilterMenu: { type, date },
    toggleTimeFilter,
  } = useUI();

  return (
    <div className="mb-8">
      <div className="pt-2 py-6 relative flex items-center justify-center gap-4 border-b border-divider-gray/80 mb-6">
        {/* Close Button */}
        <button
          onClick={toggleTimeFilter}
          className="absolute left-0 w-8 h-8 flex items-center justify-center text-secondary-gray transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        {/* Header */}
        <div className="flex items-center gap-2">
          <LiveIcon isLive={type === FILTER_TYPES.LIVE.value} />
          {type === FILTER_TYPES.LIVE.value ? (
            <h2 className="text-sm font-medium text-secondary-gray">
              <span className="text-base font-semibold text-primary-black">
                Live{" "}
              </span>
              {DateTime.now().toFormat("ccc, h:mm a")}
            </h2>
          ) : (
            <h2 className="text-sm font-medium text-secondary-gray">
              {DateTime.fromISO(date).toFormat("ccc, LL/d - h:mm a")}
            </h2>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-secondary-gray">
        Set a custom date and time to forecast parking occupancy or reset back
        to live data.
      </p>
    </div>
  );
}

export default Header;
