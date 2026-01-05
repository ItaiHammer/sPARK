import React from "react";

// Contexts
import { LocationAPIProvider } from "./API/LocationAPI.context";
import { ForecastAPIProvider } from "./API/ForecastAPI.context";
import { UIProvider } from "./UI/UI.context";
import { SupabaseContextProvider } from "./supabase/Supabase.context";
import { ToastsProvider } from "./UI/Toasts.context";

function ContextProvider({ children }) {
  return (
    <UIProvider>
      <ToastsProvider>
        <SupabaseContextProvider>
          <LocationAPIProvider>
            <ForecastAPIProvider>{children}</ForecastAPIProvider>
          </LocationAPIProvider>
        </SupabaseContextProvider>
      </ToastsProvider>
    </UIProvider>
  );
}

export default ContextProvider;
