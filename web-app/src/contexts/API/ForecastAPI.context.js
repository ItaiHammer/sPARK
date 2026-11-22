"use client";

import { createContext, useContext } from "react";
import { getInternalAuthHeader } from "@/lib/constants/api.constants";
import { DateTime } from "luxon";

// Forecast Context
const ForecastAPIContext = createContext();
export const useForecastAPI = () => useContext(ForecastAPIContext);
export const ForecastAPIProvider = ({ children }) => {
  const getAPIURL = (slug = "", queryParams = "") =>
    `/api/forecast${slug ? `/${slug}` : ""}${
      queryParams ? `?${queryParams}` : ""
    }`;

  // Get Forecast Points
  const getForecastPoints = (locationId, date) => {
    return fetch(
      getAPIURL("points", `location_id=${locationId}&time=${date.toUTC().toISO()}`),
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
  };

  return (
    <ForecastAPIContext.Provider
      value={{
        getForecastPoints,
      }}
    >
      {children}
    </ForecastAPIContext.Provider>
  );
};
