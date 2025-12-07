import React from "react";

// Contexts
import { LocationAPIProvider } from "./API/LocationAPI.context";
import { UIProvider } from "./UI/UI.context";

function ContextProvider({ children }) {
  return (
    <UIProvider>
      <LocationAPIProvider>{children}</LocationAPIProvider>
    </UIProvider>
  );
}

export default ContextProvider;
