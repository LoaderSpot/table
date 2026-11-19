import { state } from './state.js';
import { buildLinuxVersionsData, normalizeVersionsData } from './data/normalize.js';
import { loadAllData } from './data/api.js';
import { restoreVersionsUrlState } from './router/routes.js';
import { syncPlatformControls, updateArchFilters } from './ui/filters.js';
import { performSearch, reRenderVersions, setLinuxLoader } from './ui/search.js';
import { startLazyLoading } from './ui/table.js';
import { getSortMultiplier, updateSortUI } from './ui/sort.js';

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

    try {
        const response = await fetch('/versions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rawData = await response.json();
        const data = normalizeVersionsData(rawData);

        state.allVersions = Object.entries(data);
        state.linuxVersionsData = buildLinuxVersionsData(data);
        state.linuxDataLoaded = true;

        loadAllData().catch(err => console.error('Data fetch error:', err));
        updateArchFilters();
        if (state.currentSearchTerm) syncSearchInput();
        reRenderVersions();
        state.versionsAppInitialized = true;
    } catch (err) {
        state.versionsAppInitialized = false;
        console.error('Error loading version data:', err);
        container.innerHTML = '<tr><td colspan="5">Failed to load version data.</td></tr>';
        throw err;
    }
}

function syncSearchInput() {
    const searchContainer = document.getElementById('searchContainer');
    document.getElementById('versionSearch').value = state.currentSearchTerm;
    searchContainer.classList.toggle('show-clear', Boolean(state.currentSearchTerm));
    searchContainer.classList.toggle('expanded', Boolean(state.currentSearchTerm));
}

export function ensureVersionsAppInitialized() {
    if (restoreVersionsUrlState()) {
        syncPlatformControls();
        syncSearchInput();
        updateSortUI();
        if (state.versionsAppInitialized) reRenderVersions();
    }
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

export function initAppCallbacks() {
    setLinuxLoader(loadLinuxPackages);
}
