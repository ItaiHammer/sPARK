import { DateTime } from 'luxon';

function floorSlotIndex(dt, intervalMin) {
    return Math.floor((dt.hour * 60 + dt.minute) / intervalMin);
}

const meanLast3Weeks = {
    // Readings come from the same issue-time snapshot Flint uses.
    prepare({ readings, tz, intervalMin, tomorrowStartTZ }) {
        const start = tomorrowStartTZ.minus({ weeks: 3 });
        const sums = new Map();
        const counts = new Map();
        for (const reading of readings) {
            const local = DateTime.fromISO(reading.scraped_at, { zone: tz });
            if (local < start || local >= tomorrowStartTZ || local.weekday !== tomorrowStartTZ.weekday) continue;
            if (reading.occupancy_pct == null) continue;
            const value = Number(reading.occupancy_pct);
            if (!Number.isFinite(value)) continue;
            const slot = floorSlotIndex(local, intervalMin);
            sums.set(slot, (sums.get(slot) || 0) + value);
            counts.set(slot, (counts.get(slot) || 0) + 1);
        }

        const bySlotMean = new Map();
        for (const [slot, sum] of sums) {
            bySlotMean.set(slot, Math.max(0, Math.min(100, sum / counts.get(slot))));
        }
        return { bySlotMean };
    },

    predict({ tsLocal, intervalMin, context }) {
        return context.bySlotMean.get(floorSlotIndex(tsLocal, intervalMin));
    },
};

export default meanLast3Weeks;
