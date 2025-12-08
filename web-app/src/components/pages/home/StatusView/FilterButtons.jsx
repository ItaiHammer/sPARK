import React from "react";
import { formattedDateTime } from "@/lib/utils/formatters";
import { motion } from "framer-motion";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

// CSS
import styles from "./StatusViewPage.module.css";

// Components
import LiveIcon from "@/components/layout/animated/LiveIcon";

function FilterButtons() {
  const {
    timeFilterMenu: { date },
    toggleTimeFilter,
  } = useUI();

  return (
    <div className={styles.GarageControlsBar}>
      <button className={styles.SortButton}>
        <img src="/icons/emptiest_first_icon.svg" className={styles.SortIcon} />
        Sort
        <img src="/icons/collapse_icon.svg" className={styles.CollapseIcon} />
      </button>
      <button className={styles.TimeSelector} onClick={toggleTimeFilter}>
        <div className={styles.TimeSelectorTextContainer}>
          <LiveIcon />
          <p className={styles.TimeSelectorLiveText}>Live</p>
          <p className={styles.TimeSelectorDateText}>
            {date.toFormat("ccc, hh:mm a")}
          </p>
        </div>
        <img src="/icons/collapse_icon.svg" className={styles.CollapseIcon} />
      </button>
    </div>
  );
}

export default FilterButtons;
