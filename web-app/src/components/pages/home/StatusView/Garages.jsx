import React from "react";

// Constants
import { getSortedLots } from "@/lib/constants/sort";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

// Components
import GarageCard from "@/components/layout/GarageCard/GarageCard.jsx";

function Garages({ lots, numOfLots }) {
  const {
    sortMenu: { type, building },
  } = useUI();
  const sortedLots = getSortedLots(lots, type, {
    buildingID: building?.buildingID,
    buildingName: building?.buildingName,
  });

  return (
    <div className="flex flex-col gap-8">
      {numOfLots === 0
        ? "There is no forecasted data for this time and date."
        : sortedLots.map((garage, i) => (
            <GarageCard garage={garage} order={i} key={i} />
          ))}
    </div>
  );
}

export default Garages;
