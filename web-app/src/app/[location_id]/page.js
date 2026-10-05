"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useUI } from "@/contexts/UI/UI.context";
import ParkingLoading from "@/components/pages/home/StatusView/ParkingLoading";

const StatusView = dynamic(() => import("@/components/pages/home/StatusView/StatusView"), {
  ssr: false,
  loading: () => <ParkingLoading fullPage />,
});

export default function MainParkingPage() {
  const { location_id } = useParams();
  const { setLocationID } = useUI();
  const locationId = typeof location_id === "string" ? location_id.toLowerCase() : null;

  useEffect(() => { setLocationID(locationId); }, [locationId, setLocationID]);

  return <StatusView key={locationId} locationId={locationId} />;
}
