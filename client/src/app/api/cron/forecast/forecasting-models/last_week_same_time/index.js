import lastWeekSameTimeV1 from './versions/lastWeekSameTimeV1.js';

const versionMap = { v1: lastWeekSameTimeV1 };

export function getModelVersion(version = 'v1') {
    const m = versionMap[version];
    if (!m) throw new Error(`Unknown version: ${version}`);
    return m;
}
