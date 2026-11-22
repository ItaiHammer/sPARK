"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useUI } from "@/contexts/UI/UI.context";
import ParkingLoading from "@/components/pages/home/StatusView/ParkingLoading";
import styles from "@/components/pages/home/StatusView/StatusViewPage.module.css";

const StatusView = dynamic(() => import("@/components/pages/home/StatusView/StatusView"), {
  ssr: false,
  loading: () => (
    <div className={styles.pageContent}>
      <main className={styles.main}><ParkingLoading /></main>
    </div>
  ),
});

function ParkingPageContent({ locationId }) {
  const { isInitialPageLoading, completeInitialPageLoading } = useUI();
  const [showStartupLoader] = useState(isInitialPageLoading);
  const [ready, setReady] = useState(false);
  const pageReady = ready || !isInitialPageLoading;
  const onReady = useCallback(() => {
    setReady(true);
    completeInitialPageLoading();
  }, [completeInitialPageLoading]);

  // Only a direct visit uses the startup overlay. Client navigation and later
  // refreshes keep the page visible and use the existing content loading state.
  return (
    <div className={styles.initialPage} data-ready={pageReady}>
      <div className={styles.initialContent} inert={!pageReady} aria-hidden={!pageReady}>
        <StatusView locationId={locationId} onReady={onReady} />
      </div>
      {showStartupLoader ? (
        <div className={styles.initialLoading} aria-hidden={pageReady}>
          <ParkingLoading fullPage />
        </div>
      ) : null}
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
