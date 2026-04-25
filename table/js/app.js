import { state } from './state.js';
import { buildLinuxVersionsData, normalizeVersionsData } from './data/normalize.js';
import { flushPendingLinkMetaUpdates, primeMetadataCache } from './data/meta.js';
import { loadAllData } from './data/api.js';
import { getCurrentPageKey } from './router/routes.js';
import { updateArchFilters } from './ui/filters.js';
import { performSearch, setLinuxLoader } from './ui/search.js';
import { startLazyLoading } from './ui/table.js';
import { getSortMultiplier } from './ui/sort.js';

export async function loadLinuxPackages() {
    const container = document.getElementById('versions-container');

    try {
        state.linuxVersionsData = buildLinuxVersionsData(Object.fromEntries(state.allVersions));
        state.linuxVersionsData.sort((a, b) => {
            return getSortMultiplier() * a.version.short.localeCompare(b.version.short, undefined, { numeric: true });
        });

        state.linuxDataLoaded = true;

        if (state.currentSearchTerm !== '') {
            performSearch(state.currentSearchTerm);
        } else {
            startLazyLoading();
        }
    } catch (error) {
        console.error('Ошибка загрузки Linux пакетов:', error);
        container.innerHTML = '<tr><td colspan="5">Ошибка загрузки списка пакетов</td></tr>';
        container.style.opacity = '1';
    }
}

export async function loadVersionsApp() {
    const container = document.getElementById('versions-container');
    const versionSearch = document.getElementById('versionSearch');
    const searchContainer = document.getElementById('searchContainer');

    try {
        const response = await fetch('versions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rawData = await response.json();
        const data = normalizeVersionsData(rawData);

        container.innerHTML = '';
        primeMetadataCache(data);
        state.allVersions = Object.entries(data);
        state.linuxVersionsData = buildLinuxVersionsData(data);
        state.linuxDataLoaded = true;

        loadAllData().catch(err => console.error('Data fetch error:', err));
        flushPendingLinkMetaUpdates();

        if (state.currentSearchTerm) {
            versionSearch.value = state.currentSearchTerm;
            searchContainer.classList.add('show-clear');
            searchContainer.classList.add('expanded');

            if (state.currentOS !== 'linux') {
                updateArchFilters();
            }

            performSearch(state.currentSearchTerm);
        } else {
            startLazyLoading();
            if (state.currentOS !== 'linux') {
                updateArchFilters();
            }
        }

        state.versionsAppInitialized = true;
    } catch (err) {
        state.versionsAppInitialized = false;
        console.error('Error loading version data:', err);
        container.innerHTML = '<tr><td colspan="5">Failed to load version data.</td></tr>';
        throw err;
    }
}

export function ensureVersionsAppInitialized() {
    if (state.versionsAppInitialized) {
        return Promise.resolve();
    }

    if (!state.versionsAppInitPromise) {
        state.versionsAppInitPromise = loadVersionsApp()
            .catch(err => {
                state.versionsAppInitPromise = null;
                throw err;
            });
    }

    return state.versionsAppInitPromise;
}

export async function initializeApp() {
    if (getCurrentPageKey() !== 'versions') {
        return;
    }

    return ensureVersionsAppInitialized();
}

export function initAppCallbacks() {
    setLinuxLoader(loadLinuxPackages);
}
