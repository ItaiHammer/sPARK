const locations = new Map();

export function createLiveOccupancy(locationId) {
  const id = locationId.toLowerCase();
  const readings = new Map();
  let data = null;
  let pending = null;
  let checkedAt = -Infinity;
  let lastError = null;

  const remember = (row) => {
    if (!row?.lot_id || row.location_id?.toLowerCase() !== id || !Number.isFinite(Date.parse(row.scraped_at))) return false;
    const previous = readings.get(row.lot_id);
    if (previous && Date.parse(row.scraped_at) <= Date.parse(previous.scraped_at)) return false;
    readings.set(row.lot_id, { ...previous, ...row });
    return true;
  };

  return {
    getData: () => data,
    update(row) {
      if (!remember(row)) return false;
      lastError = null;
      // Buffer events during initial loading; don't cancel SWR's initial fetch
      // or replace the full garage list with a single garage.
      if (data) data = { ...data, lots: [...readings.values()] };
      return Boolean(data);
    },
    async read(fetchLatest) {
      if (pending) return pending;
      // Cover focus, reconnect and manual revalidation with one shared limit.
      if (Date.now() - checkedAt < 60 * 1000) {
        if (lastError) throw lastError;
        if (data) return data;
      }
      checkedAt = Date.now();
      lastError = null;
      pending = (async () => {
        const latest = await fetchLatest();
        if (!Array.isArray(latest?.lots) || !latest.lots.length) throw new Error("Live parking information is unavailable.");
        for (const row of latest.lots) remember({ ...row, location_id: row.location_id ?? id });
        // A Redis/API response may predate a pushed reading. Keep the newer
        // observation for each garage instead of moving the screen backwards.
        data = { ...latest, lots: [...readings.values()] };
        return data;
      })();
      try {
        return await pending;
      } catch (error) {
        lastError = error;
        throw error;
      } finally {
        pending = null;
      }
    },
  };
}

export function getLiveOccupancy(locationId) {
  const id = locationId.toLowerCase();
  if (!locations.has(id)) locations.set(id, createLiveOccupancy(id));
  return locations.get(id);
}
