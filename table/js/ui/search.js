import { state } from '../state.js';
import { syncUrlWithState } from '../router/routes.js';
import { compareSearchMatch } from '../utils/version.js';
import { updateSortUI } from './sort.js';
import {
    observer,
    setSearchRunner,
    showTemporarilyUnavailableNotice,
    startLazyLoading,
    sentinel
} from './table.js';
import { isOsTemporarilyUnavailable } from '../state.js';

let linuxLoader = null;

export function setLinuxLoader(loader) {
    linuxLoader = loader;
}

export function sortSearchResults(filtered, term) {
    return filtered.sort((a, b) => compareSearchMatch(a, b, term, {
        getShort: item => item[0],
        getFull: item => item[1].fullversion,
        getFallback: item => item[0],
        localeOptions: { numeric: true, sensitivity: 'base' }
    }));
}

export function sortLinuxSearchResults(filtered, term) {
    return filtered.sort((a, b) => compareSearchMatch(a, b, term, {
        getShort: item => item.version.short,
        getFull: item => item.version.full,
        getFallback: item => item.version.short,
        localeOptions: { numeric: true }
    }));
}

export function performSearch(term) {
    const container = document.getElementById('versions-container');
    term = term.trim().toLowerCase();
    container.style.opacity = '0';
    state.currentSearchTerm = term;
    observer.unobserve(sentinel);

    updateSortUI();
    syncUrlWithState();

    setTimeout(() => {
        if (term === '') {
            state.currentSearchResults = null;
            startLazyLoading();
            return;
        }

        container.innerHTML = '';
        state.currentIndex = 0;

        if (isOsTemporarilyUnavailable(state.currentOS)) {
            state.currentSearchResults = null;
            showTemporarilyUnavailableNotice(state.currentOS);
            return;
        }

        if (state.currentOS === 'linux' && !state.linuxDataLoaded) {
            linuxLoader?.();
            return;
        }

        if (state.currentOS === 'linux') {
            state.currentSearchResults = sortLinuxSearchResults(
                state.linuxVersionsData.filter(version =>
                    version.version.short.toLowerCase().includes(term) ||
                    version.version.full.toLowerCase().includes(term)
                ),
                term
            );
        } else {
            const filtered = state.allVersions.filter(([versionKey, data]) => {
                return (versionKey.toLowerCase().includes(term) ||
                    data.fullversion.toLowerCase().includes(term)) &&
                    data.links[state.currentOS] &&
                    (state.currentArch === 'all' || data.links[state.currentOS].hasOwnProperty(state.currentArch));
            });

            const unique = new Map();
            filtered.forEach(([versionKey, data]) => {
                if (!unique.has(versionKey)) {
                    unique.set(versionKey, data);
                }
            });

            state.currentSearchResults = sortSearchResults(Array.from(unique.entries()), term);
        }

        startLazyLoading();
    }, 300);
}

export function toggleSearch() {
    const versionSearch = document.getElementById('versionSearch');
    const searchContainer = document.getElementById('searchContainer');

    if (searchContainer.classList.contains('expanded')) {
        if (versionSearch.value.trim() === '') {
            searchContainer.classList.remove('expanded');
        }
    } else {
        searchContainer.classList.add('expanded');
        setTimeout(() => versionSearch.focus(), 300);
    }
}

export function initSearchControls() {
    const versionSearch = document.getElementById('versionSearch');
    const searchContainer = document.getElementById('searchContainer');
    const clearSearchBtn = document.querySelector('.clear-search');
    const searchIcon = document.getElementById('searchIcon');

    setSearchRunner(performSearch);

    versionSearch.addEventListener('input', e => {
        const term = e.target.value.trim().toLowerCase();
        if (e.target.value.trim() !== '') {
            searchContainer.classList.add('show-clear');
        } else {
            searchContainer.classList.remove('show-clear');
        }
        performSearch(term);
    });

    clearSearchBtn.addEventListener('click', () => {
        if (searchContainer.classList.contains('show-clear')) {
            versionSearch.value = '';
            searchContainer.classList.remove('show-clear');
            performSearch('');
            versionSearch.focus();
        }
    });

    searchIcon.addEventListener('click', e => {
        if (searchContainer.classList.contains('expanded')) {
            if (versionSearch.value.trim() === '') {
                searchContainer.classList.remove('expanded');
            }
        } else {
            toggleSearch();
        }
        e.stopPropagation();
    });

    searchContainer.addEventListener('click', e => {
        if (!searchContainer.classList.contains('expanded')) {
            toggleSearch();
        }
        e.stopPropagation();
    });

    document.addEventListener('click', e => {
        if (!searchContainer.contains(e.target) && versionSearch.value.trim() === '') {
            searchContainer.classList.remove('expanded');
        }
    });
}
