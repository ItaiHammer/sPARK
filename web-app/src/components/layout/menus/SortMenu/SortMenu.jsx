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
    sortMenu: {
      isOpen,
      type: currentType,
      form: { type: formType, buildingName, buildingID },
    },
    updateSortMenu,
    toggleSortMenu,
    updateSortMenuForm,
  } = useUI();

  // Hide sort menu when building selection is open
  const isBuildingSelectionOpen =
    isOpen && formType === SORT_TYPES.DISTANCE_TO_BUILDING.value && !buildingID;

  const shouldShowSortMenu = isOpen && !isBuildingSelectionOpen;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      toggleSortMenu();
    }
  };

  const handleSortOptionClick = (sortType) => {
    if (sortType === SORT_TYPES.DISTANCE_TO_BUILDING.value) {
      // If already selected with a building, allow changing it by opening building selection
      // If not selected, open building selection menu
      updateSortMenuForm({
        type: sortType,
        // Only clear building if we want to change it - for now, always allow selection
        buildingID: null,
        buildingName: null,
      });
      return;
    }
    updateSortMenuForm({ type: sortType });
  };

  const handleApplyClick = () => {
    updateSortMenu({
      type: formType,
    });

    toggleSortMenu();
  };

  const isChanged = formType !== currentType;

  const sortOptions = Object.values(SORT_TYPES);

  return (
    <>
      <AnimatePresence>
        {shouldShowSortMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={handleBackdropClick}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-0 top-16 bottom-0 bg-white z-50 rounded-t-2xl shadow-2xl flex flex-col"
            >
              {/* Header - Fixed at top */}
              <SortMenuHeader />

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto max-w-full overflow-x-hidden mb-8">
                {/* Sort Options */}
                <div className="flex flex-col">
                  {sortOptions.map((option, index) => {
                    const isSelected = formType === option.value;
                    const isDistanceOption =
                      option.value === SORT_TYPES.DISTANCE_TO_BUILDING.value;

                    return (
                      <div key={option.value}>
                        {index > 0 && (
                          <div className="h-px bg-divider-gray/80" />
                        )}
                        <button
                          onClick={() => handleSortOptionClick(option.value)}
                          className={`w-full flex items-center gap-4 px-6 py-6 transition-colors ${
                            isSelected
                              ? "bg-main-blue text-white"
                              : "bg-white text-primary-black hover:bg-gray-50"
                          }`}
                        >
                          <img
                            src={option.icon}
                            alt=""
                            className={`w-5 h-5 ${isSelected ? "invert" : ""}`}
                            style={{
                              filter: isSelected
                                ? "brightness(0) invert(1)"
                                : "none",
                            }}
                          />
                          <span
                            className={`flex-1 text-left font-medium ${
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

              {/* Apply Button - Fixed at bottom */}
              <button
                disabled={!isChanged}
                className={`w-full py-3 rounded-full font-medium text-base transition-all ${
                  !isChanged
                    ? "bg-divider-gray text-secondary-gray cursor-not-allowed"
                    : "bg-main-blue text-white hover:bg-main-blue/80 active:bg-main-blue/80"
                }`}
                onClick={handleApplyClick}
              >
                Apply
              </button>
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
