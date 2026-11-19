import { state } from '../state.js';
import { copyTextToClipboard } from '../utils/clipboard.js';
import { highlight } from '../utils/version.js';
import { createCommentButton } from './comments.js';

const familyOrigins = new Map();
const dirtyOrigins = new Set();
let familyObserver;
let originFrame = null;

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

function syncFamilyOrigins() {
    originFrame = null;
    const positions = [];
    for (const row of dirtyOrigins) {
        const origin = familyOrigins.get(row);
        if (!origin || !row.isConnected) continue;
        const rect = origin.short.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        positions.push({
            row, cell: origin.cell,
            top: center - row.getBoundingClientRect().top,
            inset: center - origin.cell.getBoundingClientRect().top
        });
    }
    dirtyOrigins.clear();
    for (const { row, cell, top, inset } of positions) {
        row.style.setProperty('--build-root-top', `${top}px`);
        cell.style.setProperty('--build-root-inset', `${inset}px`);
    }
}

function observeFamilyOrigin(row) {
    if (!row || familyOrigins.has(row)) return;
    const short = row.querySelector('.short-version');
    const cell = row.querySelector('.version-cell');
    familyOrigins.set(row, { short, cell });
    familyObserver ??= new ResizeObserver(entries => {
        for (const { target } of entries) {
            const owner = target.closest('tr');
            if (familyOrigins.has(owner)) dirtyOrigins.add(owner);
        }
        if (dirtyOrigins.size && originFrame === null) originFrame = requestAnimationFrame(syncFamilyOrigins);
    });
    familyObserver.observe(row);
    familyObserver.observe(short);
}

function unobserveFamilyOrigin(row) {
    const origin = familyOrigins.get(row);
    if (!origin) return;
    familyObserver.unobserve(row);
    familyObserver.unobserve(origin.short);
    familyOrigins.delete(row);
    dirtyOrigins.delete(row);
}

export function resetFamilyOrigins() {
    familyObserver?.disconnect();
    familyOrigins.clear();
    dirtyOrigins.clear();
    if (originFrame !== null) cancelAnimationFrame(originFrame);
    originFrame = null;
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

function createRevealStage(parent, children) {
    const mainTable = parent.closest('table');
    const widths = Array.from(mainTable.tHead.rows[0].cells, cell => cell.getBoundingClientRect().width);
    const total = widths.reduce((sum, width) => sum + width, 0);
    const table = document.createElement('table');
    table.className = 'version-table build-reveal-table';
    if (total) {
        const columns = document.createElement('colgroup');
        for (const width of widths) {
            const col = document.createElement('col');
            col.style.width = `${width / total * 100}%`;
            columns.appendChild(col);
        }
        table.appendChild(columns);
    }
    const clip = document.createElement('div');
    clip.className = 'build-reveal-clip';
    const content = document.createElement('div');
    content.className = 'build-reveal-content';
    content.appendChild(table);
    clip.appendChild(content);
    const row = document.createElement('tr');
    row.className = 'build-reveal-row';
    const cell = row.insertCell();
    cell.colSpan = widths.length;
    cell.appendChild(clip);
    table.createTBody().append(...children);
    parent.after(row);
    return { row, clip };
}

export function connectBuildFamily(parents, button, key, initiallyExpanded, createChildren) {
    const lastParent = parents.at(-1);
    let children = null;
    let lastOrigin;
    let stage = null;
    let animation = null;
    let expanded = initiallyExpanded;

    function updateControls() {
        button.classList.toggle('expanded', expanded);
        button.setAttribute('aria-expanded', String(expanded));
        button.setAttribute('aria-label', expanded ? 'Hide additional builds' : button.dataset.collapsedLabel);
        button.title = expanded ? 'Hide additional builds' : button.dataset.collapsedTitle;
        for (const parent of parents) parent.classList.toggle('build-family-open', expanded);
    }

    function mountChildren() {
        if (children) return;
        children = createChildren();
        lastOrigin = children.find(row => row.classList.contains('build-branch-last') && row.querySelector('.version-cell'));
        observeFamilyOrigin(parents[0]);
        observeFamilyOrigin(lastOrigin);
    }

    function settle() {
        if (expanded) {
            if (stage) {
                const focused = document.activeElement;
                const restoreFocus = focused && stage.row.contains(focused);
                stage.row.replaceWith(...children);
                if (restoreFocus) focused.focus({ preventScroll: true });
            } else {
                lastParent.after(...children);
            }
        } else {
            unobserveFamilyOrigin(parents[0]);
            unobserveFamilyOrigin(lastOrigin);
            if (stage) stage.row.remove();
            else children.forEach(row => row.remove());
            children = null;
            lastOrigin = null;
        }
        stage = null;
    }

    for (const parent of parents) {
        parent.dataset.buildFamily = key;
        parent.classList.add('build-family-parent');
    }
    updateControls();
    if (expanded) {
        mountChildren();
        settle();
    }

    button.addEventListener('click', () => {
        expanded = !expanded;
        updateControls();
        mountChildren();
        for (const row of children) row.inert = !expanded;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion || !button.animate) {
            animation?.cancel();
            animation = null;
            settle();
            return;
        }

        // Opacity and the grid track use the same easing during a reversal
        const from = stage ? getComputedStyle(stage.clip).opacity : (expanded ? '0' : '1');
        animation?.cancel();
        stage ??= createRevealStage(lastParent, children);
        const to = expanded ? '1' : '0';
        const current = stage.clip.animate([
            { gridTemplateRows: `${from}fr`, opacity: from },
            { gridTemplateRows: `${to}fr`, opacity: to }
        ], {
            duration: expanded ? 280 : 220,
            easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
            fill: 'both'
        });
        animation = current;
        current.finished.then(() => {
            if (current !== animation) return;
            settle();
            current.cancel();
            animation = null;
        }, () => {});
    });
}

export function addBuildBranch(row) {
    const versionCell = row.querySelector('.version-cell');
    const carrier = versionCell || row.querySelector('.arch-cell');
    const tree = document.createElement('span');
    tree.className = 'build-tree';
    tree.setAttribute('aria-hidden', 'true');
    const stem = document.createElement('span');
    stem.className = 'build-tree-stem';
    tree.appendChild(stem);
    if (versionCell) {
        const wrapper = document.createElement('div');
        wrapper.className = 'cell-wrapper';
        wrapper.appendChild(versionCell.firstChild);
        versionCell.appendChild(wrapper);
        const junction = document.createElement('span');
        junction.className = 'build-tree-junction';
        junction.setAttribute('aria-hidden', 'true');
        versionCell.querySelector('.version-line-top').appendChild(junction);
    }
    carrier.appendChild(tree);
}

export function createSpoiler(groupKey, hiddenCount) {
    const spoilerBtn = document.createElement('button');
    spoilerBtn.type = 'button';
    spoilerBtn.className = 'spoiler-toggle';
    spoilerBtn.title = (state.currentSortColumn === 'version' && !state.sortVersionAscending) ? 'Show older builds' : 'Show builds';
    spoilerBtn.dataset.groupKey = groupKey;
    spoilerBtn.dataset.collapsedTitle = spoilerBtn.title;
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
