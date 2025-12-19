import React from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import Lottie from "lottie-react";

// Contexts
import { useLocationAPI } from "@/contexts/API/LocationAPI.context";
import { useUI } from "@/contexts/UI/UI.context";

// Constants
import { DEFAULT_SWR_OPTIONS } from "@/lib/constants/api.constants";

// Animations
import carAnimation from "@/animations/car_loading_animation.json";

function BuildingsList({ searchQuery, resetSearchQuery }) {
  const params = useParams();
  const locationId = params?.location_id;

  const {
    sortMenu: { building: prevBuilding },
    selectBuildingOption,
  } = useUI();

  // Fetch buildings
  const { getLocationBuildings } = useLocationAPI();
  const {
    data: rawData,
    error,
    isLoading,
  } = useSWR(
    locationId ? [`buildings`, locationId] : null,
    ([key, id]) => getLocationBuildings(id),
    DEFAULT_SWR_OPTIONS
  );

  if (isLoading) {
    return <Lottie animationData={carAnimation} style={{ height: 200 }} loop />;
  }

  if (error) {
    return <div>Error: {error?.message || "No buildings found"}</div>;
  }

  const buildings = rawData?.data || [];
  const filteredBuildings = buildings.filter((building) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        building.name?.toLowerCase().includes(query.toLowerCase()) ||
        building.abbreviation?.toLowerCase().includes(query.toLowerCase())
      );
    }

    return true;
  });
  const sortedBuildings = filteredBuildings.sort((a, b) => {
    const nameA = (a.abbreviation || a.name || "").toLowerCase();
    const nameB = (b.abbreviation || b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="flex-1 overflow-y-auto">
      {sortedBuildings.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-secondary-gray">
            {searchQuery ? "No Buildings Found" : "No Buildings Available"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {sortedBuildings.map((building) => {
            const isSelected =
              building.building_id === prevBuilding?.buildingID;

            return (
              <button
                key={building.building_id}
                onClick={() => {
                  resetSearchQuery();
                  selectBuildingOption({
                    buildingID: building.building_id,
                    buildingName: building.abbreviation || building.name,
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
  );
}

export default BuildingsList;
