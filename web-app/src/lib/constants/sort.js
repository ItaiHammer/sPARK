export const SORT_TYPES = Object.freeze({
  EMPTIEST_FIRST: {
    label: "Emptiest first",
    value: "emptiest_first",
    icon: "/icons/emptiest_first_icon.svg",
  },
  DISTANCE_TO_BUILDING: {
    label: "Distance to select building",
    value: "distance_to_building",
    icon: "/icons/sjsu_building.svg",
  },
  MOST_DISABLED: {
    label: "Most disabled spots",
    value: "most_disabled",
    icon: "/icons/disabled_icon.svg",
  },
  MOST_EMPLOYEE: {
    label: "Most employee spots",
    value: "most_employee",
    icon: "/icons/employee_icon.svg",
  },
  MOST_LIMITED_TIME: {
    label: "Most 20-minutes spots",
    value: "most_limited_time",
    icon: "/icons/limited_time_icon.svg",
  },
  MOST_MOTORCYCLE: {
    label: "Most motorcycle spots",
    value: "most_motorcycle",
    icon: "/icons/motorcycle_icon.svg",
  },
  MOST_EV_CHARGING: {
    label: "Most EV charging ports",
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
