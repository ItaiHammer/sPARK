import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DateTime } from "luxon";
import GarageCard from "@/components/layout/GarageCard/GarageCard";
import SortControls from "@/components/pages/home/StatusView/SortControls";
import TimeSelectionSheet from "@/components/pages/home/StatusView/TimeSelectionSheet";
import { useParkingBuildings } from "@/components/pages/home/StatusView/useParkingData";
import { DEFAULT_SORT_TYPE, getSortedLots, SORT_TYPES } from "@/lib/constants/sort";
import { selectionDateTime, travelForLot } from "@/lib/utils/client/parking";
import { sampleGarages, southGarage } from "./sampleGarages";
import styles from "./OnboardingGuide.module.css";

const ZONE = "America/Los_Angeles";
const SAMPLE_SOUTH_CAPACITY = 1445;
const noBuildings = [];
const labels = { live: "Live", paused: "Paused", historical: "Historical", predicted: "Predicted" };
const distanceSort = SORT_TYPES.DISTANCE_TO_BUILDING.value;
const sortOptions = [SORT_TYPES.MOST_SPACES, SORT_TYPES.DISTANCE_TO_BUILDING];

function ExamplePanel({ label = "Example", activity, children }) {
  return (
    <section className={styles.examplePanel} aria-label="Parking example with sample data">
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
      <span className="sr-only">, about {spaces.toLocaleString("en-US")} spaces left in this example</span>
    </span>
  );
}

export function AvailabilityExample() {
  return (
    <ExamplePanel activity={<Mode mode="live" spaces={southGarage.spaces} />}>
      <GarageCard garage={{ ...southGarage, hours: "Open 24h" }} animateEntrance={false} compact />
    </ExamplePanel>
  );
}

export function ArrivalExample() {
  const [now] = useState(() => DateTime.now().setZone(ZONE).set({ hour: 8, minute: 30, second: 0, millisecond: 0 }));
  const live = { dateISO: now.toISODate(), minutes: now.hour * 60 + now.minute, mode: "live" };
  const [selection, setSelection] = useState(live);
  const selectedAt = selectionDateTime(selection);
  const mode = selection.mode === "forecast" ? (selectedAt > now ? "predicted" : "historical") : selection.mode;
  const occupied = selection.minutes < 12 * 60 ? 72 : selection.minutes < 17 * 60 ? 56 : 36;
  const garage = selection.mode === "forecast"
    ? { ...southGarage, occupied, spaces: Math.round(SAMPLE_SOUTH_CAPACITY * (1 - occupied / 100)) }
    : southGarage;

  return (
    <ExamplePanel activity={<Mode mode={mode} spaces={garage.spaces} />}>
      <GarageCard garage={garage} mode={mode} animateEntrance={false} compact />
      <TimeSelectionSheet
        embedded
        selection={selection}
        todayISO={live.dateISO}
        maxDateISO={now.plus({ days: 6 }).toISODate()}
        zone={ZONE}
        onSelect={(dateISO, minutes) => {
          const next = { dateISO, minutes, mode: "forecast" };
          if (!selectionDateTime(next)) return false;
          setSelection(next);
        }}
        onToggleLive={() => setSelection((previous) => previous.mode === "live" ? { ...live, mode: "paused" } : live)}
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
      />
    )}>
      {building && !hasWalkingEstimates && (
        <p className={styles.exampleNotice} role="status">
          {buildingRequest.isLoading ? "Loading walking estimates…" : "Walking estimates are unavailable for this example."}
        </p>
      )}
      {getSortedLots(garages, hasWalkingEstimates ? sortType : DEFAULT_SORT_TYPE).map((garage) => (
        <motion.div key={garage.lot_id} layout={reducedMotion ? false : "position"} transition={{ duration: 0.28 }}>
          <GarageCard garage={garage} buildingName={building?.buildingName} animateEntrance={false} compact />
        </motion.div>
      ))}
    </ExamplePanel>
  );
}
