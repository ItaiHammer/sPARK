import React from "react";
import { X } from "lucide-react";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

function SortMenuHeader() {
  const { closeSortMenu } = useUI();

  return (
    <div className="py-8 relative border-b border-divider-gray/80 w-full">
      <div className="px-8 relative">
        {/* Close Button */}
        <button
          onClick={closeSortMenu}
          className="absolute top-0 left-6 self-start w-8 h-8 flex items-center justify-center text-secondary-gray transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <h2 className="text-xl font-semibold text-primary-black text-center">
          Sort By
        </h2>
      </div>
    </div>
  );
}

export default SortMenuHeader;
