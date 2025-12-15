"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { useParams } from "next/navigation";
import useSWR from "swr";

// Constants
import {
  DEFAULT_SWR_OPTIONS,
  getInternalAuthHeader,
} from "@/lib/constants/api.constants";
import { SORT_TYPES } from "@/lib/constants/sort";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

function BuildingSelectionMenu() {
  const params = useParams();
  const locationId = params?.location_id;

  const {
    sortMenu: {
      isOpen: sortMenuIsOpen,
      form: { type: formType, buildingId },
    },
    updateSortMenuForm,
  } = useUI();

  const [searchQuery, setSearchQuery] = useState("");

  // Check if building selection menu should be open
  // It should be open when sort menu is open, distance_to_building is selected, and no building is selected yet
  const isOpen =
    sortMenuIsOpen &&
    formType === SORT_TYPES.DISTANCE_TO_BUILDING.value &&
    !buildingId;

  // Fetch buildings
  const { data: buildingsData, isLoading } = useSWR(
    locationId ? [`buildings`, locationId] : null,
    ([key, id]) =>
      fetch(`/api/locations/${id}/buildings`, getInternalAuthHeader())
        .then((res) => res.json())
        .then((res) => res.data),
    DEFAULT_SWR_OPTIONS
  );

  const buildings = buildingsData || [];

  // Filter and sort buildings
  const filteredBuildings = useMemo(() => {
    if (!buildings.length) return [];

    let filtered = buildings;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = buildings.filter(
        (building) =>
          building.name?.toLowerCase().includes(query) ||
          building.abbreviation?.toLowerCase().includes(query)
      );
    }

    // Sort A-Z
    return filtered.sort((a, b) => {
      const nameA = (a.abbreviation || a.name || "").toLowerCase();
      const nameB = (b.abbreviation || b.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [buildings, searchQuery]);

  const handleBackClick = () => {
    // Go back to sort menu - keep distance_to_building selected but clear building selection
    // This allows user to cancel building selection
    updateSortMenuForm({
      type: SORT_TYPES.DISTANCE_TO_BUILDING.value,
      buildingId: null,
      buildingName: null,
    });
  };

  const handleBuildingClick = (building) => {
    updateSortMenuForm({
      type: SORT_TYPES.DISTANCE_TO_BUILDING.value,
      buildingId: building.building_id,
      buildingName: building.abbreviation || building.name,
    });
    // This will close the building selection menu and return to sort menu
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleBackClick();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-[55]"
            onClick={handleBackdropClick}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 bottom-0 bg-white z-[60] rounded-t-2xl shadow-2xl flex flex-col p-6"
          >
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={handleBackClick}
                  className="w-8 h-8 flex items-center justify-center text-secondary-gray transition-colors hover:text-primary-black"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900 flex-1 text-center">
                  Select Building:
                </h2>
                <div className="w-8" /> {/* Spacer for centering */}
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-gray" />
                <input
                  type="text"
                  placeholder="search buildings"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-divider-gray bg-fill-gray text-primary-black placeholder-secondary-gray focus:outline-none focus:ring-2 focus:ring-main-blue/20"
                />
              </div>

              {/* Sort Indicator */}
              <div className="flex items-center gap-2 text-sm text-secondary-gray mb-4">
                <span>Sorted A-Z</span>
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4 0L7.4641 6H0.535898L4 0Z" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Buildings List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-secondary-gray">Loading buildings...</p>
                </div>
              ) : filteredBuildings.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-secondary-gray">
                    {searchQuery
                      ? "No buildings found"
                      : "No buildings available"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredBuildings.map((building, index) => (
                    <button
                      key={building.building_id}
                      onClick={() => handleBuildingClick(building)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-divider-gray/30 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-primary-black">
                          {building.abbreviation || "N/A"}
                        </span>
                        <span className="text-sm text-secondary-gray flex-1 truncate">
                          {building.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BuildingSelectionMenu;
