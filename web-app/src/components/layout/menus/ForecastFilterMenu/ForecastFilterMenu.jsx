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
      form: { type: formType, day, time },
    },
    updateTimeFilterMenu,
    toggleTimeFilter,
  } = useUI();

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      toggleTimeFilter();
    }
  };

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
      type: formType,
      date:
        formType === FILTER_TYPES.LIVE.value
          ? DateTime.now()
          : getCombinedDate(day, time),
    });

    toggleTimeFilter();
  };

  const isChanged =
    formType === FILTER_TYPES.LIVE.value
      ? formType !== currentType
      : formType !== currentType ||
        getCombinedDate(day, time).toISO() !==
          DateTime.fromISO(currentDate).toISO();

  console.log(isChanged);
  console.log(getCombinedDate(day, time).toISO());
  console.log(DateTime.fromISO(currentDate).toISO());
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
            onClick={handleBackdropClick}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 bottom-0 bg-white z-50 rounded-t-2xl shadow-2xl flex flex-col p-6"
          >
            {/* Header - Fixed at top */}
            <Header />

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto max-w-full overflow-x-hidden mb-8">
              {/* Radio Options */}
              <RadioOptions />

              {/* Custom Date/Time Pickers (shown when Custom is selected) */}
              {formType === FILTER_TYPES.CUSTOM.value ? (
                <TimeDateForm />
              ) : (
                <div className="flex items-center justify-center mt-12">
                  <img
                    src="/icons/sjsu_building.svg"
                    alt="Building illustration"
                    className="max-w-full h-auto"
                  />
                </div>
              )}
            </div>

            {/* Apply Button - Fixed at bottom */}
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ForecastFilterMenu;
