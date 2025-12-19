"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronsUpDown, Search } from "lucide-react";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

// Components
import BuildingsList from "./BuildingsList";

function BuildingSelectionMenu() {
  const {
    sortMenu: { isBuildingSelectionOpen },
    closeBuildingSelectionMenu,
  } = useUI();

  const [searchQuery, setSearchQuery] = useState("");
  const resetSearchQuery = () => setSearchQuery("");

  return (
    <AnimatePresence>
      {isBuildingSelectionOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-55"
            onClick={() => {
              resetSearchQuery();
              closeBuildingSelectionMenu();
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 26,
              mass: 1,
            }}
            className="fixed inset-x-0 top-12 bottom-0 bg-white z-60 rounded-t-2xl shadow-2xl flex flex-col "
          >
            {/* Header */}
            <div className="p-8 pb-6">
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => {
                    resetSearchQuery();
                    closeBuildingSelectionMenu();
                  }}
                  className="w-8 h-8 flex items-center justify-center text-secondary-gray transition-colors hover:text-primary-black"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900 flex-1 text-center">
                  Select Building
                </h2>
                <div className="w-8" /> {/* Spacer for centering */}
              </div>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-gray" />
                <input
                  type="text"
                  placeholder="Search Buildings"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-lg outline-none bg-fill-gray text-sm text-primary-black placeholder-secondary-gray placeholder:text-sm border-2 border-transparent focus:border-main-blue transition-all duration-200"
                />
              </div>

              {/* Sort Indicator */}
              <div className="flex items-center gap-2 text-sm text-secondary-gray">
                <span>Sorted A-Z</span>
                <ChevronsUpDown className="w-4 h-4" />
              </div>
            </div>

            {/* Buildings List */}
            <BuildingsList
              searchQuery={searchQuery}
              resetSearchQuery={resetSearchQuery}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BuildingSelectionMenu;
