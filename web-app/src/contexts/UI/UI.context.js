"use client";

import { createContext, useContext, useState } from "react";
import { DateTime } from "luxon";

// Constants
import { FILTER_TYPES } from "@/lib/constants/filters";
import { SORT_TYPES } from "@/lib/constants/sort";

const DEFAULT_TIME_FILTER = {
  type: FILTER_TYPES.LIVE.value,
  date: DateTime.now(),
  form: {
    type: FILTER_TYPES.LIVE.value,
    day: DateTime.now().toISODate(),
    time: DateTime.now().toFormat("HH:mm"),
  },
};

const DEFAULT_SORT_MENU = {
  isOpen: false,
  type: SORT_TYPES.EMPTIEST_FIRST.value,
  buildingID: null,
  buildingName: null,
};

// UI Context
const UIContext = createContext();
export const useUI = () => useContext(UIContext);
export const UIProvider = ({ children }) => {
  // Home Page
  const [activeTab, setActiveTab] = useState(null);

  // Time Filter Menu
  const [timeFilterMenu, setTimeFilterMenu] = useState({
    isOpen: false,
    ...DEFAULT_TIME_FILTER,
  });

  // Sort Menu
  const [sortMenu, setSortMenu] = useState({
    isOpen: false,
    ...DEFAULT_SORT_MENU,
  });

  // Toggle Time Filter
  const toggleTimeFilter = () =>
    setTimeFilterMenu((prev) => ({ ...prev, isOpen: !prev.isOpen }));

  // Update Time Filter Status
  const updateTimeFilterMenu = (newState) =>
    setTimeFilterMenu((prev) => ({ ...prev, ...newState }));

  const updateTimeFilterForm = (newState) =>
    setTimeFilterMenu((prev) => ({
      ...prev,
      form: { ...prev.form, ...newState },
    }));

  const resetTimeFilterForm = () =>
    setTimeFilterMenu((prev) => ({
      ...prev,
      ...DEFAULT_TIME_FILTER,
    }));

  // Toggle Sort Menu
  const toggleSortMenu = () =>
    setSortMenu((prev) => ({ ...prev, isOpen: !prev.isOpen }));

  // Close Sort Menu
  const closeSortMenu = () =>
    setSortMenu((prev) => ({
      ...prev,
      isOpen: false,
      type: prev.type,
      buildingID: null,
      buildingName: null,
    }));

  // Update Sort Menu Status
  const updateSortMenu = (newState) =>
    setSortMenu((prev) => ({ ...prev, ...newState }));

  const selectSortOption = (sortType) =>
    setSortMenu((prev) => ({ ...prev, isOpen: false, type: sortType }));

  const resetSortMenu = () =>
    setSortMenu((prev) => ({
      ...prev,
      ...DEFAULT_SORT_MENU,
    }));

  return (
    <UIContext.Provider
      value={{
        activeTab,
        setActiveTab,
        timeFilterMenu,
        toggleTimeFilter,
        updateTimeFilterMenu,
        updateTimeFilterForm,
        resetTimeFilterForm,
        sortMenu,
        toggleSortMenu,
        closeSortMenu,
        updateSortMenu,
        selectSortOption,
        resetSortMenu,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
