import { validateSortType, validateSortBuilding } from "@/lib/constants/sort";

export const setLocalSortType = (sortType, building) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("SORT_TYPE", sortType);

    if (building) {
      localStorage.setItem("SORT_BUILDING", JSON.stringify(building));
    }
  }
};

export const getLocalSortType = () => {
  if (typeof window !== "undefined") {
    const localSortType = localStorage.getItem("SORT_TYPE");
    if (!validateSortType(localSortType)) {
      return null;
    }
    return localSortType;
  }
  return null;
};

export const getLocalSortBuilding = () => {
  if (typeof window !== "undefined") {
    const localSortBuilding = JSON.parse(localStorage.getItem("SORT_BUILDING"));
    if (!validateSortBuilding(localSortBuilding)) {
      return null;
    }

    return localSortBuilding;
  }
  return null;
};
