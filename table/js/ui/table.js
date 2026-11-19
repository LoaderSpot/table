import { ITEMS_PER_BATCH, getCurrentVersionFilter, isOsTemporarilyUnavailable, state } from '../state.js';
import { prepareTableItems } from './table-items.js';
import { getOsDisplayName } from '../utils/version.js';
import { createDownloadCell } from './download.js';
import {
    addBuildBranch,
    connectBuildFamily,
    createSpoiler,
    createVersionContainer,
    createVersionElement,
    resetFamilyOrigins
} from './components.js';

let listing;
let nextIndex = 0;

export const sentinel = document.createElement('tr');
sentinel.style.height = '1px';
sentinel.setAttribute('aria-hidden', 'true');

function getContainer() {
    return document.getElementById('versions-container');
}

function createTextCell(className, text) {
    const cell = document.createElement('td');
    cell.className = className;
    cell.textContent = text;
    return cell;
}

function createBuildRows({ version, architectures }, os, term, child = false) {
    const { versionText } = createVersionElement(version, term, version.short, os);
    return architectures.map((file, index) => {
        const row = document.createElement('tr');
        row.className = 'build-row';
        if (index === 0) {
            const cell = document.createElement('td');
            cell.className = os === 'linux' ? 'version-cell has-comments' : 'version-cell';
            cell.rowSpan = architectures.length;
            cell.appendChild(child && os === 'linux' ? versionText : createVersionContainer(versionText));
            row.appendChild(cell);
        }
        const action = createDownloadCell(file, version.short, os);
        action.dataset.downloadUrl = file.link;
        row.append(createTextCell('arch-cell', file.arch), createTextCell('date-cell', file.date),
            createTextCell('size-cell', file.size), action);
        return row;
    });
}

function appendFamily(fragment, [key, builds]) {
    const { os, term, limit } = listing;
    const [first, ...otherBuilds] = builds;
    const parents = createBuildRows(first, os, term);
    fragment.append(...parents);
    if (!otherBuilds.length) return;

    const expanded = Boolean(term) || otherBuilds.some(build => build.version.short === limit);
    const button = createSpoiler(key, otherBuilds.length);
    parents[0].querySelector('.version-spoiler-slot').appendChild(button);
    connectBuildFamily(parents, button, key, expanded, () => {
        return otherBuilds.flatMap((build, index) => {
            const rows = createBuildRows(build, os, term, true);
            for (const row of rows) {
                row.classList.add('spoiler-content-row', 'visible');
                row.dataset.spoilerFor = key;
                row.dataset.spoilerIndex = String(index);
                row.classList.toggle('build-branch-last', index === otherBuilds.length - 1);
                addBuildBranch(row);
            }
            return rows;
        });
    });
}

function loadNextBatch() {
    observer.unobserve(sentinel);
    sentinel.remove();
    const fragment = document.createDocumentFragment();
    const count = listing.bySize ? ITEMS_PER_BATCH * 3 : ITEMS_PER_BATCH;
    const end = Math.min(nextIndex + count, listing.items.length);
    for (; nextIndex < end; nextIndex++) {
        const item = listing.items[nextIndex];
        if (listing.bySize) {
            fragment.append(...createBuildRows({ version: item.version, architectures: [item.file] }, listing.os, ''));
        } else {
            appendFamily(fragment, item);
        }
    }

    const hasMore = nextIndex < listing.items.length;
    if (hasMore) fragment.appendChild(sentinel);
    getContainer().appendChild(fragment);
    if (hasMore) observer.observe(sentinel);
}

export function startLazyLoading() {
    observer.unobserve(sentinel);
    observer.takeRecords();
    resetFamilyOrigins();
    const container = getContainer();
    container.replaceChildren();
    nextIndex = 0;
    if (isOsTemporarilyUnavailable(state.currentOS)) {
        listing = null;
        showTemporarilyUnavailableNotice();
        return;
    }

    listing = { ...prepareTableItems(), os: state.currentOS, term: state.currentSearchTerm, limit: getCurrentVersionFilter() };
    if (!listing.items.length) {
        container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No results</td></tr>';
        return;
    }
    loadNextBatch();
}

export const observer = new IntersectionObserver(entries => {
    if (sentinel.isConnected && entries.some(entry => entry.isIntersecting)) loadNextBatch();
}, { rootMargin: '100px' });

function showTemporarilyUnavailableNotice(os = state.currentOS) {
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
}
