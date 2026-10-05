"use client";

import React, { createContext, useContext, useEffect } from "react";
import { mutate as globalMutate } from "swr";

// Utils
import { getSupabase } from "../../lib/utils/client/supabase";

// Contexts
import { useUI } from "../UI/UI.context";
import { useToasts } from "../UI/Toasts.context";

// Constants
import { FILTER_TYPES } from "@/lib/constants/filters";
import { LIVE_OCCUPANCY_KEY } from "@/lib/constants/SWR.keys";
import { LOTS } from "@/lib/constants/sjsu";

const SupabaseContext = createContext();
export const useSupabase = () => useContext(SupabaseContext);
export const SupabaseContextProvider = ({ children }) => {
  const {
    locationID,
    timeFilterMenu: { type },
  } = useUI();
  const { showYellowAlert, showOrangeAlert, showRedAlert } = useToasts();
  const supabase = getSupabase();

  useEffect(() => {
    // Subscribing only in Live mode prevents incoming events from changing a
    // paused snapshot or a selected estimate. The dependency also keeps this
    // gate current when the person changes modes.
    if (!supabase || !locationID || type !== FILTER_TYPES.LIVE.value) return;
    let active = true;
    let refetchTimeout = null;

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
        (payload) => {
          if (!active) return;
          const { lot_id, occupancy_pct } = payload.new || {};
          const occupancyPct = Number(occupancy_pct);
          const lotName = LOTS[lot_id] || lot_id;

          // Check the strongest warning first; a >=70 check first would mask
          // both the orange and red variants.
          if (occupancy_pct !== null && occupancy_pct !== undefined && Number.isFinite(occupancyPct)) {
            if (occupancyPct >= 90) showRedAlert(lotName, occupancyPct);
            else if (occupancyPct >= 80) showOrangeAlert(lotName, occupancyPct);
            else if (occupancyPct >= 70) showYellowAlert(lotName, occupancyPct);
          }

          // Clear previous timeout if exists
          if (refetchTimeout) clearTimeout(refetchTimeout);

          // Schedule SWR mutate after 100ms
          refetchTimeout = setTimeout(() => {
            if (!active) return;
            if (process.env.NODE_ENV === "development") {
              console.log("[ParkingRealtime]", "refetching");
            }

            // Calling mutate with only the shared key revalidates the fetcher.
            // An object in the second position would replace occupancy data.
            globalMutate([LIVE_OCCUPANCY_KEY, locationID]);

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
  }, [supabase, locationID, type, showYellowAlert, showOrangeAlert, showRedAlert]);

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};
