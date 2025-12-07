"use client";
import React from "react";
import styles from "./AppHeader.module.css";

// Contexts
import { useUI } from "@/contexts/UI/UI.context";

export default function AppHeader({ tabs = [] }) {
  const { activeTab, setActiveTab } = useUI();

  return (
    <header>
      <div className={styles.brandBar}>
        <h1 className={styles.brand}>SPARK</h1>
        {/* <img src="/spark-logo.svg" className={styles.brand} /> */}
      </div>

      <div
        className={styles.tabSection}
        style={{
          "--num-tabs": tabs.length,
          "--active-index": tabs.findIndex((p) => p.id === activeTab),
        }}
      >
        <div className={styles.tabSectionRow}>
          {tabs.map((p) => {
            const isActive = p.id === activeTab;
            return (
              <button
                key={p.id}
                type="button"
                className={styles.tab}
                onClick={() => {
                  setActiveTab(p.id);
                }}
              >
                <p
                  className={`${styles.tabText} ${
                    isActive ? styles.tabTextActive : ""
                  }`}
                >
                  {p.name}
                </p>
              </button>
            );
          })}
        </div>
        <div className={styles.tabUnderlineContainer}>
          <div className={styles.tabUnderline}></div>
        </div>
      </div>
    </header>
  );
}
