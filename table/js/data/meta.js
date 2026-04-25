import { state } from '../state.js';
import { getLinkMeta, getOrderedArchEntries, getOrderedArchKeys } from './normalize.js';

export const linkMetaCache = new Map();

let linkMetaQueueStarted = false;
const pendingLinkMetaUpdates = [];

export function flushPendingLinkMetaUpdates() {
    if (linkMetaQueueStarted) return;

    linkMetaQueueStarted = true;

    for (const request of pendingLinkMetaUpdates) {
        applyCachedLinkMeta(request.dateCell, request.sizeCell, request.url);
    }

    pendingLinkMetaUpdates.length = 0;
}

export function updateLinkInfo(dateCell, sizeCell, url, isVisible = true) {
    if (!isVisible) return;

    pendingLinkMetaUpdates.push({ dateCell, sizeCell, url });

    if (linkMetaQueueStarted) {
        applyCachedLinkMeta(dateCell, sizeCell, url);
        const index = pendingLinkMetaUpdates.findIndex(req =>
            req.dateCell === dateCell && req.sizeCell === sizeCell && req.url === url);
        if (index > -1) {
            pendingLinkMetaUpdates.splice(index, 1);
        }
    }
}

export function primeMetadataCache(data) {
    linkMetaCache.clear();

    Object.values(data).forEach(versionData => {
        if (!versionData?.links) return;

        Object.entries(versionData.links).forEach(([os, archMap]) => {
            if (!archMap || typeof archMap !== 'object') return;

            getOrderedArchEntries(os, archMap).forEach(([arch, link]) => {
                if (!link) return;
                linkMetaCache.set(link, getLinkMeta(versionData, os, arch));
            });
        });
    });
}

export function applyCachedLinkMeta(dateCell, sizeCell, url) {
    const dateCellTarget = dateCell.querySelector('.cell-wrapper') || dateCell;
    const sizeCellTarget = sizeCell.querySelector('.cell-wrapper') || sizeCell;
    const cached = linkMetaCache.get(url) || { date: '—', size: '—' };

    if (!linkMetaCache.has(url)) {
        linkMetaCache.set(url, cached);
    }

    dateCellTarget.textContent = cached.date;
    sizeCellTarget.textContent = cached.size;
}

export async function preloadSizesForSorting(dataSource) {
    const linksToPrime = [];

    dataSource.forEach(([, versionData]) => {
        if (!versionData.links[state.currentOS]) return;

        getOrderedArchKeys(state.currentOS, versionData.links[state.currentOS]).forEach(arch => {
            if (state.currentArch !== 'all' && arch !== state.currentArch) return;

            const link = versionData.links[state.currentOS][arch];
            if (link && !linkMetaCache.has(link)) {
                linksToPrime.push(link);
            }
        });
    });

    if (linksToPrime.length === 0) return;

    linksToPrime.forEach(link => {
        linkMetaCache.set(link, { date: '—', size: '—' });
    });
}
