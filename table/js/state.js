export const osVersionFilters = {
    win: [
        { version: '1.2.5.1006', label: '7-8.1', full: 'Windows 7-8.1' }
    ],
    mac: [
        { version: '1.2.98.301', label: '12.x', full: 'macOS 12', name: 'Monterey' },
        { version: '1.2.66.447', label: '11.x', full: 'macOS 11', name: 'Big Sur' },
        { version: '1.2.37.701', label: '10.15', full: 'macOS 10.15', name: 'Catalina' },
        { version: '1.2.20.1218', label: '10.14/10.13', full: 'macOS 10.14 / 10.13', name: 'Mojave / High Sierra' }
    ],
    linux: []
};

export const temporarilyUnavailableOs = new Set();

export const ITEMS_PER_BATCH = 5;

export function readVersionsUrlState(search) {
    const params = new URLSearchParams(search);
    const term = params.get('search') || '';
    const legacySort = !params.has('sortVersion') && !params.has('sortSize') && params.get('sort') === 'asc';
    return {
        currentArch: params.get('arch') || 'all',
        currentOS: params.get('os') || 'win',
        currentSearchTerm: term,
        currentWinVersionFilter: normalizeVersionFilter(params.get('winVersion')),
        currentMacVersionFilter: normalizeVersionFilter(params.get('macVersion')),
        currentLinuxVersionFilter: normalizeVersionFilter(params.get('linuxVersion')),
        sortVersionAscending: legacySort || (!term && (params.get('sortVersion') ?? params.get('sort')) === 'asc'),
        sortSizeAscending: !term && params.get('sortSize') === 'asc',
        currentSortColumn: !term && params.has('sortSize') ? 'size' : 'version'
    };
}

export const state = {
    ...readVersionsUrlState(window.location.search),
    allVersions: [],
    linuxVersionsData: [],
    linuxDataLoaded: false,
    currentSearchResults: null,
    versionsAppInitialized: false,
    versionsAppInitPromise: null
};

export function isOsTemporarilyUnavailable(os) {
    return temporarilyUnavailableOs.has(os);
}

function normalizeVersionFilter(value) {
    return typeof value === 'string' && /^\d+\.\d+\.\d+(?:\.\d+)?$/.test(value) ? value : null;
}

export function getCurrentVersionFilter(os = state.currentOS) {
    if (os === 'win') return state.currentWinVersionFilter;
    if (os === 'mac') return state.currentMacVersionFilter;
    if (os === 'linux') return state.currentLinuxVersionFilter;
    return null;
}

export function setCurrentVersionFilter(os, value) {
    value = normalizeVersionFilter(value);
    if (os === 'win') {
        state.currentWinVersionFilter = value;
    } else if (os === 'mac') {
        state.currentMacVersionFilter = value;
    } else if (os === 'linux') {
        state.currentLinuxVersionFilter = value;
    }
}
