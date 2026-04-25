import { state } from '../state.js';
import { syncUrlWithState } from '../router/routes.js';
import { compareVersions, parseSizeToBytes } from '../utils/version.js';

let renderCallback = null;

export function setRenderCallback(callback) {
    renderCallback = callback;
}

export function getSortMultiplier() {
    if (state.currentSortColumn === 'size') {
        return state.sortSizeAscending ? 1 : -1;
    }

    return state.sortVersionAscending ? 1 : -1;
}

export function versionCompare(v1, v2) {
    return getSortMultiplier() * compareVersions(v1, v2);
}

export function sizeCompare(size1, size2) {
    const bytes1 = parseSizeToBytes(size1);
    const bytes2 = parseSizeToBytes(size2);
    const diff = bytes1 - bytes2;
    return getSortMultiplier() * (diff === 0 ? 0 : (diff > 0 ? 1 : -1));
}

export function updateSortUI() {
    const versionArrow = document.getElementById('sortArrow');
    const sizeArrow = document.getElementById('sizeSortArrow');
    const versionControl = document.getElementById('versionSortControl');
    const sizeControl = document.getElementById('sizeSortControl');
    const isSearchActive = state.currentSearchTerm && state.currentSearchTerm.trim() !== '';

    if (isSearchActive) {
        if (versionArrow) versionArrow.style.display = 'none';
        if (sizeArrow) sizeArrow.style.display = 'none';
        if (versionControl) {
            versionControl.style.pointerEvents = 'none';
            versionControl.style.cursor = 'default';
        }
        if (sizeControl) {
            sizeControl.style.pointerEvents = 'none';
            sizeControl.style.cursor = 'default';
        }
        return;
    }

    if (versionArrow) versionArrow.style.display = '';
    if (sizeArrow) sizeArrow.style.display = '';
    if (versionControl) {
        versionControl.style.pointerEvents = '';
        versionControl.style.cursor = 'pointer';
    }
    if (sizeControl) {
        sizeControl.style.pointerEvents = '';
        sizeControl.style.cursor = 'pointer';
    }

    if (versionArrow) {
        const versionSvg = versionArrow.querySelector('svg');
        if (versionSvg) {
            if (state.currentSortColumn === 'version') {
                versionArrow.style.opacity = '1';
                versionSvg.style.transform = state.sortVersionAscending ? 'rotate(180deg)' : 'rotate(0deg)';
            } else {
                versionArrow.style.opacity = '0';
            }
        }
    }

    if (sizeArrow) {
        const sizeSvg = sizeArrow.querySelector('svg');
        if (sizeSvg) {
            if (state.currentSortColumn === 'size') {
                sizeArrow.style.opacity = '1';
                sizeSvg.style.transform = state.sortSizeAscending ? 'rotate(180deg)' : 'rotate(0deg)';
            } else {
                sizeArrow.style.opacity = '0';
            }
        }
    }
}

export function toggleVersionSort() {
    if (state.currentSearchTerm && state.currentSearchTerm.trim() !== '') return;

    if (state.currentSortColumn !== 'version') {
        state.currentSortColumn = 'version';
    } else {
        state.sortVersionAscending = !state.sortVersionAscending;
    }

    updateSortUI();
    syncUrlWithState();
    renderCallback?.();
}

export function toggleSizeSort() {
    if (state.currentSearchTerm && state.currentSearchTerm.trim() !== '') return;

    if (state.currentSortColumn !== 'size') {
        state.currentSortColumn = 'size';
        state.sortSizeAscending = true;
    } else if (state.sortSizeAscending) {
        state.sortSizeAscending = false;
    } else {
        state.currentSortColumn = 'version';
        state.sortVersionAscending = false;
    }

    updateSortUI();
    syncUrlWithState();
    renderCallback?.();
}

function bindSortControl(control, handler) {
    if (!control) return;

    control.addEventListener('click', handler);
    control.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler();
        }
    });
}

export function initSortControls() {
    bindSortControl(document.getElementById('versionSortControl'), toggleVersionSort);
    bindSortControl(document.getElementById('sizeSortControl'), toggleSizeSort);
    updateSortUI();
}
