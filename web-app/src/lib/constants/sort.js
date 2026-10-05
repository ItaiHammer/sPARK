export const SORT_TYPES = Object.freeze({
  MOST_SPACES: { label: "Most spaces", value: "most_spaces", icon: "/icons/emptiest_first_icon.svg" },
  EMPTIEST_FIRST: {
    label: "Least full",
    value: "emptiest_first",
    icon: "/icons/emptiest_first_icon.svg",
  },
  GARAGE_NAME: { label: "Garage name", value: "garage_name", icon: "/icons/building_icon.svg" },
  DISTANCE_TO_BUILDING: {
    label: "Distance to building",
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
    ]?.label || "Most spaces"
  );
};

export const getSortIcon = (sortType) => {
  return (
    SORT_TYPES[
      Object.keys(SORT_TYPES).find((key) => SORT_TYPES[key].value === sortType)
    ]?.icon || "/icons/emptiest_first_icon.svg"
  );
};

export const getSortedLots = (lots, sortType) => {
  const occupancy = (lot) => lot.occupied ?? lot.point ?? lot.occupancy_pct;
  const spaces = (lot) => lot.spaces ?? (Number.isFinite(occupancy(lot)) ? (1 - occupancy(lot) / 100) * (lot.spot_count || 0) : -1);
  const copy = [...lots];
  const nameOrder = (a, b) => (a.name || "").localeCompare(b.name || "");
  switch (sortType) {
    case SORT_TYPES.MOST_SPACES.value:
      return copy.sort((a, b) => Number(a.closed) - Number(b.closed) || spaces(b) - spaces(a) || nameOrder(a, b));
    case SORT_TYPES.GARAGE_NAME.value:
      return copy.sort(nameOrder);
    case SORT_TYPES.EMPTIEST_FIRST.value:
      return copy.sort((a, b) => Number(a.closed) - Number(b.closed) || (occupancy(a) ?? Infinity) - (occupancy(b) ?? Infinity) || nameOrder(a, b));

    case SORT_TYPES.MOST_DISABLED.value:
      return copy.sort((a, b) => {
        const disabledA = a.spot_categories?.disabled || 0;
        const disabledB = b.spot_categories?.disabled || 0;
        return disabledB - disabledA;
      });

    case SORT_TYPES.MOST_EMPLOYEE.value:
      return copy.sort((a, b) => {
        const employeeA = a.spot_categories?.employee || 0;
        const employeeB = b.spot_categories?.employee || 0;
        return employeeB - employeeA;
      });

    case SORT_TYPES.MOST_LIMITED_TIME.value:
      return copy.sort((a, b) => {
        const limitedTimeA = a.spot_categories?.limited_time || 0;
        const limitedTimeB = b.spot_categories?.limited_time || 0;
        return limitedTimeB - limitedTimeA;
      });

    case SORT_TYPES.MOST_MOTORCYCLE.value:
      return copy.sort((a, b) => {
        const motorcycleA = a.spot_categories?.motorcycle || 0;
        const motorcycleB = b.spot_categories?.motorcycle || 0;
        return motorcycleB - motorcycleA;
      });

    case SORT_TYPES.MOST_EV_CHARGING.value:
      return copy.sort((a, b) => {
        const evChargingA = a.spot_categories?.ev_charging || 0;
        const evChargingB = b.spot_categories?.ev_charging || 0;
        return evChargingB - evChargingA;
      });

    case SORT_TYPES.DISTANCE_TO_BUILDING.value:
      return copy.sort((a, b) => (a.travel?.meters ?? a.travel?.distance ?? Infinity) - (b.travel?.meters ?? b.travel?.distance ?? Infinity) || nameOrder(a, b));

    default:
      return copy;
  }
};

export const validateSortType = (sortType) => {
  return Object.values(SORT_TYPES).some((type) => type.value === sortType);
};

export const validateSortBuilding = (building) => {
  return building && building.buildingID && building.buildingName;
};
