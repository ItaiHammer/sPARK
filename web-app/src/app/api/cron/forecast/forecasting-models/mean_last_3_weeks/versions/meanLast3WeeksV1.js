import { DateTime } from 'luxon';

// Model: use the mean of the observed occupancy from the last 3 weeks on that same weekday.
function floorSlotIndex(dt, intervalMin) {
    const m = dt.hour * 60 + dt.minute;
    return Math.max(0, Math.floor(m / intervalMin));
}
function minutesToNearestBoundary(dt, intervalMin) {
    const m = dt.hour * 60 + dt.minute;
    const r = m % intervalMin;
    return Math.min(r, intervalMin - r);
}
export default {
    // Build per-slot means from the last 3 weeks for the same weekday.
    // Returns a map {slotIndex -> meanPct} in context.bySlotMean.
    async prepare({ supabase, lot, tz, intervalMin, tomorrowStartTZ }) {
        const targetWeekday = tomorrowStartTZ.weekday; // 1..7
        const rangeStart = tomorrowStartTZ.minus({ weeks: 3 }).startOf('day');
        const rangeEnd = tomorrowStartTZ.endOf('day');

        const { data, error } = await supabase
            .from('lot_occupancy')
            .select('scraped_at, occupancy_pct')
            .eq('lot_id', lot.lot_id)
            .gte('scraped_at', rangeStart.toUTC().toISO())
            .lt('scraped_at', rangeEnd.toUTC().toISO())
            .order('scraped_at', { ascending: true });

        if (error) throw error;

        const half = intervalMin / 2;
        const sums = new Map();
        const counts = new Map();

        for (const r of data || []) {
            const local = DateTime.fromISO(r.scraped_at, {
                zone: 'utc',
            }).setZone(tz);
            if (local.weekday !== targetWeekday) continue;

            // only keep samples near slot boundaries to reduce noise
            if (minutesToNearestBoundary(local, intervalMin) > half) continue;

            const slot = floorSlotIndex(local, intervalMin);
            const v = Number(r.occupancy_pct);
            if (!Number.isFinite(v)) continue;

            sums.set(slot, (sums.get(slot) || 0) + v);
            counts.set(slot, (counts.get(slot) || 0) + 1);
        }

        const bySlotMean = new Map();
        for (const [slot, sum] of sums.entries()) {
            const mean = sum / (counts.get(slot) || 1);
            bySlotMean.set(slot, Math.max(0, Math.min(100, mean)));
        }

        return { bySlotMean };
    },

    // Return the mean for the slot, or undefined when missing so caller may skip.
    async predict({ tsLocal, intervalMin, context }) {
        const m = context?.bySlotMean;
        if (!m) return undefined;
        const slot = floorSlotIndex(tsLocal, intervalMin);
        return m.has(slot) ? m.get(slot) : undefined;
    },
};
