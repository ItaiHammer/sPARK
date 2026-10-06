"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { DEFAULT_SORT_TYPE, SORT_TYPES, getSortLabel } from "@/lib/constants/sort";
import styles from "./StatusViewPage.module.css";

const options = Object.values(SORT_TYPES);
const firstCategoryOption = options.find((option) => option.category)?.value;

export default function SortControls({ sortType, building, buildings, isBuildingsLoading, buildingError, onRetry, onSort, onBuilding }) {
  const [open, setOpen] = useState(false);
  const [choosingBuilding, setChoosingBuilding] = useState(false);
  const [query, setQuery] = useState("");
  const wrapper = useRef(null);
  const trigger = useRef(null);
  const popup = useRef(null);
  const id = useId();
  const label = getSortLabel(sortType, building?.buildingName);
  const matchingBuildings = buildings.filter((item) => `${item.name} ${item.abbreviation}`.toLowerCase().includes(query.trim().toLowerCase()));

  const close = () => { setOpen(false); setChoosingBuilding(false); };

  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!wrapper.current?.contains(event.target)) { setOpen(false); setChoosingBuilding(false); }
    };
    const escape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      setChoosingBuilding(false);
      trigger.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    const frame = requestAnimationFrame(() => popup.current?.querySelector(choosingBuilding ? "input" : '[aria-checked="true"], button')?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open, choosingBuilding]);

  const menuKeys = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = [...popup.current.querySelectorAll('[role="menuitemradio"]')];
    const index = items.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div className={styles.sortWrapper} ref={wrapper} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
    }}>
      <button className={styles.topControl} ref={trigger} type="button" title={label} aria-label={`Sort garages: ${label}`} aria-haspopup={choosingBuilding ? "dialog" : "menu"} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => { setOpen(!open); setChoosingBuilding(false); }}>
        <SlidersHorizontal aria-hidden="true" />
        <span className={styles.sortLabel}>{label}</span>
        <ChevronDown className={styles.chevron} aria-hidden="true" />
      </button>
      {open ? (
        <div className={`${styles.sortPopup} ${choosingBuilding ? styles.buildingPopup : ""}`} ref={popup} id={id} role={choosingBuilding ? "dialog" : "menu"} aria-label={choosingBuilding ? "Choose a building" : "Sort garages"} onKeyDown={choosingBuilding ? undefined : menuKeys}>
          {choosingBuilding ? (
            <>
              <div className={styles.buildingHeading}>
                <button type="button" className={styles.backButton} aria-label="Back to sorting options" onClick={() => setChoosingBuilding(false)}><ArrowLeft aria-hidden="true" /></button>
                <h3>Choose a building</h3>
              </div>
              <label className={styles.buildingSearch}>
                <Search aria-hidden="true" />
                <input type="search" aria-label="Search buildings" placeholder="Name or abbreviation" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <div className={styles.buildingList}>
                {matchingBuildings.map((item) => (
                  <button className={styles.buildingChoice} type="button" key={item.building_id} onClick={() => {
                    onBuilding({ buildingID: item.building_id, buildingName: item.abbreviation || item.name });
                    close();
                    trigger.current?.focus({ preventScroll: true });
                  }}>
                    <span>{item.abbreviation}</span><span>{item.name}</span>
                  </button>
                ))}
                {isBuildingsLoading ? <p className={styles.menuMessage} role="status">Loading buildings…</p> : !matchingBuildings.length ? <p className={styles.menuMessage}>{buildingError ? "Buildings could not load." : buildings.length ? "No matching buildings" : "No buildings available"}</p> : null}
                {buildingError ? <button className={styles.retryButton} type="button" onClick={onRetry}>Try again</button> : null}
              </div>
            </>
          ) : options.map((option) => (
            <Fragment key={option.value}>
              {option.value === firstCategoryOption && <div className={styles.sortDivider} role="separator" />}
              <button className={styles.sortChoice} type="button" role="menuitemradio" aria-checked={sortType === option.value} onClick={() => {
                if (option.value === SORT_TYPES.DISTANCE_TO_BUILDING.value) { setQuery(""); setChoosingBuilding(true); return; }
                onSort(option.value);
                close();
                trigger.current?.focus({ preventScroll: true });
              }}>
                <span className={styles.sortChoiceLabel}>
                  <span>{option.label}</span>
                  {option.value === DEFAULT_SORT_TYPE ? <span className={styles.sortDefaultBadge}>Default</span> : null}
                </span>
                {sortType === option.value ? <Check aria-hidden="true" /> : null}
              </button>
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
