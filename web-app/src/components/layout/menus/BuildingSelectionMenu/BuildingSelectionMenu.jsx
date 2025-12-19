"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronsUpDown, Search } from "lucide-react";
import { useParams } from "next/navigation";
import useSWR from "swr";

// Constants
import {
  DEFAULT_SWR_OPTIONS,
  getInternalAuthHeader,
} from "@/lib/constants/api.constants";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

function BuildingSelectionMenu() {
  const params = useParams();
  const locationId = params?.location_id;

  const {
    sortMenu: { isBuildingSelectionOpen, building: prevBuilding },
    closeBuildingSelectionMenu,
    selectBuildingOption,
  } = useUI();

  const [searchQuery, setSearchQuery] = useState("");
  const resetSearchQuery = () => setSearchQuery("");

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

  return (
    <AnimatePresence>
      {isBuildingSelectionOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-55"
            onClick={() => {
              resetSearchQuery();
              closeBuildingSelectionMenu();
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 26,
              mass: 1,
            }}
            className="fixed inset-x-0 top-12 bottom-0 bg-white z-60 rounded-t-2xl shadow-2xl flex flex-col "
          >
            {/* Header */}
            <div className="p-8 pb-6">
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => {
                    resetSearchQuery();
                    closeBuildingSelectionMenu();
                  }}
                  className="w-8 h-8 flex items-center justify-center text-secondary-gray transition-colors hover:text-primary-black"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900 flex-1 text-center">
                  Select Building
                </h2>
                <div className="w-8" /> {/* Spacer for centering */}
              </div>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-gray" />
                <input
                  type="text"
                  placeholder="Search Buildings"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-lg outline-none bg-fill-gray text-sm text-primary-black placeholder-secondary-gray placeholder:text-sm border-2 border-transparent focus:border-main-blue transition-all duration-200"
                />
              </div>

              {/* Sort Indicator */}
              <div className="flex items-center gap-2 text-sm text-secondary-gray">
                <span>Sorted A-Z</span>
                <ChevronsUpDown className="w-4 h-4" />
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
                      ? "No Buildings Found"
                      : "No Buildings Available"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredBuildings.map((building) => {
                    const isSelected =
                      building.building_id === prevBuilding?.buildingID;

                    return (
                      <button
                        key={building.building_id}
                        onClick={() => {
                          resetSearchQuery();
                          selectBuildingOption({
                            buildingID: building.building_id,
                            buildingName:
                              building.abbreviation || building.name,
                          });
                        }}
                        className={`w-full text-left py-6 ${
                          isSelected ? "bg-main-blue" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4 px-8">
                          <span
                            className={`font-bold ${
                              isSelected ? "text-white" : "text-primary-black"
                            }`}
                          >
                            {building.abbreviation || "N/A"}
                          </span>
                          <span
                            className={`text-sm ${
                              isSelected ? "text-white" : "text-secondary-gray"
                            } flex-1 truncate`}
                          >
                            {building.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
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
