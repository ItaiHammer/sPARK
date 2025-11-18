import { DateTime } from 'luxon';

export function tomorrowRangeTZ(timeZone) {
    const nowTz = DateTime.utc().setZone(timeZone);
    const start = nowTz.plus({ days: 1 }).startOf('day');
    const end = start.plus({ days: 1 });
    return { startTZ: start, endTZ: end };
}

// Parse Postgres timetz (ex 07:00:00-07) to minutes-from-midnight in tz
export function timetzToMinutes(timetz, tz) {
    if (!timetz) return null;
    const dt = DateTime.fromISO(`1970-01-01T${timetz}`, {
        setZone: true,
    }).setZone(tz);
    return dt.hour * 60 + dt.minute;
}

// Is the lot open at the given local DateTime?
export function isWithinOpenWindow(tLocal, lot, tz) {
    if (lot['24_hour'] === true || !lot.open_time || !lot.close_time)
        return true;

    const openMin = timetzToMinutes(lot.open_time, tz);
    const closeMin = timetzToMinutes(lot.close_time, tz);
    if (openMin == null || closeMin == null) return true;

    const m = tLocal.hour * 60 + tLocal.minute;

    // regular window
    if (closeMin > openMin) return m >= openMin && m < closeMin;

    // overnight window (wraps midnight)
    if (closeMin < openMin) return m >= openMin || m < closeMin;

    // open == close -> closed
    return false;
}
