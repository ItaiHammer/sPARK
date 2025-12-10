"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, animate } from "framer-motion";

// CSS
import styles from "./GarageCard.module.css";

export default function GarageCard({ garage, order }) {
  const duration = 0.7;
  const occupancyPct = garage.point || garage.occupancy_pct || 0;
  const [occupancyValue, setOccupancyValue] = useState(0);
  const [spotCount, setSpotCount] = useState(0);
  const occupancyRef = useRef(0);
  const spotRef = useRef(0);

  // animate occupancy and spot count to increment
  useEffect(() => {
    const targetOccupancy = Math.round(occupancyPct);
    const targetSpots = Math.floor(
      ((100 - occupancyPct) / 100) * (garage.spot_count || 0)
    );

    const occAnim = animate(occupancyRef.current, targetOccupancy, {
      duration,
      onUpdate: (v) => {
        occupancyRef.current = v;
        setOccupancyValue(Math.round(v));
      },
    });

    const spotAnim = animate(spotRef.current, targetSpots, {
      duration,
      onUpdate: (v) => {
        spotRef.current = v;
        setSpotCount(Math.round(v));
      },
    });

    return () => {
      occAnim.stop();
      spotAnim.stop();
    };
  }, [occupancyPct, garage.spot_count]);

  // occupancy color: red >=95, orange >=75, green otherwise
  const occupancyColorVar =
    occupancyValue == null
      ? "var(--secondary-gray, var(--Secondary-Gray, #747474))"
      : occupancyValue >= 95
      ? "var(--occupancy-red, var(--Occupancy-Red, #d00000))"
      : occupancyValue >= 75
      ? "var(--occupancy-orange, var(--Occupancy-Orange, #FF8800))"
      : "var(--occupancy-green, var(--Occupancy-Green, #009133))";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.6,
          delay: (order + 1) * 0.2,
        },
      }}
      className={styles.GarageCard}
    >
      <div className={styles.GarageCardHeader}>
        <div className={styles.GarageCardHeaderTitleContainer}>
          <div className={styles.GarageCardHeaderTitleContainerLeft}>
            <motion.div
              animate={{
                "--glow-blur": ["4px", "10px", "4px"],
              }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: "easeInOut",
              }}
              className={styles.GarageCardHeaderLiveIndicator}
            />
            <h3 className={styles.GarageCardHeaderTitle}>{garage.name}</h3>
          </div>

          <h3
            className={styles.GarageCardHeaderOccupancyText}
            style={{ color: occupancyColorVar }}
          >
            {occupancyValue}%
          </h3>
        </div>

        <div className={styles.GarageCardHeaderOccupancyContainer}>
          <div className={styles.GarageCardHeaderOccupancyLabelContainer}>
            {/* car icon */}
            <svg
              className={styles.GarageCardHeaderOccupancyLabelContainerIcon}
              width="14"
              height="13"
              viewBox="0 0 14 13"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M7.99414 3.87677e-06C7.90321 0.000367448 7.8141 0.0255188 7.7364 0.0727516C7.6587 0.119984 7.59534 0.187511 7.55316 0.268065C7.51097 0.348618 7.49155 0.439151 7.49698 0.52992C7.50241 0.620689 7.53249 0.708259 7.58398 0.783207L8.06543 1.50586H1.80957C1.08976 1.50586 0.468133 2.02518 0.334961 2.73047C0.186942 3.51666 0 4.74812 0 6.00586C0 7.2636 0.186942 8.49506 0.334961 9.28125C0.468133 9.98655 1.08976 10.5059 1.80957 10.5059H8.06543L7.58398 11.2285C7.54633 11.2831 7.51992 11.3447 7.50628 11.4096C7.49265 11.4745 7.49206 11.5415 7.50456 11.6066C7.51706 11.6717 7.54239 11.7337 7.57908 11.789C7.61577 11.8443 7.66309 11.8917 7.71828 11.9285C7.77346 11.9652 7.83542 11.9907 7.90053 12.0033C7.96565 12.0159 8.03263 12.0155 8.09756 12.0019C8.16249 11.9884 8.22409 11.9621 8.27876 11.9246C8.33344 11.887 8.38009 11.839 8.41602 11.7832L9.26758 10.5059H11.8965C12.4813 10.5059 13.0207 10.1642 13.2627 9.62598C13.5793 8.9206 14 7.67015 14 6.00586C14 4.34158 13.5793 3.09113 13.2627 2.38575C13.0212 1.84703 12.4813 1.50586 11.8965 1.50586H9.26758L8.41602 0.228519C8.37049 0.158117 8.30799 0.100291 8.23427 0.06036C8.16056 0.0204287 8.07798 -0.000326219 7.99414 3.87677e-06ZM3.79492 2.50586H7.3252L6.34668 3.50586H4.43555L3.79492 2.50586ZM8.99414 2.51172C8.99772 2.51209 9.0013 2.51241 9.00488 2.5127C9.00489 2.51271 9.00585 2.51269 9.00586 2.5127C9.02353 2.53057 10 3.52835 10 6.00586C10 8.48681 9.01989 9.48485 9.00488 9.5C9.0013 9.49997 8.99772 9.49997 8.99414 9.5L7.5 8.00586V6.00586V4.00586L8.99414 2.51172ZM12.1455 2.57325C12.2342 2.62346 12.3072 2.69814 12.3506 2.79493C12.5212 3.17503 12.7337 3.75584 12.8682 4.50586H12.5C11.9475 4.50586 11.5 4.05836 11.5 3.50586C11.5 3.07861 11.7687 2.71653 12.1455 2.57325ZM2.66016 2.82911L3.5 4.00586V6.00586V8.00586L2.66016 9.18262C2.66016 9.18262 1.5 8.08886 1.5 6.00586C1.5 3.92286 2.66016 2.82911 2.66016 2.82911ZM12.5 7.50586H12.8682C12.7337 8.25558 12.5212 8.83564 12.3506 9.21582C12.3069 9.31289 12.2342 9.38809 12.1455 9.43848C11.7687 9.2952 11.5 8.93312 11.5 8.50586C11.5 7.95336 11.9475 7.50586 12.5 7.50586ZM4.43555 8.50586H6.34668L7.3252 9.50586H3.79492L4.43555 8.50586Z"
                fill={occupancyColorVar}
              />
            </svg>
            <div
              className={styles.GarageCardHeaderOccupancyLabel}
              style={{ color: occupancyColorVar }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                }}
              >
                {spotCount}/
                <p className={styles.GarageCardHeaderOccupancyLabelDenominator}>
                  {garage.spot_count}
                </p>
              </div>
              <p className={styles.GarageCardHeaderOccupancyLabelText}>
                spots available
              </p>
            </div>
          </div>
          <div className={styles.GarageCardOccupancyBarContainer}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: occupancyPct + "%" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{
                background: occupancyColorVar,
                width: occupancyPct + "%",
              }}
              className={styles.GarageCardOccupancyBar}
            ></motion.div>
          </div>
          <div className={styles.GarageCardUpdatedIndicatorContainer}>
            <img src="/icons/refresh-icon.svg" />
            <p className={styles.GarageCardUpdatedIndicator}>
              last updated{" "}
              {new Date(garage.request_local_time)
                .toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
                .toLowerCase()}
            </p>
          </div>
          <div className={styles.GarageCardStatusLabelContainer}>
            <img src="/icons/notice-icon.svg" />
            <p className={styles.GarageCardStatusLabel}>
              Full for the next 2 hours
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
