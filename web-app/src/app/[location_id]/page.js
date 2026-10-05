"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useUI } from "@/contexts/UI/UI.context";
import ParkingLoading from "@/components/pages/home/StatusView/ParkingLoading";
import styles from "@/components/pages/home/StatusView/StatusViewPage.module.css";

const StatusView = dynamic(() => import("@/components/pages/home/StatusView/StatusView"), {
  ssr: false,
  loading: () => null,
});

function ParkingPageContent({ locationId }) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  // Keep one loading surface across both the code and initial data requests.
  // Readiness is one-way: later refreshes use the existing card loading state.
  return (
    <div className={styles.initialPage} data-ready={ready}>
      <div className={styles.initialContent} inert={!ready} aria-hidden={!ready}>
        <StatusView locationId={locationId} onReady={onReady} />
      </div>
      <div className={styles.initialLoading} aria-hidden={ready}>
        <ParkingLoading fullPage />
      </div>
    </div>
  );
}

export default function MainParkingPage() {
  const { location_id } = useParams();
  const { setLocationID } = useUI();
  const locationId = typeof location_id === "string" ? location_id.toLowerCase() : null;

  useEffect(() => { setLocationID(locationId); }, [locationId, setLocationID]);

  return <ParkingPageContent key={locationId} locationId={locationId} />;
}
