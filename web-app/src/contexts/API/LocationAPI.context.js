"use client";

import { createContext, useContext } from "react";
import { getInternalAuthHeader } from "@/lib/constants/api.constants";
import { parkingRequest } from "@/lib/utils/client/parkingRequest";

const LocationAPIContext = createContext();
export const useLocationAPI = () => useContext(LocationAPIContext);

const getAPIURL = (locationId, slug = "") =>
  "/api/locations/" + encodeURIComponent(locationId) + (slug ? "/" + slug : "");
const request = (locationId, slug) =>
  parkingRequest(getAPIURL(locationId, slug), getInternalAuthHeader());

const locationAPI = {
  getLocationInfo: (locationId) => request(locationId),
  getLocationLots: (locationId) => request(locationId, "lots"),
  getLatestOccupancy: (locationId) => request(locationId, "occupancy"),
  getLocationBuildings: (locationId) => request(locationId, "buildings"),
  getBuildingDistances: (locationId, buildingId) =>
    request(locationId, "buildings/" + encodeURIComponent(buildingId) + "/calculate"),
};

export function LocationAPIProvider({ children }) {
  return <LocationAPIContext.Provider value={locationAPI}>{children}</LocationAPIContext.Provider>;
}
