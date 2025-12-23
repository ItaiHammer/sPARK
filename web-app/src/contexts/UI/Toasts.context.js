"use client";

import { createContext, useContext } from "react";
import { toast } from "sonner";
import FullnessAlertToast from "@/components/layout/toasts/FullnessAlertToast";

const ToastsContext = createContext();
export const useToasts = () => useContext(ToastsContext);

export const ToastsProvider = ({ children }) => {
  const DEFAULT_DURATION = 5000;
  const showRedAlert = (garageName, fullness) => {
    toast.custom(
      (t) => (
        <FullnessAlertToast
          garageName={garageName}
          fullness={fullness}
          variant="red"
        />
      ),
      {
        duration: DEFAULT_DURATION,
      }
    );
  };

  const showOrangeAlert = (garageName, fullness) => {
    toast.custom(
      (t) => (
        <FullnessAlertToast
          garageName={garageName}
          fullness={fullness}
          variant="orange"
        />
      ),
      {
        duration: DEFAULT_DURATION,
      }
    );
  };

  const showYellowAlert = (garageName, fullness) => {
    toast.custom(
      (t) => (
        <FullnessAlertToast
          garageName={garageName}
          fullness={fullness}
          variant="yellow"
        />
      ),
      {
        duration: DEFAULT_DURATION,
      }
    );
  };

  return (
    <ToastsContext.Provider
      value={{ showRedAlert, showOrangeAlert, showYellowAlert }}
    >
      {children}
    </ToastsContext.Provider>
  );
};
