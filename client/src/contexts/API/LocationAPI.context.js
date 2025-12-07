"use client";

import { createContext, useContext, useState } from "react";

// Location Context
const LocationAPIContext = createContext();
export const useLocationAPI = () => useContext(LocationAPIContext);
export const LocationAPIProvider = ({ children }) => {
  return (
    <LocationAPIContext.Provider value={{}}>
      {children}
    </LocationAPIContext.Provider>
  );
};
