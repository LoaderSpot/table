import { ITEMS_PER_BATCH, getCurrentVersionFilter, isOsTemporarilyUnavailable, resetSizePreload, state } from '../state.js';
import { compareArchNames, getOrderedArchKeys } from '../data/normalize.js';
import { linkMetaCache, preloadSizesForSorting, updateLinkInfo } from '../data/meta.js';
import { compareVersions, getOsDisplayName } from '../utils/version.js';
import { createDownloadCell } from './download.js';
import {
    createSpoiler,
    createVersionContainer,
    createVersionElement,
    wrapSpoilerCells
} from './components.js';
import { sizeCompare, versionCompare } from './sort.js';

let searchRunner = null;

export const sentinel = document.createElement('tr');
sentinel.style.height = '1px';

function getContainer() {
    return document.getElementById('versions-container');
}

function createTextCell(text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
}

function createVersionCell(content, rowSpan, className = 'version-cell') {
    const versionCell = document.createElement('td');
    versionCell.className = className;
    versionCell.rowSpan = rowSpan;
    versionCell.appendChild(content);
    return versionCell;
}

function createBuildRow({
    version,
    versionKey = version.short,
    fullVersion = version.full,
    searchTerm = state.currentSearchTerm,
    os = state.currentOS,
    arch,
    date = '—',
    size = '—',
    link,
    includeVersionCell = true,
    versionRowSpan = 1,
    versionCellClassName = 'version-cell',
    versionContent = null,
    wrapVersionContent = true,
    updateMeta = false,
    isVisible = true
}) {
    const row = document.createElement('tr');

    if (includeVersionCell) {
        const versionContentNode = versionContent || (() => {
            const { versionText } = createVersionElement(
                { short: versionKey, full: fullVersion },
                searchTerm,
                versionKey,
                os
            );
            return wrapVersionContent ? createVersionContainer(versionText) : versionText;
        })();
        row.appendChild(createVersionCell(versionContentNode, versionRowSpan, versionCellClassName));
    }

    row.appendChild(createTextCell(arch));

    const dateCell = createTextCell(date);
    row.appendChild(dateCell);

    const sizeCell = createTextCell(size);
    row.appendChild(sizeCell);

    const downloadCell = createDownloadCell(link, versionKey, os, arch);
    downloadCell.setAttribute('data-download-url', link);
    row.appendChild(downloadCell);

    if (updateMeta) {
        updateLinkInfo(dateCell, sizeCell, link, isVisible);
    }

    return row;
}

function appendRowsBatch(container, items, createRow, batchSize, { appendSentinel = true } = {}) {
    const endIndex = Math.min(state.currentIndex + batchSize, items.length);

    for (let i = state.currentIndex; i < endIndex; i++) {
        container.appendChild(createRow(items[i]));
    }

    state.currentIndex = endIndex;
    if (appendSentinel && state.currentIndex < items.length) {
        container.appendChild(sentinel);
    }

    return items.length;
}

function decorateSpoilerRow(row, hiddenIndex) {
    row.dataset.spoilerIndex = String(hiddenIndex);
}

function applySpoilerRowState(row, groupKey, hiddenIndex, shouldExpand) {
    row.classList.add('spoiler-content-row');
    row.dataset.spoilerFor = groupKey;
    decorateSpoilerRow(row, hiddenIndex);

    if (shouldExpand) {
        row.style.display = 'table-row';
        row.classList.add('visible');
        wrapSpoilerCells(row);
        return;
    }

    row.style.display = 'none';
}

function appendSpoilerButton(spoilerSlot, groupKey, hiddenCount, shouldExpand) {
    if (!spoilerSlot || hiddenCount === 0) return null;

    const spoilerBtn = createSpoiler(groupKey, hiddenCount);
    if (shouldExpand) {
        spoilerBtn.classList.add('expanded');
    }
    spoilerSlot.appendChild(spoilerBtn);
    return spoilerBtn;
}

function prepareVisibleVersions(versions, filterFn, sortFn) {
    const visibleVersions = filterFn ? versions.filter(filterFn) : [...versions];
    visibleVersions.sort(sortFn);

    return {
        visibleVersions,
        hiddenVersions: visibleVersions.slice(1)
    };
}

export function setSearchRunner(runner) {
    searchRunner = runner;
}

export function resetTableLoadingState({ resetOverflow = true } = {}) {
    const loadingIndicator = document.getElementById('sizeLoadingIndicator');
    const container = getContainer();
    const tableContainer = document.getElementById('tableContainer');

    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

    if (container) {
        container.classList.remove('table-skeleton-overlay');
    }

    if (resetOverflow) {
        if (tableContainer) {
            tableContainer.style.overflow = '';
        }
        document.body.style.overflow = '';
    }
}

export function hasVisibleWinMacRows(versionKey, data, os = state.currentOS) {
    if (!data.links[os]) return false;

    const currentVersionFilter = getCurrentVersionFilter(os);
    if (currentVersionFilter && compareVersions(versionKey, currentVersionFilter) > 0) {
        return false;
    }

    return getOrderedArchKeys(os, data.links[os]).some(arch => {
        return state.currentArch === 'all' || arch === state.currentArch;
    });
}

export function reRenderVersions() {
    const container = getContainer();
    container.style.opacity = '0';
    observer.unobserve(sentinel);

    state.currentIndex = 0;
    resetSizePreload();
    resetTableLoadingState();

    setTimeout(() => {
        if (state.currentSearchTerm !== '') {
            searchRunner?.(state.currentSearchTerm);
        } else {
            state.currentSearchResults = null;
            startLazyLoading();
        }
    }, 300);
}

export function createVersionRows(versionKey, data, searchTerm = '', isVisible = true) {
    const shortVersion = versionKey;
    const archCombos = [];
    let totalRowsForVersion = 0;
    const currentVersionFilter = getCurrentVersionFilter(state.currentOS);

    if (currentVersionFilter && compareVersions(shortVersion, currentVersionFilter) > 0) {
        return [];
    }

    if (data.links[state.currentOS]) {
        for (const arch of getOrderedArchKeys(state.currentOS, data.links[state.currentOS])) {
            if (state.currentArch !== 'all' && arch !== state.currentArch) continue;
            const link = data.links[state.currentOS][arch];
            if (link) {
                archCombos.push({ arch, link });
                totalRowsForVersion++;
            }
        }
    }

    if (totalRowsForVersion === 0) return [];

    const rows = [];
    let isFirstVersionRow = true;

    archCombos.forEach(combo => {
        const row = createBuildRow({
            version: { short: shortVersion, full: data.fullversion },
            versionKey,
            searchTerm,
            os: state.currentOS,
            arch: combo.arch,
            link: combo.link,
            includeVersionCell: isFirstVersionRow,
            versionRowSpan: totalRowsForVersion,
            updateMeta: true,
            isVisible
        });

        isFirstVersionRow = false;
        rows.push(row);
    });

    return rows;
}

export function getCurrentDataSource() {
    if (state.currentOS === 'linux') {
        const dataSource = state.currentSearchResults || state.linuxVersionsData;
        const groupedVersions = groupLinuxVersions(dataSource);
        const groups = Object.entries(groupedVersions);
        groups.sort((a, b) => versionCompare(a[0], b[0]));
        return groups;
    }

    return state.currentSearchResults || state.allVersions;
}

export function hasSearchMatchInHiddenVersions(versions, searchTerm, osType = 'winmac') {
    if (!searchTerm) return false;

    const term = searchTerm.toLowerCase();

    for (let i = 1; i < versions.length; i++) {
        if (osType === 'linux') {
            const version = versions[i];
            if (version.version.short.toLowerCase().includes(term) ||
                version.version.full.toLowerCase().includes(term)) {
                return true;
            }
        } else {
            const [versionKey, versionData] = versions[i];
            if (versionKey.toLowerCase().includes(term) ||
                versionData.fullversion.toLowerCase().includes(term)) {
                return true;
            }
        }
    }

    return false;
}

export function shouldExpandHiddenVersions(visibleVersions, hiddenVersions, searchTerm, osType, currentVersionFilter) {
    const hasMatchInHidden = hasSearchMatchInHiddenVersions(visibleVersions, searchTerm, osType);
    const hasVersionFilterInHidden = currentVersionFilter && hiddenVersions.some(version => {
        if (osType === 'linux') {
            return version.version.short === currentVersionFilter;
        }

        return version[0] === currentVersionFilter;
    });

    return hasMatchInHidden || hasVersionFilterInHidden;
}

export function getVersionSize(versionData, os = state.currentOS) {
    if (os === 'linux') {
        if (versionData.architectures && versionData.architectures.length > 0) {
            return versionData.architectures[0].size || '—';
        }
        return '—';
    }

    if (versionData.links && versionData.links[os]) {
        const archs = getOrderedArchKeys(os, versionData.links[os]);
        if (archs.length > 0) {
            const link = versionData.links[os][archs[0]];
            if (linkMetaCache.has(link)) {
                return linkMetaCache.get(link).size;
            }
        }
    }

    return '—';
}

export function loadMoreLinuxRows() {
    const container = getContainer();
    const dataSource = state.currentSearchResults || state.linuxVersionsData;

    if (state.currentSortColumn === 'size' && !state.currentSearchResults) {
        const flatRows = [];
        dataSource.forEach(version => {
            if (state.currentLinuxVersionFilter && compareVersions(version.version.short, state.currentLinuxVersionFilter) > 0) {
                return;
            }

            version.architectures.forEach(arch => {
                flatRows.push({
                    version: version.version,
                    arch
                });
            });
        });

        flatRows.sort((a, b) => {
            const sizeComp = sizeCompare(a.arch.size, b.arch.size);
            if (sizeComp !== 0) return sizeComp;
            const versionComp = versionCompare(a.version.short, b.version.short);
            if (versionComp !== 0) return versionComp;
            return compareArchNames('linux', a.arch.arch, b.arch.arch);
        });

        appendRowsBatch(container, flatRows, item => createBuildRow({
            version: item.version,
            versionKey: item.version.short,
            os: 'linux',
            arch: item.arch.arch,
            date: item.arch.date,
            size: item.arch.size,
            link: item.arch.link,
            versionCellClassName: 'version-cell has-comments'
        }), ITEMS_PER_BATCH * 3);
        return;
    }

    const groupedVersions = groupLinuxVersions(dataSource);
    const groups = Object.entries(groupedVersions);
    if (!state.currentSearchResults) {
        groups.sort((a, b) => versionCompare(a[0], b[0]));
    }

    const endIndex = Math.min(state.currentIndex + ITEMS_PER_BATCH, groups.length);

    for (let i = state.currentIndex; i < endIndex; i++) {
        const [groupKey, versions] = groups[i];
        const { visibleVersions, hiddenVersions } = prepareVisibleVersions(
            versions,
            state.currentLinuxVersionFilter
                ? version => compareVersions(version.version.short, state.currentLinuxVersionFilter) <= 0
                : null,
            (a, b) => versionCompare(a.version.short, b.version.short)
        );

        if (visibleVersions.length === 0) continue;

        const displayVersion = visibleVersions[0];
        const { versionText, spoilerSlot } = createVersionElement(
            { short: displayVersion.version.short, full: displayVersion.version.full },
            state.currentSearchTerm,
            displayVersion.version.short,
            'linux'
        );
        const versionContainer = createVersionContainer(versionText);
        const shouldExpand = shouldExpandHiddenVersions(
            visibleVersions,
            hiddenVersions,
            state.currentSearchTerm,
            'linux',
            state.currentLinuxVersionFilter
        );

        appendSpoilerButton(spoilerSlot, groupKey, hiddenVersions.length, shouldExpand);

        displayVersion.architectures.forEach((arch, index) => {
            const row = createBuildRow({
                version: displayVersion.version,
                versionKey: displayVersion.version.short,
                os: 'linux',
                arch: arch.arch,
                date: arch.date,
                size: arch.size,
                link: arch.link,
                includeVersionCell: index === 0,
                versionRowSpan: displayVersion.architectures.length,
                versionCellClassName: 'version-cell has-comments',
                versionContent: index === 0 ? versionContainer : null
            });
            container.appendChild(row);
        });

        if (hiddenVersions.length > 0) {
            for (let j = 0; j < hiddenVersions.length; j++) {
                const olderVersion = hiddenVersions[j];

                olderVersion.architectures.forEach((arch, index) => {
                    const oldVersionText = index === 0
                        ? createVersionElement(
                            { short: olderVersion.version.short, full: olderVersion.version.full },
                            state.currentSearchTerm,
                            olderVersion.version.short,
                            'linux'
                        ).versionText
                        : null;
                    const row = createBuildRow({
                        version: olderVersion.version,
                        versionKey: olderVersion.version.short,
                        os: 'linux',
                        arch: arch.arch,
                        date: arch.date,
                        size: arch.size,
                        link: arch.link,
                        includeVersionCell: index === 0,
                        versionRowSpan: olderVersion.architectures.length,
                        versionCellClassName: 'version-cell has-comments',
                        versionContent: oldVersionText,
                        wrapVersionContent: false
                    });
                    applySpoilerRowState(row, groupKey, j, shouldExpand);
                    container.appendChild(row);
                });
            }
        }
    }

    state.currentIndex = endIndex;
    if (state.currentIndex < groups.length) {
        container.appendChild(sentinel);
    }
}

export function loadMoreWinMacRows() {
    const container = getContainer();
    const dataSource = state.currentSearchResults || state.allVersions;

    if (state.currentSortColumn === 'size' && !state.currentSearchResults) {
        const currentVersionFilter = getCurrentVersionFilter(state.currentOS);

        if (!state.sizesPreloaded) {
            state.sizesPreloaded = true;
            preloadSizesForSorting(dataSource).then(() => {
                if (state.currentSortColumn === 'size') {
                    container.innerHTML = '';
                    state.currentIndex = 0;
                    loadMoreWinMacRows();
                }
            });
        }

        const flatRows = [];
        dataSource.forEach(([versionKey, versionData]) => {
            if (currentVersionFilter && compareVersions(versionKey, currentVersionFilter) > 0) {
                return;
            }

            if (!versionData.links[state.currentOS]) return;

            getOrderedArchKeys(state.currentOS, versionData.links[state.currentOS]).forEach(arch => {
                if (state.currentArch !== 'all' && arch !== state.currentArch) return;

                const link = versionData.links[state.currentOS][arch];
                if (link) {
                    let size = '—';
                    let date = '—';
                    if (linkMetaCache.has(link)) {
                        const cached = linkMetaCache.get(link);
                        size = cached.size;
                        date = cached.date;
                    }

                    flatRows.push({
                        versionKey,
                        versionData,
                        arch,
                        link,
                        size,
                        date
                    });
                }
            });
        });

        flatRows.sort((a, b) => {
            const sizeComp = sizeCompare(a.size, b.size);
            if (sizeComp !== 0) return sizeComp;
            const versionComp = versionCompare(a.versionKey, b.versionKey);
            if (versionComp !== 0) return versionComp;
            return compareArchNames(state.currentOS, a.arch, b.arch);
        });

        const totalRows = appendRowsBatch(container, flatRows, item => createBuildRow({
            version: { short: item.versionKey, full: item.versionData.fullversion },
            versionKey: item.versionKey,
            os: state.currentOS,
            arch: item.arch,
            date: item.date,
            size: item.size,
            link: item.link,
            updateMeta: !linkMetaCache.has(item.link)
        }), ITEMS_PER_BATCH * 3);

        if (totalRows === 0 && container.childElementCount === 0) {
            showNoResults();
        }
        return;
    }

    const groupedVersions = groupVersions(dataSource);
    const groups = Object.entries(groupedVersions);
    if (!state.currentSearchResults) {
        groups.sort((a, b) => versionCompare(a[0], b[0]));
    }

    const endIndex = Math.min(state.currentIndex + ITEMS_PER_BATCH, groups.length);
    let rowsAdded = 0;

    for (let i = state.currentIndex; i < endIndex; i++) {
        const [groupKey, versions] = groups[i];
        const currentVersionFilter = getCurrentVersionFilter(state.currentOS);
        const { visibleVersions, hiddenVersions } = prepareVisibleVersions(
            versions,
            currentVersionFilter
                ? ([versionKey]) => compareVersions(versionKey, currentVersionFilter) <= 0
                : null,
            (a, b) => versionCompare(a[0], b[0])
        );

        if (visibleVersions.length === 0) continue;

        const [displayVersionKey, displayVersionData] = visibleVersions[0];
        const displayVersionRows = createVersionRows(displayVersionKey, displayVersionData, state.currentSearchTerm);

        if (displayVersionRows.length > 0) {
            const shouldExpand = shouldExpandHiddenVersions(
                visibleVersions,
                hiddenVersions,
                state.currentSearchTerm,
                'winmac',
                currentVersionFilter
            );

            const spoilerControls = displayVersionRows[0].querySelector('.version-cell .version-spoiler-slot');
            appendSpoilerButton(spoilerControls, groupKey, hiddenVersions.length, shouldExpand);

            displayVersionRows.forEach(row => container.appendChild(row));
            rowsAdded += displayVersionRows.length;

            if (hiddenVersions.length > 0) {
                for (let j = 0; j < hiddenVersions.length; j++) {
                    const [versionKey, versionData] = hiddenVersions[j];
                    const olderVersionRows = createVersionRows(versionKey, versionData, state.currentSearchTerm, shouldExpand);

                    olderVersionRows.forEach(row => {
                        applySpoilerRowState(row, groupKey, j, shouldExpand);
                        container.appendChild(row);
                    });
                }
            }
        }
    }

    state.currentIndex = endIndex;

    if (state.currentIndex < groups.length) {
        container.appendChild(sentinel);
    } else if (rowsAdded === 0 && state.currentIndex === groups.length) {
        if (container.childElementCount === 0) {
            showNoResults();
        }
    }
}

export function groupVersions(versions) {
    const groups = {};
    versions.forEach(([versionKey, data]) => {
        if (!hasVisibleWinMacRows(versionKey, data)) {
            return;
        }

        const groupKey = versionKey.split('.').slice(0, 3).join('.');
        if (!groups[groupKey]) {
            groups[groupKey] = new Map();
        }

        if (!groups[groupKey].has(versionKey)) {
            groups[groupKey].set(versionKey, data);
        }
    });

    Object.keys(groups).forEach(key => {
        groups[key] = Array.from(groups[key].entries());
    });
    return groups;
}

export function groupLinuxVersions(versions) {
    const groups = {};
    versions.forEach(version => {
        const groupKey = version.version.short.split('.').slice(0, 3).join('.');
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(version);
    });
    return groups;
}

export function showNoResults() {
    const container = getContainer();
    container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No results</td></tr>';
    container.style.opacity = '1';
}

export function showTemporarilyUnavailableNotice(os = state.currentOS) {
    const container = getContainer();
    const osLabel = getOsDisplayName(os);
    container.innerHTML = `
        <tr class="platform-unavailable-row">
            <td colspan="5">
                <div class="platform-unavailable-notice">
                    <span class="platform-unavailable-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                            <path d="M12 3.25a1.3 1.3 0 0 1 1.14.67l8.11 14.4A1.3 1.3 0 0 1 20.11 20H3.89a1.3 1.3 0 0 1-1.14-1.93l8.11-14.4A1.3 1.3 0 0 1 12 3.25Zm0 4.1a1 1 0 0 0-1 1V12a1 1 0 1 0 2 0V8.35a1 1 0 0 0-1-1Zm0 9.4a1.15 1.15 0 1 0 0-2.3 1.15 1.15 0 0 0 0 2.3Z"></path>
                        </svg>
                    </span>
                    <strong>${osLabel} builds are temporarily unavailable.</strong>
                </div>
            </td>
        </tr>
    `;
    container.style.opacity = '1';
}

export function getTotalItemCount() {
    if (state.currentOS === 'linux') {
        const dataSource = state.currentSearchResults || state.linuxVersionsData;

        if (state.currentSortColumn === 'size') {
            return dataSource.reduce((sum, version) => {
                if (state.currentLinuxVersionFilter && compareVersions(version.version.short, state.currentLinuxVersionFilter) > 0) {
                    return sum;
                }
                return sum + version.architectures.length;
            }, 0);
        }

        return Object.keys(groupLinuxVersions(dataSource)).length;
    }

    const dataSource = state.currentSearchResults || state.allVersions;

    if (state.currentSortColumn === 'size') {
        const currentVersionFilter = getCurrentVersionFilter(state.currentOS);
        return dataSource.reduce((sum, [versionKey, versionData]) => {
            if (currentVersionFilter && compareVersions(versionKey, currentVersionFilter) > 0) {
                return sum;
            }
            if (!versionData.links[state.currentOS]) return sum;

            const archCount = Object.keys(versionData.links[state.currentOS]).filter(arch => {
                return state.currentArch === 'all' || arch === state.currentArch;
            }).length;

            return sum + archCount;
        }, 0);
    }

    return Object.keys(groupVersions(dataSource)).length;
}

export function startLazyLoading() {
    const container = getContainer();
    container.innerHTML = '';
    state.currentIndex = 0;

    if (isOsTemporarilyUnavailable(state.currentOS)) {
        showTemporarilyUnavailableNotice(state.currentOS);
        return;
    }

    const dataSource = getCurrentDataSource();

    if (!dataSource || dataSource.length === 0) {
        showNoResults();
        return;
    }

    if (state.currentOS !== 'linux') {
        const filteredVersions = dataSource.filter(([versionKey, data]) => {
            if (!data.links[state.currentOS]) return false;
            if (state.currentArch !== 'all' && !data.links[state.currentOS][state.currentArch]) return false;

            const currentVersionFilter = getCurrentVersionFilter(state.currentOS);
            if (currentVersionFilter && compareVersions(versionKey, currentVersionFilter) > 0) {
                return false;
            }

            return true;
        });

        if (filteredVersions.length === 0) {
            showNoResults();
            return;
        }
    }

    if (state.currentOS === 'linux') {
        loadMoreLinuxRows();
    } else {
        loadMoreWinMacRows();
    }

    if (state.currentIndex < getTotalItemCount()) {
        observer.observe(sentinel);
    }

    container.style.opacity = '1';
}

export const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        observer.unobserve(sentinel);

        if (state.currentOS === 'linux') {
            loadMoreLinuxRows();
        } else {
            loadMoreWinMacRows();
        }

        if (state.currentIndex < getTotalItemCount()) {
            observer.observe(sentinel);
        }
    });
}, { root: null, rootMargin: '100px', threshold: 0 });
