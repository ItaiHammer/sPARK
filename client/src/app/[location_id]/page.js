"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "next/navigation";

// Components
import AppHeader from "@/components/layout/header/AppHeader";
import StatusView from "@/components/pages/home/StatusView/StatusView";
import ArrivalTimeView from "@/components/pages/home/ArrivalTimeView/ArrivalTimeView";

export default function SimpleForecastPage() {
  const { location_id } = useParams();
  const tabs = [
    { id: "status", name: "Status View", component: StatusView },
    {
      id: "arrival",
      name: "Plan Your Arrival",
      component: ArrivalTimeView,
    },
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const active = tabs.find((p) => p.id === activeTab) || tabs[0];

  return (
    <div>
      <AppHeader tabs={tabs} onChange={setActiveTab} activeTab={activeTab} />

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {active.component ? (
              <active.component locationId={location_id} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
