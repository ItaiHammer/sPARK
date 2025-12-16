export const SORT_TYPES = Object.freeze({
  EMPTIEST_FIRST: {
    label: "Emptiest First",
    value: "emptiest_first",
    icon: "/icons/emptiest_first_icon.svg",
  },
  DISTANCE_TO_BUILDING: {
    label: "Distance to Selected Building",
    value: "distance_to_building",
    icon: "/icons/sjsu_building.svg",
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
