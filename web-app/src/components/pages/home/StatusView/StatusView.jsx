"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { motion } from "framer-motion";
import useSWR from "swr";
import { DEFAULT_SWR_OPTIONS } from "@/lib/constants/api.constants";
import { formattedDateTime } from "@/lib/utils";

// Contexts
import { useForecastAPI } from "@/contexts/API/ForecastAPI.context";

// CSS
import styles from "./StatusViewPage.module.css";

export default function StatusViewPage({ locationId }) {
  // input information
  const [time, setTime] = useState(DateTime.now().toFormat("HH:mm"));
  const [date, setDate] = useState(DateTime.now().toISODate());

  // Get Forecast Points
  const { getForecastPoints } = useForecastAPI();
  const {
    data: rawData,
    error,
    isLoading,
  } = useSWR(
    [`forecast-points`, locationId, time, date],
    ([key, id, time, date]) => getForecastPoints(id, time, date),
    DEFAULT_SWR_OPTIONS
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const data = rawData?.data || {};
  const forecastedLots =
    data?.lots?.map((lot) => `${lot.name || lot.lot_id}: ${lot.point}% full`) ||
    [];

  return (
    <div className={styles.StatusViewPage}>
      <div className={styles.GarageControls}>
        <h2 className={styles.GaragesTitle}>
          All Garages{" "}
          {forecastedLots.length > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.3 },
              }}
            >
              ({forecastedLots.length})
            </motion.p>
          )}
        </h2>
        <div className={styles.GarageControlsBar}>
          <button className={styles.SortButton}>
            <img
              src="/icons/emptiest_first_icon.svg"
              className={styles.SortIcon}
            />
            Sort
            <img
              src="/icons/collapse_icon.svg"
              className={styles.CollapseIcon}
            />
          </button>
          <button className={styles.TimeSelector}>
            <div className={styles.TimeSelectorTextContainer}>
              <motion.div
                animate={{
                  "--glow-blur": ["4px", "10px", "4px"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: "easeInOut",
                }}
                className={styles.TimeSelectorLiveIndicator}
              />
              <p className={styles.TimeSelectorLiveText}>Live</p>
              <p className={styles.TimeSelectorDateText}>
                {formattedDateTime(date, time)}
              </p>
            </div>
            <img
              src="/icons/collapse_icon.svg"
              className={styles.CollapseIcon}
            />
          </button>
        </div>
        <p className={styles.SortingIndicator}>Sorted by emptiest to fullest</p>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>
          Time:{" "}
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>{" "}
        <label>
          Date:{" "}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>{" "}
      </div>

      <pre>
        {forecastedLots.length === 0
          ? "There is no forecasted data for this time and date."
          : forecastedLots.map((line, i) => <div key={i}>{line}</div>)}
      </pre>
    </div>
  );
}
