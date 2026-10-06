"use client";

import { useMemo, useState } from "react";
import { Calendar, Cloud, ChevronDown } from "lucide-react";
import { DateTime } from "luxon";
import useParkingData from "../home/StatusView/useParkingData";
import { selectionDateTime } from "@/lib/utils/client/parking";
import { openNativePicker } from "@/lib/utils/client/nativePicker";
import GarageForecast from "./GarageForecast";
import timeStyles from "../home/StatusView/TimeSelectionSheet.module.css";
import styles from "./GaragePage.module.css";
import transitionStyles from "./GarageForecastSection.module.css";

export default function GarageForecastSection({ locationId, garage, currentAt }) {
  const [chosenDate, setChosenDate] = useState(null);
  const todayISO = currentAt.toISODate();
  const maxDateISO = currentAt.plus({ days: 6 }).toISODate();
  const dateISO = chosenDate && chosenDate >= todayISO && chosenDate <= maxDateISO ? chosenDate : todayISO;
  const isToday = dateISO === todayISO;
  const selection = useMemo(() => ({
    mode: "forecast",
    dateISO,
    minutes: isToday ? currentAt.hour * 60 + currentAt.minute : 8 * 60,
    zone: currentAt.zoneName,
  }), [dateISO, isToday, currentAt]);
  // Separate forecast browsing from the live garage card. SWR shares cached days.
  const data = useParkingData({ locationId, selection, loadBuildings: false });
  const selectedAt = selectionDateTime(selection);
  const rows = data.forecastByLot.get(garage.lot_id);
  const [settled, setSettled] = useState(null);
  const hasRows = Boolean(rows?.length);
  const canSettle = data.isForecastSettled || (hasRows && (!settled || settled.dateISO === dateISO));
  if (canSettle && (!settled || settled.dateISO !== dateISO || settled.rows !== rows || settled.error !== data.forecastError)) {
    setSettled({ dateISO, selectedAt, rows, error: data.forecastError });
  }
  // Keep the last day's curve and its own date visible until the chosen day's
  // requests finish. The picker updates immediately; estimates stay correctly dated.
  const loading = !data.isForecastSettled;
  const updating = Boolean(loading && settled && settled.dateISO !== dateISO);
  const displayedAt = updating ? settled.selectedAt : selectedAt;
  const displayedRows = updating ? settled.rows : rows;

  const chooseDate = (event) => {
    const value = event.target.value;
    const date = DateTime.fromISO(value, { zone: currentAt.zoneName });
    if (!date.isValid || date.toISODate() !== value || value < todayISO || value > maxDateISO) {
      event.target.value = dateISO;
      return;
    }
    setChosenDate(value === todayISO ? null : value);
  };

  return (
    <section className={styles.panel} aria-labelledby="garage-forecast-heading">
      <div className={styles.sectionHeading}>
        <Cloud aria-hidden="true" /><h3 id="garage-forecast-heading">Forecast</h3>
        <label className={styles.forecastDate}>
          <Calendar size={14} aria-hidden="true" />
          <span aria-hidden="true">{isToday ? `Today · ${selectedAt.toFormat("ccc")}` : selectedAt.toFormat("ccc, LLL d")}</span>
          <ChevronDown size={13} aria-hidden="true" />
          <input className={timeStyles.nativeInput} type="date" min={todayISO} max={maxDateISO} value={dateISO} onClick={openNativePicker} onInput={chooseDate} onChange={chooseDate} aria-label="Forecast date" />
        </label>
      </div>
      <div className={transitionStyles.body} aria-busy={loading}>
        {updating ? <span className={transitionStyles.updating} role="status"><span aria-hidden="true">Updating…</span><span className={styles.srOnly}>Loading forecast for {selectedAt.toFormat("cccc, LLLL d")}</span></span> : null}
        <GarageForecast garage={garage} selectedAt={displayedAt} currentAt={currentAt} rows={displayedRows} updating={updating} loading={loading && !updating} error={updating ? null : data.forecastError} onRetry={() => { data.retry().catch(() => {}); }} />
      </div>
    </section>
  );
}
