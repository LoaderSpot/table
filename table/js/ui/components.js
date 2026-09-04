import { state } from '../state.js';
import { linkMetaCache, updateLinkInfo } from '../data/meta.js';
import { copyTextToClipboard } from '../utils/clipboard.js';
import { highlight } from '../utils/version.js';
import { createCommentButton } from './comments.js';

const spoilerAnimations = new WeakMap();
const collapsedCellFrame = { height: '0px', opacity: '0', paddingTop: '0px', paddingBottom: '0px' };

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

    // Capture the current frame before cancelling an interrupted animation
    previousAnimations?.forEach(animation => animation.cancel());
    spoilerAnimations.delete(toggleButton);
    toggleButton.classList.toggle('expanded', expanded);

    spoilerRows.forEach(row => {
        row.style.display = '';
        row.classList.toggle('visible', expanded);
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
    const animations = frames.map(({ wrapper, from, to }) => wrapper.animate([from, to], {
        duration: 260,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'both'
    }));

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
        paddingBottom: style.paddingBottom
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
}

export function createSpoiler(groupKey, hiddenCount) {
    const spoilerBtn = document.createElement('span');
    spoilerBtn.className = 'spoiler-toggle';
    spoilerBtn.title = (state.currentSortColumn === 'version' && !state.sortVersionAscending) ? 'Show older builds' : 'Show builds';
    spoilerBtn.dataset.groupKey = groupKey;
    spoilerBtn.addEventListener('click', () => toggleSpoiler(groupKey));
    spoilerBtn.setAttribute('aria-label', hiddenCount === 1 ? 'Show one more build' : `Show ${hiddenCount} more builds`);

    const counterText = document.createElement('span');
    counterText.className = 'spoiler-counter-text';
    counterText.textContent = hiddenCount === 1 ? '+1 build' : `+${hiddenCount} builds`;

    const spoilerIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    spoilerIcon.setAttribute('class', 'spoiler-arrow-icon');
    spoilerIcon.setAttribute('viewBox', '0 0 24 24');

    const spoilerIconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    spoilerIconPath.setAttribute('d', 'M5.41 7.59L4 9l8 8 8-8-1.41-1.41L12 14.17');

    spoilerIcon.appendChild(spoilerIconPath);
    spoilerBtn.appendChild(counterText);
    spoilerBtn.appendChild(spoilerIcon);

    return spoilerBtn;
}
