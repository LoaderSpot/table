import { getCurrentVersionFilter, state } from '../state.js';
import { compareArchNames, getLinkMeta, getOrderedArchEntries } from '../data/normalize.js';
import { compareVersions } from '../utils/version.js';
import { sizeCompare, versionCompare } from './sort.js';

export function prepareTableItems() {
    const os = state.currentOS;
    const limit = getCurrentVersionFilter(os);
    const accepts = version => !limit || compareVersions(version, limit) <= 0;
    let builds;
    if (os === 'linux') {
        builds = (state.currentSearchResults ?? state.linuxVersionsData).filter(build => accepts(build.version.short));
    } else {
        builds = [];
        for (const [short, data] of state.currentSearchResults ?? state.allVersions) {
            if (!data.links[os] || !accepts(short)) continue;
            const architectures = getOrderedArchEntries(os, data.links[os])
                .filter(([arch]) => state.currentArch === 'all' || arch === state.currentArch)
                .map(([arch, link]) => ({ arch, link, ...getLinkMeta(data, os, arch) }));
            if (architectures.length) builds.push({ version: { short, full: data.fullversion }, architectures });
        }
    }

    if (state.currentSortColumn === 'size' && state.currentSearchResults === null) {
        const items = builds.flatMap(({ version, architectures }) => architectures.map(file => ({ version, file })));
        items.sort((a, b) => sizeCompare(a.file.size, b.file.size)
            || versionCompare(a.version.short, b.version.short)
            || compareArchNames(os, a.file.arch, b.file.arch));
        return { items, bySize: true };
    }

    const families = new Map();
    for (const build of builds) {
        const key = build.version.short.split('.').slice(0, 3).join('.');
        if (!families.has(key)) families.set(key, []);
        families.get(key).push(build);
    }
    const items = [...families.entries()];
    if (state.currentSearchResults === null) items.sort(([a], [b]) => versionCompare(a, b));
    for (const [, versions] of items) versions.sort((a, b) => versionCompare(a.version.short, b.version.short));
    return { items, bySize: false };
}
