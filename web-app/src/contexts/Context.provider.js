import React from "react";

// Contexts
import { LocationAPIProvider } from "./API/LocationAPI.context";
import { ForecastAPIProvider } from "./API/ForecastAPI.context";
import { UIProvider } from "./UI/UI.context";
import { SupabaseContextProvider } from "./supabase/Supabase.context";

function ContextProvider({ children }) {
  return (
    <UIProvider>
      <SupabaseContextProvider>
        <LocationAPIProvider>
          <ForecastAPIProvider>{children}</ForecastAPIProvider>
        </LocationAPIProvider>
      </SupabaseContextProvider>
    </UIProvider>
  );
}

export default ContextProvider;
