import { normalizeMetaDate, normalizeMetaSize } from '../utils/format.js';

export const supportedPlatforms = ['win', 'mac', 'linux'];

export const architectureOrder = {
    win: ['x86', 'x64', 'arm64'],
    mac: ['intel', 'arm64'],
    linux: ['amd64']
};

export function getOrderedArchKeys(os, archMap) {
    if (!archMap || typeof archMap !== 'object') return [];

    const keys = Object.keys(archMap);
    const preferred = architectureOrder[os] || [];
    const ordered = preferred.filter(arch => keys.includes(arch));
    const remaining = keys.filter(arch => !preferred.includes(arch)).sort();

    return [...ordered, ...remaining];
}

export function getOrderedArchEntries(os, archMap) {
    return getOrderedArchKeys(os, archMap).map(arch => [arch, archMap[arch]]);
}

export function compareArchNames(os, left, right) {
    const preferred = architectureOrder[os] || [];
    const leftIndex = preferred.indexOf(left);
    const rightIndex = preferred.indexOf(right);
    const normalizedLeft = leftIndex === -1 ? preferred.length + 100 : leftIndex;
    const normalizedRight = rightIndex === -1 ? preferred.length + 100 : rightIndex;

    if (normalizedLeft !== normalizedRight) {
        return normalizedLeft - normalizedRight;
    }

    return left.localeCompare(right);
}

export function normalizeVersionEntry(versionData) {
    const normalized = {
        fullversion: versionData?.fullversion || '',
        links: {},
        meta: {}
    };

    supportedPlatforms.forEach(os => {
        const compactEntries = versionData?.[os];
        const legacyLinks = versionData?.links?.[os];
        const source = compactEntries && typeof compactEntries === 'object'
            ? compactEntries
            : legacyLinks && typeof legacyLinks === 'object'
                ? legacyLinks
                : null;

        if (!source) return;

        getOrderedArchEntries(os, source).forEach(([arch, value]) => {
            let url = null;
            let date = null;
            let size = null;

            if (typeof value === 'string') {
                url = value;
                date = versionData?.meta?.[os]?.[arch]?.date ?? null;
                size = versionData?.meta?.[os]?.[arch]?.size ?? null;
            } else if (value && typeof value === 'object') {
                url = value.url || versionData?.links?.[os]?.[arch] || null;
                date = value.date ?? versionData?.meta?.[os]?.[arch]?.date ?? null;
                size = value.size ?? versionData?.meta?.[os]?.[arch]?.size ?? null;
            }

            if (!url) return;

            if (!normalized.links[os]) normalized.links[os] = {};
            if (!normalized.meta[os]) normalized.meta[os] = {};

            normalized.links[os][arch] = url;
            normalized.meta[os][arch] = {
                date: normalizeMetaDate(date),
                size: normalizeMetaSize(size)
            };
        });
    });

    return normalized;
}

export function normalizeVersionsData(data) {
    return Object.fromEntries(
        Object.entries(data || {}).map(([versionKey, versionData]) => [versionKey, normalizeVersionEntry(versionData)])
    );
}

export function getLinkMeta(versionData, os, arch) {
    const meta = versionData?.meta?.[os]?.[arch] || {};
    return {
        date: normalizeMetaDate(meta.date),
        size: normalizeMetaSize(meta.size)
    };
}

export function buildLinuxVersionsData(data) {
    return Object.entries(data)
        .filter(([, versionData]) => versionData?.links?.linux)
        .map(([versionKey, versionData]) => {
            const architectures = getOrderedArchEntries('linux', versionData.links.linux)
                .filter(([, link]) => !!link)
                .map(([arch, link]) => {
                    const meta = getLinkMeta(versionData, 'linux', arch);
                    return {
                        arch,
                        link,
                        date: meta.date,
                        size: meta.size
                    };
                });

            return {
                version: {
                    short: versionKey,
                    full: versionData.fullversion
                },
                architectures
            };
        })
        .filter(version => version.architectures.length > 0);
}
