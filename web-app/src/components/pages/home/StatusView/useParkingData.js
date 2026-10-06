"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useLocationAPI } from "@/contexts/API/LocationAPI.context";
import { DEFAULT_SWR_OPTIONS, getInternalAuthHeader } from "@/lib/constants/api.constants";
import { LIVE_OCCUPANCY_KEY, BUILDINGS_KEY, BUILDING_DISTANCES_KEY } from "@/lib/constants/SWR.keys";
import { forecastDayDates, forecastOccupancyLots, indexForecastRows, latestObservation, normalizeParkingLots, selectionDateTime, travelForLot } from "@/lib/utils/client/parking";

function apiData(response) {
  if (response?.error || response?.data === null || response?.data === undefined) {
    const message = response?.error?.message || response?.error;
    throw new Error(typeof message === "string" ? message : "Parking information is unavailable. Please try again.");
  }
  return response.data;
}

async function fetchForecastDay(locationId, date) {
  // This existing POST endpoint only reads stored forecasts; no backend changes.
  const response = await fetch(`/api/locations/${encodeURIComponent(locationId)}/lots/forecast`, {
    ...getInternalAuthHeader("POST"),
    body: JSON.stringify({ date: `${date}T00:00:00.000Z` }),
  });
  if (!response.ok) throw new Error("Upcoming estimates are unavailable.");
  return apiData(await response.json());
}

const cachedOptions = { ...DEFAULT_SWR_OPTIONS, dedupingInterval: 5 * 60 * 1000, errorRetryCount: 1 };
const forecastOptions = {
  ...cachedOptions,
  // Keep cached curves visible while refreshing; never wait on a clock change.
  refreshInterval: 15 * 60 * 1000,
  revalidateOnReconnect: true,
};

export default function useParkingData({ locationId, selection, buildingId = null, pausedSnapshot = null, loadBuildings = true }) {
  const { getLocationInfo, getLocationLots, getLatestOccupancy, getLocationBuildings, getBuildingDistances } = useLocationAPI();
  const selectedAt = selectionDateTime(selection);

  const locationRequest = useSWR(locationId ? ["parking-location", locationId] : null,
    ([, id]) => getLocationInfo(id).then(apiData), cachedOptions);
  const metadataRequest = useSWR(locationId ? ["parking-lots", locationId] : null,
    ([, id]) => getLocationLots(id).then(apiData), cachedOptions);
  const buildingsRequest = useSWR(locationId && loadBuildings ? [BUILDINGS_KEY, locationId] : null,
    ([, id]) => getLocationBuildings(id).then(apiData), cachedOptions);
  const buildingRequest = useSWR(locationId && buildingId ? [BUILDING_DISTANCES_KEY, locationId, buildingId] : null,
    ([, id, destination]) => getBuildingDistances(id, destination).then(apiData), cachedOptions);

  const frozenLots = Array.isArray(pausedSnapshot) ? pausedSnapshot : pausedSnapshot?.lots;
  const frozen = selection?.mode === "paused" && Array.isArray(frozenLots);
  const live = selection?.mode === "live";
  const occupancyRequest = useSWR(locationId && live ? [LIVE_OCCUPANCY_KEY, locationId] : null,
    ([, id]) => getLatestOccupancy(id).then(apiData), {
    ...DEFAULT_SWR_OPTIONS,
    dedupingInterval: 5000,
    errorRetryCount: 1,
    refreshInterval: live ? 60000 : 0,
    revalidateOnReconnect: live,
  });

  // Warm the complete local day even in live mode. UTC-date keys share cached
  // payloads between neighboring dates; a cached day updates synchronously.
  const dayDates = forecastDayDates(selectedAt);
  const dayKey = (index) => !frozen && locationId && dayDates[index]
    ? ["parking-day-forecast", locationId, dayDates[index]] : null;
  const dayFetcher = ([, id, date]) => fetchForecastDay(id, date);
  const firstDayRequest = useSWR(dayKey(0), dayFetcher, forecastOptions);
  const secondDayRequest = useSWR(dayKey(1), dayFetcher, forecastOptions);
  const thirdDayRequest = useSWR(dayKey(2), dayFetcher, forecastOptions);
  const forecastByLot = useMemo(() => indexForecastRows([firstDayRequest.data, secondDayRequest.data, thirdDayRequest.data]),
    [firstDayRequest.data, secondDayRequest.data, thirdDayRequest.data]);
  const lots = useMemo(() => {
    if (frozen) return frozenLots.map((lot) => {
      const id = lot.lot_id || lot.id;
      const metadata = metadataRequest.data?.find((item) => item.lot_id === id);
      // Routing metadata can refresh without changing paused counts or alerts.
      return {
        ...lot,
        address: metadata?.address ?? lot.address,
        latitude: metadata?.latitude ?? lot.latitude,
        longitude: metadata?.longitude ?? lot.longitude,
        travel: travelForLot(id, buildingRequest.data),
      };
    });
    return normalizeParkingLots({
      metadataLots: metadataRequest.data || [],
      occupancyLots: live ? occupancyRequest.data?.lots || []
        : forecastOccupancyLots(metadataRequest.data || [], forecastByLot, selectedAt),
      selection,
      forecastByLot,
      buildingData: buildingRequest.data,
    });
  }, [frozen, frozenLots, live, metadataRequest.data, occupancyRequest.data, selection, selectedAt, forecastByLot, buildingRequest.data]);
  const dayRequests = [firstDayRequest, secondDayRequest, thirdDayRequest].slice(0, dayDates.length);
  const selectedDates = new Set([selectedAt?.toUTC().toISODate()]);
  if (selectedAt && selectedAt.minute % 30 !== 0) {
    selectedDates.add(selectedAt.plus({ minutes: 30 - selectedAt.minute % 30 }).toUTC().toISODate());
  }
  // Optional lookahead must not hide a valid selected-time estimate.
  const selectedRequests = dayRequests.filter((_, index) => selectedDates.has(dayDates[index]));
  const isForecastLoading = !frozen && dayRequests.some((request) => request.isLoading);
  const forecastError = dayRequests.find((request) => request.error)?.error || null;
  const unavailableForecast = selectedRequests.find((request) => request.error && !request.data)?.error;
  const error = locationRequest.error || metadataRequest.error || (live ? occupancyRequest.error : !frozen && unavailableForecast);

  return {
    lots,
    metadataLots: metadataRequest.data || [],
    isMetadataLoading: metadataRequest.isLoading,
    metadataError: metadataRequest.error || null,
    forecastByLot,
    location: locationRequest.data || null,
    buildings: buildingsRequest.data || [],
    isBuildingsLoading: buildingsRequest.isLoading,
    building: buildingRequest.data?.building || null,
    isLoading: locationRequest.isLoading || metadataRequest.isLoading || (live ? occupancyRequest.isLoading : !frozen && selectedRequests.some((request) => request.isLoading)),
    error,
    isForecastLoading,
    isForecastSettled: frozen || dayRequests.every((request) => request.data !== undefined || Boolean(request.error)),
    forecastError,
    isBuildingLoading: buildingRequest.isLoading,
    buildingError: buildingRequest.error || buildingsRequest.error || null,
    refreshedAt: frozen ? pausedSnapshot?.refreshedAt || latestObservation(frozenLots) : latestObservation(occupancyRequest.data?.lots),
    retry: () => Promise.all([locationRequest.mutate(), metadataRequest.mutate(), occupancyRequest.mutate(), firstDayRequest.mutate(), secondDayRequest.mutate(), thirdDayRequest.mutate(), buildingRequest.mutate(), buildingsRequest.mutate()]),
  };
}
