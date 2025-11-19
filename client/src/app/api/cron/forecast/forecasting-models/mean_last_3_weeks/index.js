import meanLast3WeeksV1 from './versions/meanLast3WeeksV1.js';

const versionMap = { v1: meanLast3WeeksV1 };

export function getModelVersion(version = 'v1') {
    const m = versionMap[version];
    if (!m) throw new Error(`Unknown version: ${version}`);
    return m;
}
