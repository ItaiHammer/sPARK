"use client";

import { createContext, useContext } from "react";
import { getInternalAuthHeader } from "@/lib/constants/api.constants";

// Location Context
const LocationAPIContext = createContext();
export const useLocationAPI = () => useContext(LocationAPIContext);
export const LocationAPIProvider = ({ children }) => {
  const getAPIURL = (locationId, slug = "") =>
    `/api/locations/${locationId}${slug ? `/${slug}` : ""}`;

  // Get Location Info
  const getLocationInfo = (locationId) =>
    fetch(getAPIURL(locationId), getInternalAuthHeader())
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
    fetch(getAPIURL(locationId, "lots"), getInternalAuthHeader())
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .catch((err) => {
        console.error(err);
        return { error: err.message, status: err.status, data: null };
      });

  // Get Latest Occupancy
  const getLatestOccupancy = (locationId) =>
    fetch(getAPIURL(locationId, "occupancy"), getInternalAuthHeader())
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .catch((err) => {
        console.error(err);
        return { error: err.message, status: err.status, data: null };
      });

  // Get Location Buildings
  const getLocationBuildings = (locationId) =>
    fetch(getAPIURL(locationId, "buildings"), getInternalAuthHeader())
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .catch((err) => {
        console.error(err);
        return { error: err.message, status: err.status, data: null };
      });

  // Get Building Distances
  const getBuildingDistances = (locationId, buildingId) =>
    fetch(
      getAPIURL(locationId, `buildings/${buildingId}/calculate`),
      getInternalAuthHeader()
    )
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .catch((err) => {
        console.error(err);
        return { error: err.message, status: err.status, data: null };
      });

  // Get Lot Forecast Points
  const getLotForecastPoints = (locationId, lotId, date) =>
    fetch(
      getAPIURL(locationId, `lots/forecast`),
      getInternalAuthHeader("POST", { lot_id: lotId, date })
    )
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
      value={{
        getLocationInfo,
        getLocationLots,
        getLatestOccupancy,
        getLocationBuildings,
        getBuildingDistances,
        getLotForecastPoints,
      }}
    >
      {children}
    </LocationAPIContext.Provider>
  );
};
