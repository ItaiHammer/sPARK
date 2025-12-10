"use client";

import React from "react";
import { motion } from "framer-motion";
import useSWR from "swr";
import { DEFAULT_SWR_OPTIONS } from "@/lib/constants/api.constants";

// Contexts
import { useForecastAPI } from "@/contexts/API/ForecastAPI.context";
import { useUI } from "@/contexts/UI/UI.context";

// CSS
import styles from "./StatusViewPage.module.css";
import FilterButtons from "./FilterButtons";

// components
import GarageCard from "@/components/layout/GarageCard/GarageCard.jsx";

export default function StatusViewPage({ locationId }) {
  const {
    timeFilterMenu: { date },
  } = useUI();

  // Get Forecast Points
  const { getForecastPoints } = useForecastAPI();
  const {
    data: rawData,
    error,
    isLoading,
  } = useSWR(
    [`forecast-points`, locationId, date],
    ([key, id, date]) => getForecastPoints(id, date),
    DEFAULT_SWR_OPTIONS
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const data = rawData?.data || {};
  const numOfLots = data.lots.length;

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
        <p className={styles.SortingIndicator}>Sorted by emptiest to fullest</p>
      </div>

      {numOfLots === 0
        ? "There is no forecasted data for this time and date."
        : data.lots.map((garage, i) => (
            <GarageCard garage={garage} order={i} key={i} />
          ))}
    </div>
  );
}
