import React from "react";
import { FILTER_TYPES } from "@/lib/constants/filters";
import { getSortIcon } from "@/lib/constants/sort";

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
    toggleSortMenu,
    sortMenu: { type: sortType },
  } = useUI();

  return (
    <div className={styles.GarageControlsBar}>
      <button className={styles.SortButton} onClick={toggleSortMenu}>
        <img src={getSortIcon(sortType)} className={styles.SortIcon} />
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
                {date.toFormat("ccc, h:mm a")}
              </p>
            </>
          ) : (
            <>
              <LiveIcon isLive={false} />
              <p className={styles.TimeSelectorDateText}>
                {date.toFormat("ccc, LL/d, h:mm a")}
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
