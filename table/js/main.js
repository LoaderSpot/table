import { initAppCallbacks, initializeApp, ensureVersionsAppInitialized, loadLinuxPackages } from './app.js';
import { initRouter, migrateLegacyRoute, setRouteChangeHandler } from './router/routes.js';
import { loadMarkdownPage, setVersionsAppInitializer } from './router/markdown.js';
import { initComments } from './ui/comments.js';
import { initDownloadMessages } from './ui/download.js';
import { initOsVersionFilters, initPlatformTabs, setPlatformCallbacks } from './ui/filters.js';
import { initSearchControls, performSearch } from './ui/search.js';
import { initSortControls, setRenderCallback } from './ui/sort.js';
import { reRenderVersions } from './ui/table.js';

function initApp() {
    initAppCallbacks();
    setVersionsAppInitializer(ensureVersionsAppInitialized);
    setRouteChangeHandler(loadMarkdownPage);
    setRenderCallback(reRenderVersions);
    setPlatformCallbacks({
        loadLinuxPackages,
        performSearch
    });

    initComments();
    initDownloadMessages();
    initOsVersionFilters();
    initPlatformTabs();
    initSearchControls();
    initSortControls();
    initRouter();

    migrateLegacyRoute();
    initializeApp().catch(err => console.error('Error loading version data:', err));
    loadMarkdownPage();
}

document.addEventListener('DOMContentLoaded', initApp);
