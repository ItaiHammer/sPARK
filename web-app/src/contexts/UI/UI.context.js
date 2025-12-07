"use client";

import { createContext, useContext, useState } from "react";

// UI Context
const UIContext = createContext();
export const useUI = () => useContext(UIContext);
export const UIProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState(null);

  return (
    <UIContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </UIContext.Provider>
  );
};
