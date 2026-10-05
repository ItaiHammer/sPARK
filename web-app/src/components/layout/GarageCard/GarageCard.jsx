"use client";

import { useId } from "react";
import {
  CalendarClock,
  CircleCheck,
  CircleParking,
  DoorOpen,
  Footprints,
  Hourglass,
  Info,
  Timer,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import styles from "./GarageCard.module.css";

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
  buildingName,
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
  const count = closed || spaces == null
    ? "—"
    : spaces === 0
      ? "0"
      : `~${spaces.toLocaleString("en-US")}`;

  return (
    <article
      className={`${styles.card}${animateEntrance ? ` ${styles.entering}` : ""}`}
      aria-labelledby={titleId}
      data-mode={mode}
      data-status={statusKind}
      style={{ "--card-delay": `${Math.min(Math.max(order, 0), 8) * 20}ms` }}
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
                    : `${occupied}% occupied`}
              </span>
              {(closed || occupied != null) && <span className={styles.status}>{status}</span>}
            </div>
          </div>

          <div className={styles.numbers}>
            <span className={styles.count}>{count}</span>
            {!closed && spaces != null && <span className={styles.caption}>spaces left</span>}
          </div>
        </div>

        {!closed && occupied != null && (
          <div className={styles.meter} aria-hidden="true">
            <span style={{ width: `${occupied}%` }} />
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
          <div className={styles.travel}>
            <Footprints aria-hidden="true" strokeWidth={1.7} />
            <span className={styles.travelText}>
              ~{travel.minutes} min walk{travel.building ? ` to ${travel.building}` : ""}
            </span>
            <span className={styles.travelDistance}>{travel.miles} mi</span>
          </div>
        )}
      </div>
    </article>
  );
}
