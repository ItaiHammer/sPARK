"use client";

import { useId, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import { getSpotCategorySort, getSpotCategoryCount } from "@/lib/constants/sort";
import {
  CalendarClock,
  CircleCheck,
  CircleParking,
  DoorOpen,
  Hourglass,
  Info,
  Timer,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import styles from "./GarageCard.module.css";
import { animateGarageValues, cardEntranceDelay, CARD_ENTRANCE_MS, formatEntranceNumber } from "./garageEntrance";
import { walkingDirectionsUrl } from "./walkingDirections";

function EntranceNumber({ value, fractionDigits = 0 }) {
  const formatted = formatEntranceNumber(value, fractionDigits);
  return (
    <span className={styles.entranceNumber}>
      <span className={styles.numberSize} aria-hidden="true">{formatted}</span>
      <span className={styles.numberDisplay} aria-hidden="true" data-entrance-value={value} data-fraction-digits={fractionDigits}>{formatted}</span>
      <span className={styles.srOnly}>{formatted}</span>
    </span>
  );
}

const ALERT_ICONS = Object.freeze({
  opening: DoorOpen,
  closing: Timer,
  fullSoon: Hourglass,
  busySoon: Users,
  recovery: CalendarClock,
  availableSoon: CalendarClock,
  moreSpaces: TrendingUp,
  fewerSpaces: TrendingDown,
  limited: TriangleAlert,
  roomy: CircleCheck,
  available: CircleParking,
  unknown: Info,
  info: Info,
});

function finiteNumber(value) {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cardValues(garage) {
  const occupied = finiteNumber(
    Object.hasOwn(garage, "occupied")
      ? garage.occupied
      : garage.point ?? garage.occupancy_pct,
  );
  const capacity = finiteNumber(garage.spot_count);
  const spaces = Object.hasOwn(garage, "spaces")
    ? finiteNumber(garage.spaces)
    : occupied != null && capacity != null
      ? Math.floor((1 - occupied / 100) * capacity)
      : null;

  return {
    occupied: occupied == null ? null : Math.round(Math.min(100, Math.max(0, occupied))),
    spaces: spaces == null ? null : Math.max(0, Math.round(spaces)),
  };
}

function travelValues(travel, buildingName) {
  if (!travel) return null;
  const minutes = Object.hasOwn(travel, "minutes")
    ? finiteNumber(travel.minutes)
    : finiteNumber(travel.duration) == null
      ? null
      : Math.round(Number(travel.duration) / 60);
  const miles = Object.hasOwn(travel, "miles")
    ? finiteNumber(travel.miles)
    : finiteNumber(travel.distance) == null
      ? null
      : Number(travel.distance) / 1609.34;
  if (minutes == null || miles == null) return null;

  return {
    minutes: Math.max(0, Math.round(minutes)),
    miles: Math.max(0, miles).toFixed(2),
    building: travel.buildingAbbreviation || buildingName || null,
  };
}

export default function GarageCard({
  garage = {},
  mode = "live",
  order = 0,
  animateEntrance = true,
  building,
  buildingName,
  sortType,
}) {
  const titleId = useId();
  const { occupied, spaces } = cardValues(garage);
  const closed = garage.closed === true;
  const status = closed
    ? "Closed"
    : occupied >= 93
      ? "Nearly full"
      : occupied >= 80
        ? "Busy"
        : "Available";
  const statusKind = closed
    ? "closed"
    : occupied == null
      ? "unknown"
      : occupied >= 93
        ? "full"
        : occupied >= 80
          ? "busy"
          : "available";
  const alert = garage.alert?.text ? garage.alert : null;
  const AlertIcon = Object.hasOwn(ALERT_ICONS, alert?.type)
    ? ALERT_ICONS[alert.type]
    : Info;
  const travel = travelValues(garage.travel, buildingName);
  const directionsUrl = walkingDirectionsUrl(garage, building);
  const TravelContainer = directionsUrl ? "a" : "div";
  const categorySort = getSpotCategorySort(sortType);
  const categoryCount = categorySort ? getSpotCategoryCount(garage, categorySort.category.key) : null;
  const card = useRef(null);
  const delay = cardEntranceDelay(order);
  const valueKey = JSON.stringify([closed, occupied, spaces, categoryCount, travel?.minutes, travel?.miles]);
  const initialValues = useRef(valueKey);
  const completedEntrance = useRef(false);

  useLayoutEffect(() => {
    // A data update settles immediately instead of counting from zero again.
    // Strict Mode's setup/cleanup/setup can still replay the initial sequence.
    if (valueKey !== initialValues.current) completedEntrance.current = true;
    return animateGarageValues(card.current, {
      enabled: animateEntrance && !completedEntrance.current,
      delay,
      onComplete: () => { completedEntrance.current = true; },
    });
  }, [animateEntrance, delay, valueKey]);

  return (
    <article
      ref={card}
      className={`${styles.card}${animateEntrance ? ` ${styles.entering}` : ""}`}
      aria-labelledby={titleId}
      data-mode={mode}
      data-status={statusKind}
      style={{ "--card-delay": `${delay}ms`, "--card-entrance-duration": `${CARD_ENTRANCE_MS}ms` }}
    >
      <div className={styles.summary}>
        <div className={styles.top}>
          <div className={styles.title}>
            <h3 className={styles.name} id={titleId}>
              <span className={styles.modeDot} aria-hidden="true" />
              {garage.name}
            </h3>
            <div className={styles.occupancy}>
              <span className={styles.occupied}>
                {closed
                  ? "Outside open hours"
                  : occupied == null
                    ? "Availability unavailable"
                    : <><EntranceNumber value={occupied} />% occupied</>}
              </span>
              {(closed || occupied != null) && <span className={styles.status}>{status}</span>}
            </div>
          </div>

          <div className={styles.numbers}>
            <span className={styles.count}>
              {closed || spaces == null ? "—" : <>{spaces > 0 ? "~" : ""}<EntranceNumber value={spaces} /></>}
            </span>
            {!closed && spaces != null && <span className={styles.caption}>spaces left</span>}
          </div>
        </div>

        {!closed && occupied != null && (
          <div className={styles.meter} aria-hidden="true">
            <span data-entrance-bar style={{ width: `${occupied}%` }} />
          </div>
        )}

        {(alert || garage.hours) && (
          <div className={styles.foot}>
            {alert && (
              <span className={styles.indicator}>
                <AlertIcon aria-hidden="true" strokeWidth={1.7} />
                <span>{alert.text}</span>
              </span>
            )}
            {garage.hours && <span className={styles.hours}>{garage.hours}</span>}
          </div>
        )}

        {travel && (
          <TravelContainer
            className={styles.travel}
            href={directionsUrl || undefined}
            target={directionsUrl ? "_blank" : undefined}
            rel={directionsUrl ? "noopener noreferrer" : undefined}
            aria-label={directionsUrl ? `Walk to ${travel.building || building?.name || "the building"}, about ${travel.minutes} minutes, ${travel.miles} miles — Google Maps walking directions from ${garage.name} (opens in a new tab)` : undefined}
          >
            <span className={styles.travelIcon} aria-hidden="true" />
            <span className={styles.travelText}>
              <span>Walk{travel.building ? ` to ${travel.building}` : " to building"}</span>
              {directionsUrl && (
                <svg className={styles.travelLinkIcon} aria-hidden="true" viewBox="2 2 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 7l-10 10" />
                  <path d="M8 7h9v9" />
                </svg>
              )}
            </span>
            <span className={styles.travelMetrics}>
              <strong className={styles.travelTime}>~<EntranceNumber value={travel.minutes} /> min</strong>
              <span className={styles.travelDistance}><EntranceNumber value={Number(travel.miles)} fractionDigits={2} /> mi</span>
            </span>
          </TravelContainer>
        )}
        {categorySort && (
          <div className={styles.categoryFooter} data-spot-category={categorySort.category.key}>
            {categorySort.category.key === "limited_time"
              ? <Timer className={styles.categoryIcon} aria-hidden="true" strokeWidth={1.7} />
              : <Image className={styles.categoryIcon} src={categorySort.icon} width={14} height={14} alt="" />}
            <span className={styles.categoryLabel}>{categorySort.category.label}</span>
            {categoryCount === null ? (
              <span className={styles.categoryMissing}>Not available</span>
            ) : (
              <span className={styles.categoryTotal}>
                <strong><EntranceNumber value={categoryCount} /></strong>
                <span>total</span>
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
