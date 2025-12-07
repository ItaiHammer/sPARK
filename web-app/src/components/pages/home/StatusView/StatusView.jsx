"use client";

import { useState, useEffect } from "react";
import { DateTime } from "luxon";
import { motion } from "framer-motion";
import useSWR from "swr";
import { useLocationAPI } from "@/contexts/API/LocationAPI.context";

import styles from "./StatusViewPage.module.css";

export default function StatusViewPage({ locationId }) {
  // input information
  const [time, setTime] = useState(DateTime.now().toFormat("HH:mm"));
  const [date, setDate] = useState(DateTime.now().toISODate());

  // location information
  const [garages, setGarages] = useState([]);

  // Get Locaiton Info
  const { getLocationInfo, getLocationLots } = useLocationAPI();
  const {
    data: locationJSON,
    error: locationError,
    isLoading: locationLoading,
  } = useSWR([`location-info`, locationId], ([key, id]) => getLocationInfo(id));

  if (locationError) {
    return <div>Error: {locationError.message}</div>;
  }

  const locationData = locationJSON?.data || {};

  // Get Location Lots
  const {
    data: lotsJSON,
    error: lotsError,
    isLoading: lotsLoading,
  } = useSWR([`location-lots`, locationId], ([key, id]) => getLocationLots(id));

  if (lotsError) {
    return <div>Error: {lotsError.message}</div>;
  }

  const lotsData = lotsJSON?.data || [];

  console.log(lotsData);

  // useEffect(() => {
  //   async function load() {
  //     try {
  //       // for each lot, get the forecast at the chosen time
  //       const results = [];
  //       const combinedTime = DateTime.fromISO(`${date}T${time}`, {
  //         zone: "local",
  //       })
  //         .toUTC()
  //         .toISO();

  //       for (const lot of lots) {
  //         const fRes = await fetch(
  //           `/api/forecast/point?location_id=${locationId}&lot_id=${lot.lot_id}&time=${combinedTime}`,
  //           authHeaders
  //         );
  //         const fJson = await fRes.json();
  //         const point = fJson?.data?.point ?? "N/A";
  //         results.push(`${lot.name || lot.lot_id}: ${point}% full`);
  //       }

  //       setGarages(results);
  //     } catch (err) {
  //       setGarages([`Error loading forecasts: ${err.message}`]);
  //     }
  //   }

  //   load();
  // }, [locationId, time, date]);

  function formattedDateTime() {
    const dt = DateTime.fromISO(`${date}T${time}`, { zone: "local" });
    if (!dt.isValid) {
      const fallback = DateTime.fromISO(date);
      return fallback.isValid ? fallback.toLocaleString() : "";
    }
    const weekday = dt.toFormat("ccc");
    const timeStr = dt.toFormat("h:mm a").toLowerCase();
    return `${weekday}, ${timeStr}`;
  }

  return (
    <div className={styles.StatusViewPage}>
      <div className={styles.GarageControls}>
        <h2 className={styles.GaragesTitle}>
          All Garages{" "}
          {garages.length == 0 ? (
            ""
          ) : (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.3 },
              }}
            >
              ({garages.length})
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
                {formattedDateTime()}
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
        {garages.length === 0
          ? "Loading..."
          : garages.map((line, i) => <div key={i}>{line}</div>)}
      </pre>
    </div>
  );
}
