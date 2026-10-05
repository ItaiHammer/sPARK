import { validateSortType, validateSortBuilding } from "@/lib/constants/sort";

export const setLocalSortType = (sortType, building) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("SORT_TYPE", sortType);
      if (building) localStorage.setItem("SORT_BUILDING", JSON.stringify(building));
    } catch { /* Sorting still works when browser storage is unavailable. */ }
  }
};

export const getLocalSortType = () => {
  if (typeof window !== "undefined") {
    let localSortType;
    try { localSortType = localStorage.getItem("SORT_TYPE"); } catch { return null; }
    if (!validateSortType(localSortType)) {
      return null;
    }
    return localSortType;
  }
  return null;
};

export const getLocalSortBuilding = () => {
  if (typeof window !== "undefined") {
    let localSortBuilding;
    try { localSortBuilding = JSON.parse(localStorage.getItem("SORT_BUILDING")); } catch { return null; }
    if (!validateSortBuilding(localSortBuilding)) {
      return null;
    }

    return localSortBuilding;
  }
  return null;
};
