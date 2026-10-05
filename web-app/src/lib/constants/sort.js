export const SORT_TYPES = Object.freeze({
  MOST_SPACES: { label: "Most spaces", value: "most_spaces", icon: "/icons/emptiest_first_icon.svg" },
  EMPTIEST_FIRST: {
    label: "Least full",
    value: "emptiest_first",
    icon: "/icons/emptiest_first_icon.svg",
  },
  GARAGE_NAME: { label: "Garage name", value: "garage_name", icon: "/icons/building_icon.svg" },
  DISTANCE_TO_BUILDING: {
    label: "Walking distance",
    value: "distance_to_building",
    icon: "/icons/building_icon.svg",
  },
  MOST_DISABLED: {
    label: "Most Disabled",
    value: "most_disabled",
    icon: "/icons/disabled_icon.svg",
    category: { key: "disabled", label: "disabled spots", singular: "disabled spot" },
  },
  MOST_EMPLOYEE: {
    label: "Most Employee",
    value: "most_employee",
    icon: "/icons/employee_icon.svg",
    category: { key: "employee", label: "employee spots", singular: "employee spot" },
  },
  MOST_LIMITED_TIME: {
    label: "Most 20-Min",
    value: "most_limited_time",
    icon: "/icons/limited_time_icon.svg",
    category: { key: "limited_time", label: "20-minute spots", singular: "20-minute spot" },
  },
  MOST_MOTORCYCLE: {
    label: "Most Motorcycle",
    value: "most_motorcycle",
    icon: "/icons/motorcycle_icon.svg",
    category: { key: "motorcycle", label: "motorcycle spots", singular: "motorcycle spot" },
  },
  MOST_EV_CHARGING: {
    label: "Most EV",
    value: "most_ev_charging",
    icon: "/icons/ev_charging_icon.svg",
    category: { key: "ev_charging", label: "EV charging ports", singular: "EV charging port" },
  },
});

export const getSpotCategorySort = (sortType) =>
  Object.values(SORT_TYPES).find((type) => type.value === sortType && type.category) || null;

// Metadata may use keyed counts or category records. An absent/invalid count
// stays unknown; only an explicitly reported zero means there are no spots.
export const getSpotCategoryCount = (lot, categoryKey) => {
  const categories = lot?.spot_categories;
  const value = Array.isArray(categories)
    ? categories.find((category) => category?.spot_category_id === categoryKey)?.spot_count
    : categories?.[categoryKey];
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
};

export const getSortLabel = (sortType, buildingName = null) => {
  if (sortType === SORT_TYPES.DISTANCE_TO_BUILDING.value && buildingName) {
    return `Walk to ${buildingName}`;
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
  const categorySort = getSpotCategorySort(sortType);
  if (categorySort) {
    return copy.sort((a, b) => {
      const countA = getSpotCategoryCount(a, categorySort.category.key);
      const countB = getSpotCategoryCount(b, categorySort.category.key);
      if (countA === null && countB !== null) return 1;
      if (countB === null && countA !== null) return -1;
      return (countB ?? 0) - (countA ?? 0) || nameOrder(a, b);
    });
  }
  switch (sortType) {
    case SORT_TYPES.MOST_SPACES.value:
      return copy.sort((a, b) => Number(a.closed) - Number(b.closed) || spaces(b) - spaces(a) || nameOrder(a, b));
    case SORT_TYPES.GARAGE_NAME.value:
      return copy.sort(nameOrder);
    case SORT_TYPES.EMPTIEST_FIRST.value:
      return copy.sort((a, b) => Number(a.closed) - Number(b.closed) || (occupancy(a) ?? Infinity) - (occupancy(b) ?? Infinity) || nameOrder(a, b));

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
