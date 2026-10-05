"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { DateTime } from "luxon";
import { useUI } from "@/contexts/UI/UI.context";
import { FILTER_TYPES } from "@/lib/constants/filters";
import { getSortedLots, SORT_TYPES } from "@/lib/constants/sort";
import { selectionDateTime } from "@/lib/utils/client/parking";
import AppHeader from "@/components/layout/header/AppHeader";
import GarageCard from "@/components/layout/GarageCard/GarageCard";
import ParkingLoading from "./ParkingLoading";
import SortControls from "./SortControls";
import TimeSelectionSheet from "./TimeSelectionSheet";
import useParkingData from "./useParkingData";
import useParkingSelection from "./useParkingSelection";
import styles from "./StatusViewPage.module.css";

const modeLabels = { live: "Live", paused: "Paused", historical: "Historical", predicted: "Predicted" };

function freshnessLabel(mode, refreshedAt, selectedAt) {
  if (mode === "predicted") return `${selectedAt.toFormat("LLL d")} estimate`;
  if (mode === "historical") return "Historical estimate";
  const observed = refreshedAt ? DateTime.fromISO(refreshedAt, { setZone: true }) : null;
  if (!observed?.isValid) return mode === "paused" ? "Saved snapshot" : "Update time unavailable";
  if (mode === "paused") return `Snapshot · ${observed.setZone(selectedAt.zoneName).toFormat("h:mm a")}`;
  const minutesAgo = Math.max(0, Math.floor(DateTime.now().diff(observed, "minutes").minutes));
  return minutesAgo < 1 ? "Updated just now" : minutesAgo < 60 ? `Updated ${minutesAgo}m ago` : `Updated ${observed.setZone(selectedAt.zoneName).toFormat("LLL d · h:mm a")}`;
}

export default function StatusViewPage({ locationId, onReady }) {
  const page = useRef(null);
  const refreshTimer = useRef(null);
  const [sorting, setSorting] = useState(false);
  const { sortMenu, selectSortOption, selectBuildingOption, updateTimeFilterMenu } = useUI();
  const [zone, setZone] = useState("America/Los_Angeles");
  const picker = useParkingSelection({ locationId, zone });
  const distanceSort = sortMenu.type === SORT_TYPES.DISTANCE_TO_BUILDING.value;
  const data = useParkingData({ locationId, selection: picker.selection, pausedSnapshot: picker.pausedSnapshot, buildingId: distanceSort ? sortMenu.building?.buildingID : null });
  const selectedAt = selectionDateTime(picker.selection);
  const lots = useMemo(() => getSortedLots(data.lots, sortMenu.type), [data.lots, sortMenu.type]);

  useEffect(() => {
    const nextZone = data.location?.timezone;
    if (!nextZone || !DateTime.now().setZone(nextZone).isValid || nextZone === zone) return;
    const frame = requestAnimationFrame(() => setZone(nextZone));
    return () => cancelAnimationFrame(frame);
  }, [data.location?.timezone, zone]);

  useEffect(() => {
    updateTimeFilterMenu({
      type: picker.selection.mode === "live" ? FILTER_TYPES.LIVE.value : FILTER_TYPES.CUSTOM.value,
      date: selectionDateTime(picker.selection),
      isOpen: false,
    });
  }, [picker.selection, updateTimeFilterMenu]);

  useEffect(() => () => clearTimeout(refreshTimer.current), []);
  const refreshCards = (update) => {
    update();
    setSorting(true);
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setSorting(false), 120);
  };
  const setSheetHeight = useCallback((height) => {
    page.current?.style.setProperty("--spark-sheet-visible-height", `${Math.max(28, height)}px`);
  }, []);
  const retry = () => { data.retry().catch(() => {}); };
  const cardsLoading = data.isLoading || data.isBuildingLoading || sorting;

  useLayoutEffect(() => {
    // Reveal complete initial data (or recovery UI) before the next paint.
    // Cached data can become interactive without ever painting the loader.
    if (!data.isLoading || data.error) onReady?.();
  }, [data.isLoading, data.error, onReady]);

  return (
    <div className={styles.page} ref={page}>
      <AppHeader />
      <main className={styles.main}>
        <h2 className={styles.title}>All Garages ({lots.length})</h2>
        <div className={styles.controls}>
          <button className={`${styles.topControl} ${styles.timeControl}`} type="button" aria-label={`Date and time: ${selectedAt.toFormat("LLLL d, h:mm a")}. ${picker.expanded ? "Hide" : "Show"} date and time controls`} aria-expanded={picker.expanded} aria-controls="spark-time-selection-sheet" onClick={() => picker.setExpanded(!picker.expanded)}>
            <Calendar aria-hidden="true" />
            <span className={styles.dateText}>{selectedAt.toFormat("LLL d")}</span>
            <span className={styles.timeText}>{selectedAt.toFormat("h:mm a")}</span>
          </button>
          <SortControls sortType={sortMenu.type} building={sortMenu.building} buildings={data.buildings} isBuildingsLoading={data.isBuildingsLoading} buildingError={data.buildingError} onRetry={retry} onSort={(type) => refreshCards(() => selectSortOption(type))} onBuilding={(building) => refreshCards(() => selectBuildingOption(building))} />
        </div>
        <div className={styles.metadata}>
          <span className={styles.mode} data-mode={picker.displayMode}><span className={styles.modeDot} aria-hidden="true" />{modeLabels[picker.displayMode]}</span>
          <span className={styles.freshness}>{data.isLoading && picker.displayMode === "live" ? "Updating…" : freshnessLabel(picker.displayMode, data.refreshedAt, selectedAt)}</span>
        </div>
        {distanceSort && data.buildingError ? <p className={styles.notice}>Walking distances could not load. <button type="button" onClick={retry}>Try again</button></p> : null}
        <section aria-label="Garage availability" aria-busy={cardsLoading}>
          {data.error ? (
            <div className={styles.error} role="alert"><p>Parking information could not load.</p><button className={styles.retryButton} type="button" onClick={retry}>Try again</button></div>
          ) : cardsLoading ? <ParkingLoading /> : lots.length ? (
            <div className={styles.garages}>{lots.map((garage, index) => <GarageCard key={garage.lot_id || garage.id} garage={garage} mode={picker.displayMode} order={index} sortType={sortMenu.type} buildingName={sortMenu.building?.buildingName} />)}</div>
          ) : <div className={styles.error}><p>No garages are available for this location.</p></div>}
        </section>
      </main>
      <TimeSelectionSheet selection={picker.selection} todayISO={picker.todayISO} maxDateISO={picker.maxDateISO} expanded={picker.expanded} onExpandedChange={picker.setExpanded} onSelect={picker.select} canPauseLive={!data.isLoading && !data.error && data.lots.length > 0} onToggleLive={() => picker.toggleLive({ lots: data.lots, refreshedAt: data.refreshedAt })} onVisibleHeightChange={setSheetHeight} zone={zone} />
    </div>
  );
}
