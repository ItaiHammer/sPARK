"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock3, Navigation, ArrowUpRight, CircleParking, Smartphone, CreditCard, Ticket, WalletCards, Timer } from "lucide-react";
import { DateTime } from "luxon";
import { useUI } from "@/contexts/UI/UI.context";
import { FILTER_TYPES } from "@/lib/constants/filters";
import { getSpotCategoryCount, SORT_TYPES } from "@/lib/constants/sort";
import { operatingHours, selectionDateTime } from "@/lib/utils/client/parking";
import { freshnessLabel } from "@/lib/utils/client/parkingFreshness";
import GarageCard from "@/components/layout/GarageCard/GarageCard";
import useParkingData from "@/components/pages/home/StatusView/useParkingData";
import { liveParkingSelection } from "@/components/pages/home/StatusView/useParkingSelection";
import ParkingLoading from "@/components/pages/home/StatusView/ParkingLoading";
import appStyles from "@/components/pages/home/StatusView/StatusViewPage.module.css";
import GarageForecastSection from "./GarageForecastSection";
import PaymentArtwork from "./PaymentArtwork";
import { capacityLabel, garageMapUrls, PARKING_LINKS, PAY_STATIONS, permitHoursForGarage } from "./garageDetails";
import styles from "./GaragePage.module.css";

const CATEGORIES = [
  { key: "disabled", label: "Accessible", icon: "/icons/disabled_icon.svg" },
  { key: "employee", label: "Employee", icon: "/icons/employee_icon.svg" },
  { key: "motorcycle", label: "Motorcycle", icon: "/icons/motorcycle_icon.svg" },
  { key: "limited_time", label: "20-minute" },
  { key: "ev_charging", label: "EV charging", icon: "/icons/ev_charging_icon.svg" },
];

function dayMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/.exec(String(value || ""));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function ExternalLink({ href, children, className, showIcon = true }) {
  return (
    <a className={className || styles.textLink} href={href} target="_blank" rel="noopener noreferrer">
      {children}{showIcon ? <ArrowUpRight aria-hidden="true" size={14} /> : null}
      <span className={styles.srOnly}> (opens in a new tab)</span>
    </a>
  );
}

function HoursStrip({ periods, tone = "general", permit = false }) {
  return (
    <div className={styles.hoursTimeline} aria-hidden="true">
      <div className={styles.hoursTrack} data-tone={tone}>
        {periods.map(([start, end]) => <span key={start} style={{ left: start / 14.4 + "%", width: (end - start) / 14.4 + "%" }} />)}
      </div>
      <div className={styles.hoursLabels}>
        <span>12am</span>{permit ? <span className={styles.sevenAm}>7am</span> : <><span>6am</span><span>12pm</span><span>6pm</span></>}<span>12am</span>
      </div>
    </div>
  );
}

export default function GarageDetail({ locationId, lotId, onReady }) {
  const [zone, setZone] = useState("America/Los_Angeles");
  const [now, setNow] = useState(() => Date.now());
  const { sortMenu, updateTimeFilterMenu } = useUI();
  // Detail pages always use the current time; the list's saved picker stays intact.
  const selection = useMemo(() => liveParkingSelection(zone, now), [zone, now]);
  const distanceSort = sortMenu.type === SORT_TYPES.DISTANCE_TO_BUILDING.value;
  const data = useParkingData({
    locationId,
    selection,
    buildingId: distanceSort ? sortMenu.building?.buildingID || null : null,
    loadBuildings: false,
  });
  const selectedAt = selectionDateTime(selection);
  const metadata = data.metadataLots.find((lot) => lot.lot_id === lotId);
  const observed = data.lots.find((lot) => lot.lot_id === lotId);
  const garage = metadata ? { ...observed, ...metadata } : null;
  const retry = () => { data.retry().catch(() => {}); };

  useLayoutEffect(() => {
    // Reveal the page once its details are ready, including recovery/empty states.
    // Live availability and forecasts keep their own content loading surfaces.
    if (!data.isMetadataLoading) onReady?.();
  }, [data.isMetadataLoading, onReady]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const onVisibility = () => { if (document.visibilityState === "visible") tick(); };
    const interval = window.setInterval(tick, 30000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", tick);
    };
  }, []);

  useEffect(() => {
    const nextZone = data.location?.timezone;
    if (!nextZone || nextZone === zone || !DateTime.now().setZone(nextZone).isValid) return;
    const frame = requestAnimationFrame(() => setZone(nextZone));
    return () => cancelAnimationFrame(frame);
  }, [data.location?.timezone, zone]);

  useEffect(() => {
    updateTimeFilterMenu({ type: FILTER_TYPES.LIVE.value, date: selectionDateTime(selection), isOpen: false });
  }, [selection, updateTimeFilterMenu]);

  if (data.isMetadataLoading) return <ParkingLoading label="Loading garage" />;
  if (data.metadataError && !garage) {
    return <div className={styles.empty} role="alert"><h2>Garage information could not load</h2><p>Please try again in a moment.</p><button className={appStyles.retryButton} type="button" onClick={retry}>Try again</button></div>;
  }
  if (!garage) {
    return <div className={styles.empty}><CircleParking aria-hidden="true" /><h2>Garage not found</h2><p>This garage is not available at this location.</p><Link className={appStyles.retryButton} href={"/" + encodeURIComponent(locationId)}>View all garages</Link></div>;
  }

  const hours = operatingHours(garage, selectedAt);
  const maps = garageMapUrls(garage);
  const freshness = freshnessLabel("live", observed?.scraped_at, selectedAt);
  const cardGarage = {
    ...garage,
    occupied: data.error || data.isLoading ? null : observed?.occupied ?? null,
    spaces: data.error || data.isLoading ? null : observed?.spaces ?? null,
    closed: hours.closed,
    hours: hours.label,
    alert: data.error || data.isLoading ? null : observed?.alert,
    travel: distanceSort ? observed?.travel : null,
  };
  const isSjsu = locationId === "sjsu";
  const totalCapacity = capacityLabel(garage.spot_count);
  const permitRows = isSjsu ? permitHoursForGarage(garage) : [];
  const opens = dayMinutes(garage.open_time);
  const closes = dayMinutes(garage.close_time);
  const openPeriods = !hours.known ? [] : garage["24_hour"] ? [[0, 1440]]
    : opens === closes ? [] : closes > opens ? [[opens, closes]] : [[0, closes], [opens, 1440]];

  return (
    <div className={styles.content}>
      <h2 className={appStyles.title}>Garage Details</h2>

      <div className={styles.liveMetadata} role="status">
        <span className={appStyles.mode} data-mode="live"><span className={appStyles.modeDot} aria-hidden="true" />Live</span>
        <span className={appStyles.freshness}>{data.isLoading ? "Updating…" : freshness}</span>
      </div>

      <div className={styles.cards}>
        {maps ? (
          <section className={styles.mapPanel} aria-label={"Map of " + garage.name}>
            <div className={styles.map}>
              <iframe title={"Map of " + garage.name} src={maps.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              <ExternalLink className={styles.mapDirections} href={maps.directions} showIcon={false}><Navigation aria-hidden="true" size={15} />Navigate to garage</ExternalLink>
            </div>
          </section>
        ) : null}

        <section className={styles.overview} aria-label="Garage availability">
          <div aria-busy={data.isLoading || data.isBuildingLoading}>
            {(data.isLoading && !data.error) || (data.isBuildingLoading && !data.buildingError) ? (
              <ParkingLoading label="Loading garage" />
            ) : (
              <GarageCard garage={cardGarage} mode="live" building={distanceSort ? data.building : null} buildingName={distanceSort ? sortMenu.building?.buildingName : null} />
            )}
          </div>
          {data.error ? <p className={styles.notice} role="alert">Availability could not load. <button type="button" onClick={retry}>Try again</button></p> : null}
          {data.metadataError ? <p className={styles.notice} role="status">Garage details could not refresh. Showing the last loaded information. <button type="button" onClick={retry}>Try again</button></p> : null}
          {distanceSort && data.buildingError ? <p className={styles.notice}>Walking directions could not load. <button type="button" onClick={retry}>Try again</button></p> : null}
        </section>

        <section className={styles.panel} aria-label="Parking capacity">
          <dl className={styles.categories}>
            {CATEGORIES.map(({ key, label, icon }) => {
              const count = getSpotCategoryCount(garage, key);
              return <div key={key}><dt>{key === "limited_time" ? <Timer aria-hidden="true" size={16} strokeWidth={1.7} /> : <Image src={icon} alt="" width={16} height={16} />}<span>{label}</span></dt><dd>{count === null ? <span aria-label="Unavailable">—</span> : count.toLocaleString("en-US")}</dd></div>;
            })}
          </dl>
          <p className={styles.note}>{totalCapacity !== "Unavailable" ? totalCapacity + " spaces total" : "Total capacity unavailable"} · Category counts show capacity.</p>
        </section>

        <section className={styles.panel} aria-labelledby="garage-hours-heading">
          <div className={styles.sectionHeading}><Clock3 aria-hidden="true" /><h3 id="garage-hours-heading">Parking hours</h3></div>
          {permitRows.length ? permitRows.map((row) => (
            <div className={styles.permitRow} key={row.label}>
              <div className={styles.hours}><span>{row.label}</span><strong>{row.hours}</strong></div>
              <p className={styles.permitDescription}>{row.description}</p>
              <HoursStrip periods={[[row.start, row.end]]} tone={row.tone} permit={row.start === 420 && row.end === 1440} />
            </div>
          )) : (
            <div className={styles.permitRow}>
              <div className={styles.hours}><span>Garage access</span><strong>{hours.label}</strong></div>
              {hours.known ? <HoursStrip periods={openPeriods} /> : null}
            </div>
          )}
          {isSjsu ? <p className={styles.note}>{lotId === "sjsu-south-campus-garage" ? "South Campus permits exclude overnight and event parking. " : "Use spaces eligible for your permit. "}<ExternalLink href={lotId === "sjsu-south-campus-garage" ? PARKING_LINKS.southCampus : PARKING_LINKS.garages}>SJSU permit hours</ExternalLink></p> : null}
        </section>

        {isSjsu ? (
          <section className={styles.panel} aria-labelledby="garage-payment-heading">
            <div className={styles.sectionHeading}><WalletCards aria-hidden="true" /><h3 id="garage-payment-heading">Payment</h3></div>
            <div className={styles.paymentMethods}>
              <ExternalLink className={styles.paymentChoice} href={PARKING_LINKS.parkMobile}><PaymentArtwork method="app" /><span>Pay by app</span></ExternalLink>
              <ExternalLink className={styles.paymentChoice} href={PARKING_LINKS.payment}><PaymentArtwork method="station" /><span>Pay at station</span></ExternalLink>
              <ExternalLink className={styles.paymentChoice} href={PARKING_LINKS.permits}><PaymentArtwork method="permit" /><span>Use a permit</span></ExternalLink>
            </div>
            <div className={styles.paymentNotes}>
              <p><Smartphone aria-hidden="true" /><ExternalLink href={PARKING_LINKS.parkMobile}>Get the ParkMobile app</ExternalLink></p>
              <p><CreditCard aria-hidden="true" /><span>{PAY_STATIONS[lotId] ? "Pay stations: " + PAY_STATIONS[lotId] : "Check SJSU’s payment guide for station locations."}</span></p>
              <p><Ticket aria-hidden="true" /><ExternalLink href={PARKING_LINKS.permits}>View parking permits</ExternalLink></p>
            </div>
          </section>
        ) : null}

        <GarageForecastSection key={lotId} locationId={locationId} garage={cardGarage} currentAt={selectedAt} />

        {isSjsu ? <footer className={styles.footer}><ExternalLink href={PARKING_LINKS.services}>SJSU Parking Services</ExternalLink></footer> : null}
      </div>
    </div>
  );
}
