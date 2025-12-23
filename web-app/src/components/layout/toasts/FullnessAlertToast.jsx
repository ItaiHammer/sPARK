"use client";

import React from "react";
import { AlertTriangle, Info } from "lucide-react";

const FullnessAlertToast = ({ garageName, fullness, variant = "yellow" }) => {
  const variants = {
    red: {
      bgColor: "bg-occupancy-red/90",
      borderColor: "border-occupancy-red",
      textColor: "text-white",
      icon: <AlertTriangle className="w-5 h-5 text-white" />,
      description: "Parking is nearly full. Consider alternative options.",
    },
    orange: {
      bgColor: "bg-occupancy-orange/90",
      borderColor: "border-occupancy-orange",
      textColor: "text-white",
      icon: <AlertTriangle className="w-5 h-5 text-white" />,
      description:
        "Parking is getting full. Arrive soon for best availability.",
    },
    yellow: {
      bgColor: "bg-sjsu-yellow/90",
      borderColor: "border-sjsu-yellow",
      textColor: "text-white",
      icon: <Info className="w-5 h-5 text-white" />,
      description: "Parking is moderately full. Spaces may be limited.",
    },
  };

  const config = variants[variant];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border-2 ${config.bgColor} ${config.borderColor} ${config.textColor}`}
    >
      <div className="shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-base ${config.textColor}`}>
          {garageName} is {fullness}% full
        </p>
        <p
          className={`text-sm mt-1 ${
            variant === "yellow"
              ? "text-white opacity-80"
              : `${config.textColor} opacity-90`
          }`}
        >
          {config.description}
        </p>
      </div>
    </div>
  );
};

export default FullnessAlertToast;
