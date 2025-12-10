"use client";

import { createContext, useContext, useState } from "react";
import { DateTime } from "luxon";

// Constants
import { FILTER_TYPES } from "@/lib/constants/filters";

const DEFAULT_TIME_FILTER = {
  type: FILTER_TYPES.LIVE.value,
  date: DateTime.now(),
  form: {
    type: FILTER_TYPES.LIVE.value,
    day: DateTime.now().toISODate(),
    time: DateTime.now().toFormat("HH:mm"),
  },
};

// UI Context
const UIContext = createContext();
export const useUI = () => useContext(UIContext);
export const UIProvider = ({ children }) => {
  // Home Page
  const [activeTab, setActiveTab] = useState(null);

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
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
