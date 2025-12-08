"use client";

import { createContext, useContext, useState } from "react";
import { DateTime } from "luxon";

// Constants
import { FILTER_TYPES } from "@/lib/constants/filters";

// UI Context
const UIContext = createContext();
export const useUI = () => useContext(UIContext);
export const UIProvider = ({ children }) => {
  // Home Page
  const [activeTab, setActiveTab] = useState(null);
  const [timeFilterMenu, setTimeFilterMenu] = useState({
    isOpen: false,
    type: FILTER_TYPES.LIVE.value,
    date: DateTime.now(),
    form: {
      day: DateTime.now().toISODate(),
      time: DateTime.now().toFormat("HH:mm"),
    },
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

  return (
    <UIContext.Provider
      value={{
        activeTab,
        setActiveTab,
        timeFilterMenu,
        toggleTimeFilter,
        updateTimeFilterMenu,
        updateTimeFilterForm,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
