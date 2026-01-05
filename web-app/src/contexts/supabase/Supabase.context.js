"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
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
    timeFilterMenu: { date, type },
  } = useUI();
  const { showYellowAlert, showOrangeAlert, showRedAlert } = useToasts();
  const supabase = getSupabase();
  const channelRef = useRef(null);
  const refetchTimeout = useRef(null);

  const checkOccupancy = (lotId, occupancyPct) => {
    const lotName = LOTS[lotId];
    if (occupancyPct >= 70) {
      showYellowAlert(lotName, occupancyPct);
    } else if (occupancyPct >= 80) {
      showOrangeAlert(lotName, occupancyPct);
    } else if (occupancyPct >= 90) {
      showRedAlert(lotName, occupancyPct);
    }
  };

  useEffect(() => {
    if (!locationID || channelRef.current) return;

    channelRef.current = supabase
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
          const { lot_id, occupancy_pct } = payload.new;

          // Send Alerts
          checkOccupancy(lot_id, occupancy_pct);

          // Clear previous timeout if exists
          if (refetchTimeout.current) clearTimeout(refetchTimeout.current);

          // Schedule SWR mutate after 100ms
          refetchTimeout.current = setTimeout(() => {
            if (process.env.NODE_ENV === "development") {
              console.log("[ParkingRealtime]", "refetching");
            }

            // Only refetch if on live mode
            if (type === FILTER_TYPES.LIVE.value)
              globalMutate([LIVE_OCCUPANCY_KEY, locationID, date, type], {
                revalidate: true,
              });

            refetchTimeout.current = null;
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, locationID]);

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};
