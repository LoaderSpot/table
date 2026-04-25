import { state } from '../state.js';

export const ROUTE_PATHS = {
    versions: '/versions',
    faq: '/faq',
    links: '/links'
};

const VERSIONS_ROUTE_STATE_KEY = 'loadspot:last-versions-search';
let routeChangeHandler = null;

export function setRouteChangeHandler(handler) {
    routeChangeHandler = handler;
}

export function normalizePathname(pathname = window.location.pathname) {
    if (!pathname || pathname === '/') return '/';
    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function getCurrentPageKey() {
    const hash = window.location.hash;
    if (hash === '#faq') return 'faq';
    if (hash === '#links') return 'links';
    if (hash === '#versions') return 'versions';

    const pathname = normalizePathname();
    if (pathname === ROUTE_PATHS.faq) return 'faq';
    if (pathname === ROUTE_PATHS.links) return 'links';
    return 'versions';
}

export function rememberVersionsSearch(search = window.location.search) {
    try {
        sessionStorage.setItem(VERSIONS_ROUTE_STATE_KEY, search || '');
    } catch (_) {
        // sessionStorage may be restricted
    }
}

export function getRememberedVersionsSearch() {
    try {
        return sessionStorage.getItem(VERSIONS_ROUTE_STATE_KEY) || '';
    } catch (_) {
        return '';
    }
}

export function buildRouteUrl(pageKey) {
    const url = new URL(window.location.origin);
    url.pathname = ROUTE_PATHS[pageKey] || ROUTE_PATHS.versions;
    url.hash = '';

    if (pageKey === 'versions') {
        url.search = getCurrentPageKey() === 'versions'
            ? window.location.search
            : getRememberedVersionsSearch();
    } else {
        url.search = '';
    }

    return url;
}

export function updateNavActive() {
    const currentPage = getCurrentPageKey();
    document.querySelectorAll('.nav-center a').forEach(link => {
        const targetPage = link.dataset.page;
        if (targetPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

export function navigateToPage(pageKey, replace = false) {
    const targetKey = ROUTE_PATHS[pageKey] ? pageKey : 'versions';
    const currentKey = getCurrentPageKey();

    if (currentKey === 'versions') {
        rememberVersionsSearch(window.location.search);
    }

    const url = buildRouteUrl(targetKey);
    const currentUrl = `${normalizePathname()}${window.location.search}`;
    const targetUrl = `${normalizePathname(url.pathname)}${url.search}`;
    const method = replace ? 'replaceState' : 'pushState';

    if (currentUrl !== targetUrl) {
        window.history[method](null, '', url);
    } else if (replace && window.location.hash) {
        window.history.replaceState(null, '', url);
    }

    routeChangeHandler?.();
    updateNavActive();
}

export function migrateLegacyRoute() {
    const hash = window.location.hash;
    if (hash === '#faq') {
        if (window.location.search) rememberVersionsSearch(window.location.search);
        navigateToPage('faq', true);
    } else if (hash === '#links') {
        if (window.location.search) rememberVersionsSearch(window.location.search);
        navigateToPage('links', true);
    } else if (hash === '#versions') {
        navigateToPage('versions', true);
    } else if (getCurrentPageKey() === 'versions' && normalizePathname() !== ROUTE_PATHS.versions) {
        navigateToPage('versions', true);
    }
}

export function syncUrlWithState() {
    if (getCurrentPageKey() !== 'versions') return;

    const params = {
        os: state.currentOS,
        search: state.currentSearchTerm,
        arch: state.currentArch && state.currentArch !== 'all' ? state.currentArch : null,
        winVersion: state.currentWinVersionFilter,
        macVersion: state.currentMacVersionFilter,
        linuxVersion: state.currentLinuxVersionFilter,
        sort: null
    };

    if (state.currentSortColumn === 'version') {
        params.sortVersion = state.sortVersionAscending ? 'asc' : 'desc';
        params.sortSize = null;
    } else if (state.currentSortColumn === 'size') {
        params.sortSize = state.sortSizeAscending ? 'asc' : 'desc';
        params.sortVersion = null;
    } else {
        params.sortVersion = null;
        params.sortSize = null;
    }

    if (state.currentSearchTerm && state.currentSearchTerm.trim() !== '') {
        params.sortVersion = null;
        params.sortSize = null;
    }

    const url = new URL(window.location);
    url.pathname = ROUTE_PATHS.versions;
    url.hash = '';

    Object.entries(params).forEach(([key, value]) => {
        if (value == null || value === undefined || value === '') {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });

    window.history.replaceState(null, '', url);
}

export function initRouter() {
    window.addEventListener('popstate', () => {
        routeChangeHandler?.();
        updateNavActive();
    });

    document.querySelectorAll('.nav-center a[data-page]').forEach(link => {
        link.addEventListener('click', e => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
                return;
            }

            e.preventDefault();
            navigateToPage(link.dataset.page);
        });
    });
}
