import React from "react";
import { motion } from "framer-motion";

function LiveIcon({ className = "", isLive = true }) {
  return (
    <motion.div
      animate={{
        "--glow-blur": ["4px", "10px", "4px"],
      }}
      transition={{
        repeat: Infinity,
        duration: 2,
        ease: "easeInOut",
      }}
      className={`w-2 h-2 mr-0.5 rounded-full translate-z-0 will-change-transform ${
        isLive
          ? " bg-live-red shadow-[0_0_var(--glow-blur)_rgba(255,0,0,0.9)] mr-1"
          : " bg-main-blue shadow-[0_0_var(--glow-blur)_rgba(0,102,255,0.9)] mr-1"
      } ${className}`}
      style={{
        "--glow-blur": "4px",
      }}
    />
  );
}

export default LiveIcon;
