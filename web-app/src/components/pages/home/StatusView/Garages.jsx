import React from "react";
import useSWR from "swr";
import Lottie from "lottie-react";

// Constants
import { getSortedLots, SORT_TYPES } from "@/lib/constants/sort";
import { DEFAULT_SWR_OPTIONS } from "@/lib/constants/api.constants";
import { BUILDING_DISTANCES_KEY } from "@/lib/constants/SWR.keys";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";
import { useLocationAPI } from "@/contexts/API/LocationAPI.context";

// Components
import GarageCard from "@/components/layout/GarageCard/GarageCard.jsx";

// Animations
import carAnimation from "@/animations/car_loading_animation.json";

function Garages({ locationId, lots }) {
  const {
    sortMenu: { type, building },
  } = useUI();

  // Fetch buildings
  const { getBuildingDistances } = useLocationAPI();
  const {
    data: rawData,
    error,
    isLoading,
  } = useSWR(
    type === SORT_TYPES.DISTANCE_TO_BUILDING.value
      ? [BUILDING_DISTANCES_KEY, locationId, building?.buildingID]
      : null,
    ([key, locationId, buildingId]) =>
      getBuildingDistances(locationId, buildingId),
    DEFAULT_SWR_OPTIONS
  );

  if (isLoading) {
    return <Lottie animationData={carAnimation} style={{ height: 200 }} loop />;
  }

  if (error || (!rawData && type === SORT_TYPES.DISTANCE_TO_BUILDING.value)) {
    return <div>Error: {error?.message || "No buildings found"}</div>;
  }

  // Adding Travel Time and Distance from lots to building
  const data = rawData?.data || [];
  const formattedLots = lots.map((lot) => ({
    ...lot,
    travel: data?.lots?.find((d) => d.lot_id === lot.lot_id) || null,
  }));

  // Sorting Lots
  const sortedLots = getSortedLots(formattedLots, type);

  return (
    <div className="GarageCardsContainer flex flex-col md:flex-row md:flex-wrap gap-8">
      {sortedLots.map((garage, i) => (
        <GarageCard
          buildingName={data?.building?.abbreviation || ""}
          garage={garage}
          order={i}
          key={"garage-card-" + garage.lot_id}
          travel={garage.travel}
        />
      ))}
    </div>
  );
}

export default Garages;
