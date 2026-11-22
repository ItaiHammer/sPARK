"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useUI } from "@/contexts/UI/UI.context";
import ParkingLoading from "@/components/pages/home/StatusView/ParkingLoading";
import appStyles from "@/components/pages/home/StatusView/StatusViewPage.module.css";
import styles from "./GaragePage.module.css";

const GarageDetail = dynamic(() => import("./GarageDetail"), {
  ssr: false,
  loading: () => <ParkingLoading label="Loading garage" />,
});

function GaragePageContent({ locationId, lotId }) {
  const { setLocationID, isInitialPageLoading, completeInitialPageLoading } = useUI();
  const [showStartupLoader] = useState(isInitialPageLoading);
  const [ready, setReady] = useState(false);
  const pageReady = ready || !isInitialPageLoading;
  const onReady = useCallback(() => {
    setReady(true);
    completeInitialPageLoading();
  }, [completeInitialPageLoading]);
  useEffect(() => { setLocationID(locationId); }, [locationId, setLocationID]);

  return (
    <div className={appStyles.initialPage} data-ready={pageReady}>
      <div className={appStyles.initialContent} inert={!pageReady} aria-hidden={!pageReady}>
        <div className={`${appStyles.pageContent} ${styles.page}`}>
          <main className={styles.main}>
            <GarageDetail locationId={locationId} lotId={lotId} onReady={onReady} />
          </main>
        </div>
      </div>
      {showStartupLoader ? (
        <div className={appStyles.initialLoading} aria-hidden={pageReady}>
          <ParkingLoading fullPage label="Loading garage" />
        </div>
      ) : null}
    </div>
  );
}

export default function GaragePageClient({ locationId, lotId }) {
  return <GaragePageContent key={`${locationId}:${lotId}`} locationId={locationId} lotId={lotId} />;
}
