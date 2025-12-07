import React from "react";

// Contexts
import { LocationAPIProvider } from "./API/LocationAPI.context";
import { ForecastAPIProvider } from "./API/ForecastAPI.context";
import { UIProvider } from "./UI/UI.context";

function ContextProvider({ children }) {
  return (
    <UIProvider>
      <LocationAPIProvider>
        <ForecastAPIProvider>{children}</ForecastAPIProvider>
      </LocationAPIProvider>
    </UIProvider>
  );
}

export default ContextProvider;
