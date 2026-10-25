import { state } from '../state.js';
import { linkMetaCache, updateLinkInfo } from '../data/meta.js';
import { copyTextToClipboard } from '../utils/clipboard.js';
import { highlight } from '../utils/version.js';
import { createCommentButton } from './comments.js';

const spoilerAnimations = new WeakMap();
const collapsedCellFrame = { height: '0px', opacity: '0', paddingTop: '0px', paddingBottom: '0px', transform: 'translateY(-4px)' };
const familyOrigins = new Set();
let familyObserver;

export function initBuildHover() {
    const container = document.getElementById('versions-container');
    let hoveredCell = null;

    function updateHover(target) {
        let row = target instanceof Element ? target.closest('tr.build-row') : null;
        if (!container.contains(row)) row = null;
        // Architecture rows share the version cell from the first row of their build
        while (row && !row.querySelector('.version-cell')) row = row.previousElementSibling;
        const cell = row?.querySelector('.version-cell') || null;
        if (cell === hoveredCell) return;
        hoveredCell?.classList.remove('build-hovered');
        cell?.classList.add('build-hovered');
        hoveredCell = cell;
    }

    container.addEventListener('pointerover', event => {
        if (event.pointerType !== 'touch') updateHover(event.target);
    });
    container.addEventListener('pointerout', event => {
        if (event.pointerType !== 'touch') updateHover(event.relatedTarget);
    });
    container.addEventListener('pointerleave', () => updateHover(null));
}

// Keep both ends of the tree attached to the short labels during layout changes
function syncFamilyOrigins() {
    for (const row of familyOrigins) {
        const short = row.querySelector('.short-version');
        if (!row.isConnected) {
            familyObserver.unobserve(row);
            if (short) familyObserver.unobserve(short);
            familyOrigins.delete(row);
            continue;
        }
        const cell = row.querySelector('.version-cell');
        const rect = short.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        row.style.setProperty('--build-root-top', `${center - row.getBoundingClientRect().top}px`);
        cell.style.setProperty('--build-root-inset', `${center - cell.getBoundingClientRect().top}px`);
    }
}

export function connectBuildFamily(rows, groupKey, expanded) {
    if (!rows.length) return;
    rows.forEach(row => {
        row.dataset.buildFamily = groupKey;
        row.classList.add('build-family-parent');
        row.classList.toggle('build-family-open', expanded);
    });
    observeFamilyOrigin(rows[0]);
}

function observeFamilyOrigin(row) {
    if (familyOrigins.has(row)) return;
    const short = row.querySelector('.short-version');
    if (!short) return;
    familyObserver ||= new ResizeObserver(syncFamilyOrigins);
    familyOrigins.add(row);
    familyObserver.observe(row);
    familyObserver.observe(short);
    requestAnimationFrame(syncFamilyOrigins);
}

export function createVersionContainer(versionText) {
    const versionContainer = document.createElement('div');
    versionContainer.className = 'version-container';

    const versionTextWrapper = document.createElement('div');
    versionTextWrapper.className = 'version-text-wrapper';
    versionTextWrapper.appendChild(versionText);
    versionContainer.appendChild(versionTextWrapper);

    return versionContainer;
}

export function createVersionElement(version, searchTerm, commentTarget = null, commentOs = state.currentOS) {
    const versionText = document.createElement('div');
    versionText.className = 'version-text';

    const topRow = document.createElement('div');
    topRow.className = 'version-line version-line-top';

    const shortVersionElem = createVersionPart(version.short || version, searchTerm, 'short-version', 'Short version copied to clipboard');
    topRow.appendChild(shortVersionElem);

    const controlsSlot = document.createElement('div');
    controlsSlot.className = 'version-controls-slot';

    const commentSlot = document.createElement('div');
    commentSlot.className = 'version-control-slot version-comment-slot';
    controlsSlot.appendChild(commentSlot);

    const spoilerSlot = document.createElement('div');
    spoilerSlot.className = 'version-control-slot version-spoiler-slot';
    controlsSlot.appendChild(spoilerSlot);

    const bottomRow = document.createElement('div');
    bottomRow.className = 'version-line version-line-bottom';

    if (version.full) {
        const fullVersionElem = createVersionPart(version.full, searchTerm, 'full-version', 'Full version copied to clipboard');
        bottomRow.appendChild(fullVersionElem);
    } else {
        const fullVersionPlaceholder = document.createElement('span');
        fullVersionPlaceholder.className = 'full-version full-version-placeholder';
        fullVersionPlaceholder.setAttribute('aria-hidden', 'true');
        bottomRow.appendChild(fullVersionPlaceholder);
    }

    if (commentTarget) {
        commentSlot.appendChild(createCommentButton(commentTarget, {
            os: commentOs,
            modalLabel: `version ${commentTarget}`,
            backlink: null
        }));
        topRow.appendChild(controlsSlot);
    }

    versionText.appendChild(topRow);
    versionText.appendChild(bottomRow);

    return { versionText, shortVersionElem, topRow, controlsSlot, spoilerSlot, commentSlot };
}

export function createVersionPart(text, searchTerm, className, toastMessage) {
    const element = document.createElement('span');
    element.className = className;
    element.innerHTML = searchTerm ? highlight(text, searchTerm) : text;

    element.addEventListener('click', () => {
        copyTextToClipboard(text, toastMessage);
    });

    return element;
}

export function toggleSpoiler(groupKey) {
    const spoilerRows = [...document.querySelectorAll(`tr.spoiler-content-row[data-spoiler-for="${groupKey}"]`)];
    const toggleButton = document.querySelector(`.spoiler-toggle[data-group-key="${groupKey}"]`);

    if (spoilerRows.length === 0 || !toggleButton) return;

    const expanded = !toggleButton.classList.contains('expanded');
    const previousAnimations = spoilerAnimations.get(toggleButton);

    spoilerRows.forEach(wrapSpoilerCells);
    const cells = spoilerRows.flatMap(row => [...row.querySelectorAll('.cell-wrapper')].map(wrapper => ({
        wrapper,
        from: row.style.display === 'none' ? collapsedCellFrame : readCellFrame(wrapper)
    })));
    const branches = spoilerRows.flatMap(row => [...row.querySelectorAll('.build-tree-stem')].map(element => ({
        element,
        from: { opacity: row.style.display === 'none' ? '0' : getComputedStyle(element).opacity }
    })));

    // Capture the current frame before cancelling an interrupted animation
    previousAnimations?.forEach(animation => animation.cancel());
    spoilerAnimations.delete(toggleButton);
    toggleButton.classList.toggle('expanded', expanded);
    toggleButton.setAttribute('aria-expanded', String(expanded));
    toggleButton.setAttribute('aria-label', expanded ? 'Hide additional builds' : toggleButton.dataset.collapsedLabel);
    toggleButton.title = expanded ? 'Hide additional builds' : 'Show additional builds';
    document.querySelectorAll(`tr[data-build-family="${groupKey}"]`).forEach(row => {
        row.classList.toggle('build-family-open', expanded);
    });

    spoilerRows.forEach(row => {
        row.style.display = '';
        row.classList.toggle('visible', expanded);
        row.inert = !expanded;
        if (expanded) updateSpoilerMetadata(row);
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || cells.some(({ wrapper }) => !wrapper.animate)) {
        spoilerRows.forEach(row => { row.style.display = expanded ? '' : 'none'; });
        return;
    }

    const frames = cells.map(({ wrapper, from }) => ({
        wrapper,
        from,
        to: expanded ? readCellFrame(wrapper) : collapsedCellFrame
    }));
    const timing = {
        duration: expanded ? 280 : 220,
        easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        fill: 'both'
    };
    const animations = frames.map(({ wrapper, from, to }) => wrapper.animate([from, to], timing));
    branches.forEach(({ element, from }) => {
        animations.push(element.animate([from, { opacity: expanded ? '1' : '0' }], timing));
    });

    spoilerAnimations.set(toggleButton, animations);
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (spoilerAnimations.get(toggleButton) !== animations) return;

        spoilerRows.forEach(row => { row.style.display = expanded ? '' : 'none'; });
        animations.forEach(animation => animation.cancel());
        spoilerAnimations.delete(toggleButton);
    });
}

function readCellFrame(wrapper) {
    const style = getComputedStyle(wrapper);
    return {
        height: `${wrapper.getBoundingClientRect().height}px`,
        opacity: style.opacity,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        transform: style.transform
    };
}

function updateSpoilerMetadata(row) {
    const cells = row.querySelectorAll('td');
    const offset = row.querySelector('.version-cell') ? 1 : 0;
    const dateCell = cells[offset + 1];
    const sizeCell = cells[offset + 2];
    const downloadCell = cells[offset + 3];
    const url = downloadCell?.getAttribute('data-download-url');
    if (!dateCell || !sizeCell || !url) return;

    if (linkMetaCache.has(url)) {
        const cached = linkMetaCache.get(url);
        dateCell.querySelector('.cell-wrapper').textContent = cached.date;
        sizeCell.querySelector('.cell-wrapper').textContent = cached.size;
    } else {
        updateLinkInfo(dateCell, sizeCell, url, true);
    }
}

export function wrapSpoilerCells(row) {
    const cells = row.querySelectorAll('td');
    cells.forEach(cell => {
        if (!cell.querySelector('.cell-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'cell-wrapper';
            while (cell.firstChild) {
                wrapper.appendChild(cell.firstChild);
            }
            cell.appendChild(wrapper);
        }
    });
    if (row.querySelector('.build-tree')) return;
    const versionCell = row.querySelector('.version-cell');
    const carrier = versionCell || row.querySelector('.arch-cell');
    if (!carrier) return;
    const tree = document.createElement('span');
    tree.className = 'build-tree';
    tree.setAttribute('aria-hidden', 'true');
    const stem = document.createElement('span');
    stem.className = 'build-tree-stem';
    tree.appendChild(stem);
    if (versionCell) {
        const junction = document.createElement('span');
        junction.className = 'build-tree-junction';
        junction.setAttribute('aria-hidden', 'true');
        versionCell.querySelector('.version-line-top').appendChild(junction);
        if (row.classList.contains('build-branch-last')) observeFamilyOrigin(row);
    }
    carrier.appendChild(tree);
}

export function createSpoiler(groupKey, hiddenCount) {
    const spoilerBtn = document.createElement('button');
    spoilerBtn.type = 'button';
    spoilerBtn.className = 'spoiler-toggle';
    spoilerBtn.title = (state.currentSortColumn === 'version' && !state.sortVersionAscending) ? 'Show older builds' : 'Show builds';
    spoilerBtn.dataset.groupKey = groupKey;
    spoilerBtn.addEventListener('click', () => toggleSpoiler(groupKey));
    spoilerBtn.dataset.collapsedLabel = hiddenCount === 1 ? 'Show one more build' : `Show ${hiddenCount} more builds`;
    spoilerBtn.setAttribute('aria-label', spoilerBtn.dataset.collapsedLabel);
    spoilerBtn.setAttribute('aria-expanded', 'false');

    const counterText = document.createElement('span');
    counterText.className = 'spoiler-counter-text';
    counterText.textContent = hiddenCount === 1 ? '+1 build' : `+${hiddenCount} builds`;

    const spoilerIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    spoilerIcon.setAttribute('class', 'spoiler-arrow-icon');
    spoilerIcon.setAttribute('viewBox', '0 0 24 24');
    spoilerIcon.setAttribute('aria-hidden', 'true');

    const spoilerIconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    spoilerIconPath.setAttribute('d', 'M5.41 7.59L4 9l8 8 8-8-1.41-1.41L12 14.17');

    spoilerIcon.appendChild(spoilerIconPath);
    spoilerBtn.appendChild(counterText);
    spoilerBtn.appendChild(spoilerIcon);

    return spoilerBtn;
}
