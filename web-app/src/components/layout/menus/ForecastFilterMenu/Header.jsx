import React from "react";
import { X } from "lucide-react";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

function Header() {
  const { toggleTimeFilter } = useUI();

  return (
    <div className="mb-8">
      <div className="pb-4 relative border-b border-divider-gray/80 mb-6">
        {/* Close Button */}
        <button
          onClick={toggleTimeFilter}
          className="absolute top-0 left-0 self-start w-8 h-8 flex items-center justify-center text-secondary-gray transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
          Filter Occupancy By
        </h2>
      </div>

      {/* Description */}
      <p className="text-sm text-secondary-gray text-center">
        View live data or set a custom date and time to forecast parking
        occupancy.
      </p>
    </div>
  );
}

export default Header;
