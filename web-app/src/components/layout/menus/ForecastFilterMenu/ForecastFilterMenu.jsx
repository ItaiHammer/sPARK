"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DateTime } from "luxon";

// Constants
import { FILTER_TYPES } from "@/lib/constants/filters";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

// Components
import Header from "./Header";
import RadioOptions from "./RadioOptions";
import TimeDateForm from "./TimeDateForm";

function ForecastFilterMenu() {
  const {
    timeFilterMenu: {
      isOpen,
      type: currentType,
      date: currentDate,
      form: { day, time },
    },
    updateTimeFilterMenu,
    toggleTimeFilter,
    resetTimeFilterForm,
  } = useUI();

  const getCombinedDate = (day, time) => {
    const date = DateTime.fromISO(day);
    const [hour, minute, second] = time.split(":").map(Number);
    return date.set({
      hour,
      minute,
      second,
    });
  };

  const handleApplyClick = () => {
    updateTimeFilterMenu({
      type: FILTER_TYPES.CUSTOM.value,
      date: getCombinedDate(day, time),
    });

    toggleTimeFilter();
  };

  const isChanged =
    currentType === FILTER_TYPES.LIVE.value ||
    getCombinedDate(day, time).toISO() !==
      DateTime.fromISO(currentDate).toISO();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => toggleTimeFilter()}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 16,
              mass: 0.8,
            }}
            className="fixed inset-x-0 top-12 bottom-0 bg-white z-50 rounded-t-2xl shadow-2xl flex flex-col p-6"
          >
            {/* Header - Fixed at top */}
            <Header />

            {/* Time and Date form */}
            <TimeDateForm />

            {/* Apply Button */}
            <button
              disabled={!isChanged}
              className={`w-full py-3 rounded-full font-medium text-base transition-all ${
                !isChanged
                  ? "bg-divider-gray text-secondary-gray cursor-not-allowed"
                  : "bg-main-blue text-white hover:bg-main-blue/80 active:bg-main-blue/80"
              }`}
              onClick={handleApplyClick}
            >
              Apply
            </button>
            <button
              disabled={currentType === FILTER_TYPES.LIVE.value}
              onClick={resetTimeFilterForm}
              className={`text-sm font-medium mt-6 underline ${
                currentType === FILTER_TYPES.LIVE.value
                  ? "text-secondary-gray opacity-50"
                  : "text-primary-black"
              }`}
            >
              Reset to Live
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ForecastFilterMenu;
