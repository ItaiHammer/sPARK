"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { DateTime } from "luxon";

// Utils
import {
  getLocalSortType,
  getLocalSortBuilding,
  setLocalSortType,
} from "@/lib/utils/storage";

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
  type: SORT_TYPES.EMPTIEST_FIRST.value,
  building: null,
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

  // Sort Menu
  const [sortMenu, setSortMenu] = useState({
    isOpen: false,
    isBuildingSelectionOpen: false,
    ...DEFAULT_SORT_MENU,
  });

  // Load sort type from localStorage on client-side mount
  useEffect(() => {
    const savedSortType = getLocalSortType();
    if (savedSortType) {
      const savedBuilding = getLocalSortBuilding();
      setSortMenu((prev) => ({
        ...prev,
        type: savedSortType,
        building: savedBuilding || DEFAULT_SORT_MENU.building,
      }));
    }
  }, []);

  // Toggle Sort Menu
  const toggleSortMenu = () =>
    setSortMenu((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
      isBuildingSelectionOpen: false,
    }));

  // Close Sort Menu
  const closeSortMenu = () =>
    setSortMenu((prev) => ({
      ...prev,
      isOpen: false,
      isBuildingSelectionOpen: false,
    }));

  // Open Building Selection Menu
  const openBuildingSelectionMenu = () =>
    setSortMenu((prev) => ({
      ...prev,
      isBuildingSelectionOpen: true,
    }));

  // Close Building Selection Menu
  const closeBuildingSelectionMenu = () =>
    setSortMenu((prev) => ({
      ...prev,
      isBuildingSelectionOpen: false,
      isOpen: true,
    }));

  // Select Building Option
  const selectBuildingOption = (building) => {
    setLocalSortType(SORT_TYPES.DISTANCE_TO_BUILDING.value, building);
    setSortMenu((prev) => ({
      ...prev,
      building,
      isOpen: false,
      isBuildingSelectionOpen: false,
      type: SORT_TYPES.DISTANCE_TO_BUILDING.value,
    }));
  };

  // Select Sort Option
  const selectSortOption = (sortType) => {
    setLocalSortType(sortType);
    setSortMenu((prev) => ({
      ...prev,
      isOpen: false,
      isBuildingSelectionOpen:
        sortType === SORT_TYPES.DISTANCE_TO_BUILDING.value,
      type: sortType,
    }));
  };

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
        openBuildingSelectionMenu,
        closeBuildingSelectionMenu,
        selectBuildingOption,
        selectSortOption,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
