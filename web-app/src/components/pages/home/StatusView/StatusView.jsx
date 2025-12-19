"use client";

import React from "react";
import { motion } from "framer-motion";
import useSWR from "swr";
import Lottie from "lottie-react";

// Constants
import { DEFAULT_SWR_OPTIONS } from "@/lib/constants/api.constants";
import { FILTER_TYPES } from "@/lib/constants/filters";

// Contexts
import { useForecastAPI } from "@/contexts/API/ForecastAPI.context";
import { useUI } from "@/contexts/UI/UI.context";
import { useLocationAPI } from "@/contexts/API/LocationAPI.context";

// Constants
import { getSortLabel } from "@/lib/constants/sort";

// CSS
import styles from "./StatusViewPage.module.css";

// Components
import FilterButtons from "./FilterButtons";
import Garages from "./Garages";

// Animations
import carAnimation from "@/animations/car_loading_animation.json";

export default function StatusViewPage({ locationId }) {
  const {
    timeFilterMenu: { date, type },
    sortMenu: { type: sortType, building },
  } = useUI();

  // Get Forecast Points
  const { getLatestOccupancy } = useLocationAPI();
  const { getForecastPoints } = useForecastAPI();
  const {
    data: rawData,
    error,
    isLoading,
  } = useSWR(
    [
      type === FILTER_TYPES.LIVE.value
        ? "live-occupancy"
        : "forecasted-occupancy",
      locationId,
      date,
      type,
    ],
    ([key, id, date, type]) => {
      if (type === FILTER_TYPES.CUSTOM.value)
        return getForecastPoints(id, date);

      return getLatestOccupancy(id);
    },
    DEFAULT_SWR_OPTIONS
  );

  if (isLoading) {
    return <Lottie animationData={carAnimation} style={{ height: 200 }} loop />;
  }

  if (error || !rawData) {
    return <div>Error: {error?.message || "No data found"}</div>;
  }

  const data = rawData?.data || {};
  const numOfLots = data?.lots?.length || 0;

  return (
    <div className={styles.StatusViewPage}>
      <div className={styles.GarageControls}>
        <h2 className={styles.GaragesTitle}>
          All Garages{" "}
          {numOfLots > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.3 },
              }}
            >
              ({numOfLots})
            </motion.p>
          )}
        </h2>
        <FilterButtons />
        <p className={styles.SortingIndicator}>
          Sorted by{" "}
          <span className="text-main-blue font-semibold">
            {getSortLabel(sortType, building?.buildingName)}
          </span>
        </p>
      </div>

      {numOfLots > 0 ? (
        <Garages locationId={locationId} lots={data.lots} />
      ) : (
        <div className="flex flex-col gap-8">
          <p>There is no forecasted data for this time and date.</p>
        </div>
      )}
    </div>
  );
}
