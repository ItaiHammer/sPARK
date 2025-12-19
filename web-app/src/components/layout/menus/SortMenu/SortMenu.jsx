"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

// Constants
import { SORT_TYPES, getSortLabel } from "@/lib/constants/sort";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

// Components
import SortMenuHeader from "./SortMenuHeader";
import BuildingSelectionMenu from "../BuildingSelectionMenu/BuildingSelectionMenu";

function SortMenu() {
  const {
    sortMenu: { isOpen, type, building },
    toggleSortMenu,
    selectSortOption,
    openBuildingSelectionMenu,
  } = useUI();
  const buildingName = building?.buildingName;
  const sortOptions = Object.values(SORT_TYPES);

  const handleSelection = (sortType) => {
    if (sortType === SORT_TYPES.DISTANCE_TO_BUILDING.value) {
      openBuildingSelectionMenu();
    } else {
      selectSortOption(sortType);
    }
  };
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={toggleSortMenu}
            />

            {/* Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 16,
                mass: 0.8,
              }}
              className="fixed inset-x-0 top-12 bottom-0 bg-white z-50 rounded-t-2xl shadow-2xl flex flex-col pb-4"
            >
              {/* Header - Fixed at top */}
              <SortMenuHeader />

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto max-w-full overflow-x-hidden mb-8">
                {/* Sort Options */}
                <div className="flex flex-col">
                  {sortOptions.map((option, index) => {
                    const isSelected = type === option.value;
                    const isDistanceOption =
                      option.value === SORT_TYPES.DISTANCE_TO_BUILDING.value;

                    return (
                      <div key={option.value}>
                        {index > 0 && (
                          <div className="h-px bg-divider-gray/80" />
                        )}
                        <button
                          onClick={() => handleSelection(option.value)}
                          className={`w-full flex items-center gap-4 px-8 py-6 transition-colors ${
                            isSelected
                              ? "bg-main-blue text-white"
                              : "bg-white text-primary-black hover:bg-gray-50"
                          }`}
                        >
                          <img
                            src={option.icon}
                            alt={option.label}
                            className={`w-4 h-4 ${isSelected ? "invert" : ""}`}
                            style={{
                              filter: isSelected
                                ? "brightness(0) invert(1)"
                                : "none",
                            }}
                          />
                          <span
                            className={`flex-1 text-left font-medium text-sm ${
                              isSelected ? "text-white" : "text-primary-black"
                            }`}
                          >
                            {isDistanceOption && buildingName
                              ? getSortLabel(option.value, buildingName)
                              : option.label}
                          </span>
                          {isDistanceOption && (
                            <ChevronRight
                              className={`w-5 h-5 ${
                                isSelected
                                  ? "text-white"
                                  : "text-secondary-gray"
                              }`}
                            />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Building Selection Menu */}
      <BuildingSelectionMenu />
    </>
  );
}

export default SortMenu;
