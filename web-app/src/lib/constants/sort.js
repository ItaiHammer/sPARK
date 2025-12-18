export const SORT_TYPES = Object.freeze({
  EMPTIEST_FIRST: {
    label: "Emptiest First",
    value: "emptiest_first",
    icon: "/icons/emptiest_first_icon.svg",
  },
  DISTANCE_TO_BUILDING: {
    label: "Distance to Selected Building",
    value: "distance_to_building",
    icon: "/icons/building_icon.svg",
  },
  MOST_DISABLED: {
    label: "Most Disabled Spots",
    value: "most_disabled",
    icon: "/icons/disabled_icon.svg",
  },
  MOST_EMPLOYEE: {
    label: "Most Employee Spots",
    value: "most_employee",
    icon: "/icons/employee_icon.svg",
  },
  MOST_LIMITED_TIME: {
    label: "Most 20-Minutes Spots",
    value: "most_limited_time",
    icon: "/icons/limited_time_icon.svg",
  },
  MOST_MOTORCYCLE: {
    label: "Most Motorcycle Spots",
    value: "most_motorcycle",
    icon: "/icons/motorcycle_icon.svg",
  },
  MOST_EV_CHARGING: {
    label: "Most EV Charging Ports",
    value: "most_ev_charging",
    icon: "/icons/ev_charging_icon.svg",
  },
});

export const getSortLabel = (sortType, buildingName = null) => {
  if (sortType === SORT_TYPES.DISTANCE_TO_BUILDING.value && buildingName) {
    return `Distance to ${buildingName}`;
  }

  return (
    SORT_TYPES[
      Object.keys(SORT_TYPES).find((key) => SORT_TYPES[key].value === sortType)
    ]?.label || "Emptiest first"
  );
};

export const getSortedLots = (lots, sortType, building) => {
  switch (sortType) {
    case SORT_TYPES.EMPTIEST_FIRST.value:
      return lots.sort((a, b) => {
        const occupancyPctA = a.point || a.occupancy_pct || 0;
        const occupancyPctB = b.point || b.occupancy_pct || 0;
        return occupancyPctA - occupancyPctB;
      });

    case SORT_TYPES.MOST_DISABLED.value:
      return lots.sort((a, b) => {
        const disabledA = a.spot_categories.disabled || 0;
        const disabledB = b.spot_categories.disabled || 0;
        return disabledB - disabledA;
      });

    case SORT_TYPES.MOST_EMPLOYEE.value:
      return lots.sort((a, b) => {
        const employeeA = a.spot_categories.employee || 0;
        const employeeB = b.spot_categories.employee || 0;
        return employeeB - employeeA;
      });

    case SORT_TYPES.MOST_LIMITED_TIME.value:
      return lots.sort((a, b) => {
        const limitedTimeA = a.spot_categories.limited_time || 0;
        const limitedTimeB = b.spot_categories.limited_time || 0;
        return limitedTimeB - limitedTimeA;
      });

    case SORT_TYPES.MOST_MOTORCYCLE.value:
      return lots.sort((a, b) => {
        const motorcycleA = a.spot_categories.motorcycle || 0;
        const motorcycleB = b.spot_categories.motorcycle || 0;
        return motorcycleB - motorcycleA;
      });

    case SORT_TYPES.MOST_EV_CHARGING.value:
      return lots.sort((a, b) => {
        const evChargingA = a.spot_categories.ev_charging || 0;
        const evChargingB = b.spot_categories.ev_charging || 0;
        return evChargingB - evChargingA;
      });

    default:
      return lots;
  }
};
