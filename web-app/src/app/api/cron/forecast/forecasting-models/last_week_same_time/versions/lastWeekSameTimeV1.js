import { DateTime } from 'luxon';

// Model: use the observed occupancy from the same weekday/time one week ago.

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
    async prepare({ supabase, lot, tz, intervalMin, tomorrowStartTZ }) {
        const prevStart = tomorrowStartTZ.minus({ weeks: 1 }).startOf('day');
        const prevEnd = prevStart.plus({ days: 1 });

        const { data, error } = await supabase
            .from('lot_occupancy')
            .select('scraped_at, occupancy_pct')
            .eq('lot_id', lot.lot_id)
            .gte('scraped_at', prevStart.toUTC().toISO())
            .lt('scraped_at', prevEnd.toUTC().toISO())
            .order('scraped_at', { ascending: true });

        if (error) throw error;

        const half = intervalMin / 2;
        const bySlot = new Map();

        for (const r of data || []) {
            const local = DateTime.fromISO(r.scraped_at, {
                zone: 'utc',
            }).setZone(tz);
            if (minutesToNearestBoundary(local, intervalMin) > half) continue;

            const slot = floorSlotIndex(local, intervalMin);
            const v = Number(r.occupancy_pct);
            if (!Number.isFinite(v)) continue;

            bySlot.set(slot, Math.max(0, Math.min(100, v)));
        }

        return { bySlot };
    },

    async predict({ tsLocal, intervalMin, context }) {
        // return last week's value for the same slot, or 0 when missing
        if (!context?.bySlot) return 0;
        const prevLocal = tsLocal.minus({ weeks: 1 });
        const slot = floorSlotIndex(prevLocal, intervalMin);
        return context.bySlot.get(slot) ?? 0;
    },
};
