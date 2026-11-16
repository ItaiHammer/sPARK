"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import posthog from "posthog-js";
import { DEFAULT_SORT_TYPE, SORT_TYPES, getSortLabel } from "@/lib/constants/sort";
import styles from "./StatusViewPage.module.css";

const options = Object.values(SORT_TYPES);

export default function SortControls({ sortType, building, buildings, isBuildingsLoading, buildingError, onRetry, onSort, onBuilding, sortOptions = options, trackChanges = true, modal = false }) {
  const [open, setOpen] = useState(false);
  const [choosingBuilding, setChoosingBuilding] = useState(false);
  const [query, setQuery] = useState("");
  const wrapper = useRef(null);
  const trigger = useRef(null);
  const popup = useRef(null);
  const sortHeading = useRef(null);
  const id = useId();
  const label = getSortLabel(sortType, building?.buildingName);
  const triggerLabel = modal && building?.buildingName?.length > 5 ? "Walking" : label;
  const firstCategoryOption = sortOptions.find((option) => option.category)?.value;
  const matchingBuildings = buildings.filter((item) => `${item.name} ${item.abbreviation}`.toLowerCase().includes(query.trim().toLowerCase()));

  const close = (restoreFocus = modal) => {
    if (modal) popup.current?.close();
    setOpen(false);
    setChoosingBuilding(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!open || !modal) return;
    const dialog = popup.current;
    const viewport = window.visualViewport;
    const alignToViewport = () => {
      dialog.style.setProperty("--sort-viewport-top", `${viewport.offsetTop}px`);
      dialog.style.setProperty("--sort-viewport-height", `${viewport.height}px`);
    };
    if (viewport) {
      alignToViewport();
      viewport.addEventListener("resize", alignToViewport);
      viewport.addEventListener("scroll", alignToViewport);
    }
    dialog.showModal();
    sortHeading.current?.focus({ preventScroll: true });
    return () => {
      viewport?.removeEventListener("resize", alignToViewport);
      viewport?.removeEventListener("scroll", alignToViewport);
      dialog.close();
    };
  }, [open, modal]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (modal && !choosingBuilding) {
        sortHeading.current?.focus({ preventScroll: true });
        return;
      }
      const firstChoice = choosingBuilding ? "input" : '[role="menuitemradio"]';
      const selectedChoice = choosingBuilding ? null : popup.current?.querySelector('[aria-checked="true"]');
      (selectedChoice ?? popup.current?.querySelector(firstChoice))?.focus({ preventScroll: true });
    });
    if (modal) return () => cancelAnimationFrame(frame);
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
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open, choosingBuilding, modal]);

  const menuKeys = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = [...popup.current.querySelectorAll('[role="menuitemradio"]')];
    const index = items.indexOf(document.activeElement);
    const goingUp = event.key === "ArrowUp";
    const next = event.key === "Home" ? 0
      : event.key === "End" || (goingUp && index === -1) ? items.length - 1
      : (index + (goingUp ? -1 : 1) + items.length) % items.length;
    items[next]?.focus();
  };

  const Popup = modal ? "dialog" : "div";
  const Choices = modal ? "div" : Fragment;
  const choicesProps = modal ? { className: styles.modalSortChoices, role: "menu", "aria-label": "Sort options" } : {};
  return (
    <div className={styles.sortWrapper} ref={wrapper} onBlur={(event) => {
      if (!modal && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
    }}>
      <button
        className={`${styles.topControl}${modal ? ` ${styles.modalSortTrigger}` : ""}`}
        ref={trigger}
        type="button"
        title={label}
        aria-label={`Sort garages: ${triggerLabel === label ? label : `${triggerLabel} (${label})`}`}
        aria-haspopup={modal || choosingBuilding ? "dialog" : "menu"}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => { setOpen(!open); setChoosingBuilding(false); }}
      >
        <SlidersHorizontal aria-hidden="true" />
        <span className={styles.sortLabel}>{triggerLabel}</span>
        <ChevronDown className={styles.chevron} aria-hidden="true" />
      </button>
      {open ? (
        <Popup
          className={modal ? styles.sortDialog : `${styles.sortPopup} ${choosingBuilding ? styles.buildingPopup : ""}`}
          ref={popup}
          id={id}
          role={modal || choosingBuilding ? "dialog" : "menu"}
          aria-label={choosingBuilding ? "Choose a building" : "Sort garages"}
          onKeyDown={choosingBuilding ? undefined : menuKeys}
          onCancel={modal ? (event) => { event.preventDefault(); close(); } : undefined}
          onClick={modal ? (event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX >= bounds.right || event.clientY < bounds.top || event.clientY >= bounds.bottom) close();
          } : undefined}
        >
          {modal && (
            <button className={`${styles.backButton} ${styles.closeSortDialog}`} type="button" aria-label="Close sorting options" onClick={() => close()}>
              <X aria-hidden="true" />
            </button>
          )}
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
                    if (trackChanges && (sortType !== SORT_TYPES.DISTANCE_TO_BUILDING.value || building?.buildingID !== item.building_id)) {
                      posthog.capture("garage_sort_changed", { sort_type: SORT_TYPES.DISTANCE_TO_BUILDING.value });
                    }
                    close(true);
                  }}>
                    <span>{item.abbreviation}</span><span>{item.name}</span>
                  </button>
                ))}
                {isBuildingsLoading ? <p className={styles.menuMessage} role="status">Loading buildings…</p> : !matchingBuildings.length ? <p className={styles.menuMessage}>{buildingError ? "Buildings could not load." : buildings.length ? "No matching buildings" : "No buildings available"}</p> : null}
                {buildingError ? <button className={styles.retryButton} type="button" onClick={onRetry}>Try again</button> : null}
              </div>
            </>
          ) : (
            <>
              {modal && <h3 ref={sortHeading} tabIndex={-1} className={styles.modalSortHeading}>Sort garages</h3>}
              <Choices {...choicesProps}>
                {sortOptions.map((option) => (
                  <Fragment key={option.value}>
                    {option.value === firstCategoryOption && <div className={styles.sortDivider} role="separator" />}
                    <button className={styles.sortChoice} type="button" role="menuitemradio" aria-checked={sortType === option.value} onClick={() => {
                      if (option.value === SORT_TYPES.DISTANCE_TO_BUILDING.value) { setQuery(""); setChoosingBuilding(true); return; }
                      onSort(option.value);
                      if (trackChanges && option.value !== sortType) {
                        posthog.capture("garage_sort_changed", { sort_type: option.value });
                      }
                      close(true);
                    }}>
                      <span className={styles.sortChoiceLabel}>
                        <span>{option.label}</span>
                        {option.value === DEFAULT_SORT_TYPE ? <span className={styles.sortDefaultBadge}>Default</span> : null}
                      </span>
                      {sortType === option.value ? <Check aria-hidden="true" /> : null}
                    </button>
                  </Fragment>
                ))}
              </Choices>
            </>
          )}
        </Popup>
      ) : null}
    </div>
  );
}
