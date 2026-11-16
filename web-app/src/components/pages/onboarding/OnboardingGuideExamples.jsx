import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import GarageCard from "@/components/layout/GarageCard/GarageCard";
import SortControls from "@/components/pages/home/StatusView/SortControls";
import TimeSelectionSheet from "@/components/pages/home/StatusView/TimeSelectionSheet";
import useParkingData, { useParkingBuildings } from "@/components/pages/home/StatusView/useParkingData";
import useParkingSelection from "@/components/pages/home/StatusView/useParkingSelection";
import { DEFAULT_SORT_TYPE, getSortedLots, SORT_TYPES } from "@/lib/constants/sort";
import { travelForLot } from "@/lib/utils/client/parking";
import { sampleGarages, southGarage } from "./sampleGarages";
import styles from "./OnboardingGuide.module.css";

const ZONE = "America/Los_Angeles";
const noBuildings = [];
const labels = { live: "Live", paused: "Paused", historical: "Historical", predicted: "Predicted" };
const distanceSort = SORT_TYPES.DISTANCE_TO_BUILDING.value;
const sortOptions = [SORT_TYPES.MOST_SPACES, SORT_TYPES.DISTANCE_TO_BUILDING];

function ExamplePanel({ label = "Example", ariaLabel = "Parking example with sample data", activity, children }) {
  return (
    <section className={styles.examplePanel} aria-label={ariaLabel}>
      <div className={styles.exampleHeader}>
        <span className={styles.exampleLabel}>{label}</span>
        {activity}
      </div>
      {children}
    </section>
  );
}

function Mode({ mode, spaces }) {
  return (
    <span className={styles.mode} data-mode={mode} role="status">
      {labels[mode]}
      {Number.isFinite(spaces) && <span className="sr-only">, about {spaces.toLocaleString("en-US")} spaces left in this example</span>}
    </span>
  );
}

function LessonGarageCard(props) {
  return <GarageCard {...props} animateEntrance={false} adaptiveDensity />;
}

export function AvailabilityExample() {
  return (
    <ExamplePanel activity={<Mode mode="live" spaces={southGarage.spaces} />}>
      <LessonGarageCard garage={{ ...southGarage, hours: "Open 24h" }} />
    </ExamplePanel>
  );
}

export function ArrivalExample() {
  const picker = useParkingSelection({ locationId: "sjsu", zone: ZONE, persist: false });
  const data = useParkingData({
    locationId: "sjsu",
    selection: picker.selection,
    pausedSnapshot: picker.pausedSnapshot,
    loadBuildings: false,
  });
  const garage = data.lots.find((lot) => lot.lot_id === southGarage.lot_id);
  const { displayMode: mode } = picker;
  const loading = data.isLoading && !data.error && garage?.occupied == null && !garage?.closed;
  const unavailableLabel = loading ? "Loading availability…" : picker.selection.mode === "forecast" ? "Forecast unavailable" : undefined;

  return (
    <ExamplePanel label="SJSU data" ariaLabel="South Garage availability and forecasts" activity={<Mode mode={mode} spaces={garage?.spaces} />}>
      <LessonGarageCard
        garage={{
          lot_id: southGarage.lot_id,
          name: garage?.name ?? southGarage.name,
          occupied: garage?.occupied,
          spaces: garage?.spaces,
          closed: garage?.closed,
        }}
        mode={mode}
        unavailableLabel={unavailableLabel}
      />
      <TimeSelectionSheet
        embedded
        selection={picker.selection}
        todayISO={picker.todayISO}
        maxDateISO={picker.maxDateISO}
        zone={ZONE}
        onSelect={picker.select}
        canPauseLive={!data.error && (garage?.occupied != null || garage?.closed === true)}
        onToggleLive={() => picker.toggleLive({ lots: data.lots, refreshedAt: data.refreshedAt })}
      />
    </ExamplePanel>
  );
}

export function WalkingExample() {
  const reducedMotion = useReducedMotion();
  const [building, setBuilding] = useState(null);
  const sortType = building ? distanceSort : DEFAULT_SORT_TYPE;
  const { buildingsRequest, buildingRequest } = useParkingBuildings("sjsu", { buildingId: building?.buildingID });
  const garages = sampleGarages.map((garage) => ({
    ...garage, travel: travelForLot(garage.lot_id, buildingRequest.data),
  }));
  const hasWalkingEstimates = garages.some((garage) => garage.travel);

  return (
    <ExamplePanel label="Sample availability" activity={(
      <SortControls
        sortType={sortType}
        building={building}
        buildings={buildingsRequest.data ?? noBuildings}
        isBuildingsLoading={buildingsRequest.isLoading}
        buildingError={buildingsRequest.error}
        onRetry={() => buildingsRequest.mutate().catch(() => {})}
        onSort={() => setBuilding(null)}
        onBuilding={setBuilding}
        sortOptions={sortOptions}
        trackChanges={false}
        modal
      />
    )}>
      {building && !hasWalkingEstimates && (
        <p className={styles.exampleNotice} role="status">
          {buildingRequest.isLoading ? "Loading walking estimates…" : "Walking estimates are unavailable for this example."}
        </p>
      )}
      {getSortedLots(garages, hasWalkingEstimates ? sortType : DEFAULT_SORT_TYPE).map((garage) => (
        <motion.div key={garage.lot_id} layout={reducedMotion ? false : "position"} transition={{ duration: 0.28 }}>
          <LessonGarageCard garage={garage} buildingName={building?.buildingName} />
        </motion.div>
      ))}
    </ExamplePanel>
  );
}
