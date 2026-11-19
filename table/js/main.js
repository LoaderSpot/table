import { inject } from '@vercel/analytics';
import { initAppCallbacks, ensureVersionsAppInitialized } from './app.js';
import { initRouter, migrateLegacyRoute, setRouteChangeHandler } from './router/routes.js';
import { loadMarkdownPage, setVersionsAppInitializer } from './router/markdown.js';
import { initBackToTop } from './ui/back-to-top.js';
import { initComments } from './ui/comments.js';
import { initBuildHover } from './ui/components.js';
import { initDownloadMessages } from './ui/download.js';
import { initOsVersionFilters, initPlatformTabs } from './ui/filters.js';
import { initSearchControls, reRenderVersions } from './ui/search.js';
import { initSortControls, setRenderCallback } from './ui/sort.js';
import { initStickyTableHeader } from './ui/sticky-header.js';

if (window.location.hostname === 'loadspot.vercel.app') {
    inject();
}

function initApp() {
    initAppCallbacks();
    setVersionsAppInitializer(ensureVersionsAppInitialized);
    setRouteChangeHandler(loadMarkdownPage);
    setRenderCallback(reRenderVersions);

    initComments();
    initBuildHover();
    initDownloadMessages();
    initOsVersionFilters();
    initPlatformTabs();
    initSearchControls();
    initSortControls();
    initStickyTableHeader();
    initBackToTop();
    initRouter();

    migrateLegacyRoute();
    loadMarkdownPage();
}

document.addEventListener('DOMContentLoaded', initApp);
