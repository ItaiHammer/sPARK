import React from "react";
import { FILTER_TYPES } from "@/lib/constants/filters";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

// CSS
import styles from "./StatusViewPage.module.css";

// Components
import LiveIcon from "@/components/layout/animated/LiveIcon";

function FilterButtons() {
  const {
    timeFilterMenu: { date, type },
    toggleTimeFilter,
  } = useUI();

  return (
    <div className={styles.GarageControlsBar}>
      <button className={styles.SortButton}>
        <img src="/icons/emptiest_first_icon.svg" className={styles.SortIcon} />
        Sort
        <img src="/icons/collapse_icon.svg" className={styles.CollapseIcon} />
      </button>
      <button
        type="button"
        className={styles.TimeSelector}
        onClick={toggleTimeFilter}
      >
        <div className={styles.TimeSelectorTextContainer}>
          {type === FILTER_TYPES.LIVE.value ? (
            <>
              <LiveIcon />
              <p className={styles.TimeSelectorLiveText}>Live</p>
              <p className={styles.TimeSelectorDateText}>
                {date.toFormat("ccc, hh:mm a")}
              </p>
            </>
          ) : (
            <>
              <LiveIcon className="bg-main-blue shadow-[0_0_var(--glow-blur)_rgba(0,102,255,0.9)] mr-1" />
              <p className={styles.TimeSelectorDateText}>
                {date.toFormat("ccc, LL/d, hh:mm a")}
              </p>
            </>
          )}
        </div>
        <img src="/icons/collapse_icon.svg" className={styles.CollapseIcon} />
      </button>
    </div>
  );
}

export default FilterButtons;
