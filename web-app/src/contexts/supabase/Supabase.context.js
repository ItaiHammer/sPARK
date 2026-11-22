"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useSWRConfig } from "swr";
import { getLiveOccupancy } from "@/lib/utils/client/liveOccupancy";

// Utils
import { getSupabase } from "../../lib/utils/client/supabase";

// Contexts
import { useUI } from "../UI/UI.context";

// Constants
import { FILTER_TYPES } from "@/lib/constants/filters";
import { LIVE_OCCUPANCY_KEY } from "@/lib/constants/SWR.keys";

const SupabaseContext = createContext();
export const useSupabase = () => useContext(SupabaseContext);
export const SupabaseContextProvider = ({ children }) => {
  const {
    locationID,
    timeFilterMenu: { type },
  } = useUI();
  const supabase = getSupabase();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    // Subscribing only in Live mode prevents incoming events from changing a
    // paused snapshot or a selected estimate. The dependency also keeps this
    // gate current when the person changes modes.
    if (!supabase || !locationID || type !== FILTER_TYPES.LIVE.value) return;
    let active = true;
    let refetchTimeout = null;
    const occupancy = getLiveOccupancy(locationID);
    const key = [LIVE_OCCUPANCY_KEY, locationID];

    const channel = supabase
      .channel("parking-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lot_occupancy",
          filter: `location_id=eq.${locationID.toLowerCase()}`,
        },
        ({ new: reading }) => {
          if (!active || !occupancy.update(reading)) return;
          // Keep the existing debounce, but update SWR rather than re-fetching.
          if (refetchTimeout) clearTimeout(refetchTimeout);
          refetchTimeout = setTimeout(() => {
            if (active) void mutate(key, occupancy.getData(), { revalidate: false });
            refetchTimeout = null;
          }, 100);
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[ParkingRealtime]", status);
        }

        switch (status) {
          case "SUBSCRIBED":
            if (!active) break;
            // The shared reader merges in-flight reads and limits recovery
            // requests to once per minute, including failed requests.
            void mutate(key).catch(() => {});
            break;

          case "TIMED_OUT":
          case "CLOSED":
            // optional: show "reconnecting" UI
            break;

          case "CHANNEL_ERROR":
            // log to Sentry / Datadog
            break;
        }
      });

    return () => {
      active = false;
      if (refetchTimeout) clearTimeout(refetchTimeout);
      supabase.removeChannel(channel);
    };
  }, [supabase, locationID, type, mutate]);

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};
