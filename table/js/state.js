const urlParams = new URLSearchParams(window.location.search);

export const osVersionFilters = {
    win: [
        { version: '1.2.5.1006', label: '7-8.1', full: 'Windows 7-8.1' }
    ],
    mac: [
        { version: '1.2.66.447', label: '11.x', full: 'macOS 11' },
        { version: '1.2.37.701', label: '10.15', full: 'macOS 10.15' },
        { version: '1.2.20.1218', label: '10.14/10.13', full: 'macOS 10.14 / 10.13' }
    ],
    linux: []
};

export const temporarilyUnavailableOs = new Set();

export const ITEMS_PER_BATCH = 5;

export const state = {
    currentArch: urlParams.get('arch') || 'all',
    currentOS: urlParams.get('os') || 'win',
    currentSearchTerm: urlParams.get('search') || '',
    currentWinVersionFilter: urlParams.get('winVersion') || null,
    currentMacVersionFilter: urlParams.get('macVersion') || null,
    currentLinuxVersionFilter: urlParams.get('linuxVersion') || null,
    sortVersionAscending: urlParams.get('sortVersion') === 'asc' || (urlParams.get('sortVersion') === null && urlParams.get('sort') === 'asc'),
    sortSizeAscending: urlParams.get('sortSize') === 'asc',
    currentSortColumn: urlParams.get('sortSize') !== null ? 'size' : 'version',
    allVersions: [],
    linuxVersionsData: [],
    linuxDataLoaded: false,
    currentIndex: 0,
    currentSearchResults: null,
    versionsAppInitialized: false,
    versionsAppInitPromise: null,
    sizesPreloaded: false
};

if (state.currentSearchTerm) {
    state.sortVersionAscending = false;
    state.sortSizeAscending = false;
    state.currentSortColumn = 'version';
}

if (urlParams.get('sort') && !urlParams.get('sortVersion') && !urlParams.get('sortSize')) {
    state.sortVersionAscending = urlParams.get('sort') === 'asc';
}

export function isOsTemporarilyUnavailable(os) {
    return temporarilyUnavailableOs.has(os);
}

export function getCurrentVersionFilter(os = state.currentOS) {
    if (os === 'win') return state.currentWinVersionFilter;
    if (os === 'mac') return state.currentMacVersionFilter;
    if (os === 'linux') return state.currentLinuxVersionFilter;
    return null;
}

export function setCurrentVersionFilter(os, value) {
    if (os === 'win') {
        state.currentWinVersionFilter = value;
    } else if (os === 'mac') {
        state.currentMacVersionFilter = value;
    } else if (os === 'linux') {
        state.currentLinuxVersionFilter = value;
    }
}

export function resetSizePreload() {
    state.sizesPreloaded = false;
}
