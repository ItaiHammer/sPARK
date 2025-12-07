"use client";

import { createContext, useContext } from "react";

// Location Context
const LocationAPIContext = createContext();
export const useLocationAPI = () => useContext(LocationAPIContext);
export const LocationAPIProvider = ({ children }) => {
  const defaultSWROptions = {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
  };
  const authHeaders = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_KEY}`,
    },
  };
  const getAPIURL = (locationId, slug = "") =>
    `/api/locations/${locationId}${slug ? `/${slug}` : ""}`;

  // Get Location Info
  const getLocationInfo = (locationId) =>
    fetch(getAPIURL(locationId), authHeaders)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .catch((err) => {
        console.error(err);
        return { error: err.message, status: err.status, data: null };
      });

  // Get Location Lots
  const getLocationLots = (locationId) =>
    fetch(getAPIURL(locationId, "lots"), authHeaders)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .catch((err) => {
        console.error(err);
        return { error: err.message, status: err.status, data: null };
      });

  return (
    <LocationAPIContext.Provider
      value={{ defaultSWROptions, getLocationInfo, getLocationLots }}
    >
      {children}
    </LocationAPIContext.Provider>
  );
};
