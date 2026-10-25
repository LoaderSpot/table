import {
    getCurrentVersionFilter,
    isOsTemporarilyUnavailable,
    osVersionFilters,
    resetSizePreload,
    setCurrentVersionFilter,
    state
} from '../state.js';
import { getOrderedArchKeys } from '../data/normalize.js';
import { syncUrlWithState } from '../router/routes.js';
import { reRenderVersions, resetTableLoadingState, startLazyLoading } from './table.js';

let platformCallbacks = {
    loadLinuxPackages: null,
    performSearch: null
};

let platformRenderTimer;

export function setPlatformCallbacks(callbacks) {
    platformCallbacks = {
        ...platformCallbacks,
        ...callbacks
    };
}

export function closeAllOsVersionDropdowns() {
    document.querySelectorAll('.os-version-dropdown').forEach(dropdown => {
        dropdown.style.display = 'none';
        dropdown.classList.remove('dropdown-up');
        const container = dropdown.closest('.os-filter-container');
        container.classList.remove('dropdown-open');
        container.querySelector('.os-version-toggle').setAttribute('aria-expanded', 'false');
    });

    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) {
        tableContainer.style.overflow = '';
    }
}

export function closeAllDropdowns() {
    closeAllOsVersionDropdowns();
}

export function positionOsVersionDropdown(container, dropdown) {
    if (!container || !dropdown) return;

    dropdown.classList.remove('dropdown-up');
    dropdown.style.left = '0px';

    const viewportPadding = 12;
    const viewportWidth = document.documentElement.clientWidth;
    const previousVisibility = dropdown.style.visibility;
    const previousDisplay = dropdown.style.display;

    dropdown.style.visibility = 'hidden';
    dropdown.style.display = 'block';

    const containerRect = container.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    const spaceBelow = window.innerHeight - containerRect.bottom - viewportPadding;
    const spaceAbove = containerRect.top - viewportPadding;

    if (dropdownRect.height > spaceBelow && spaceAbove > spaceBelow) {
        dropdown.classList.add('dropdown-up');
    }

    const left = Math.max(viewportPadding, Math.min(containerRect.left, viewportWidth - dropdownRect.width - viewportPadding));
    dropdown.style.left = `${left - containerRect.left - container.clientLeft}px`;

    dropdown.style.display = previousDisplay;
    dropdown.style.visibility = previousVisibility;
}

function syncVersionFilterUi(os) {
    const container = document.querySelector(`.os-filter-container[data-os="${os}"]`);
    if (!container) return;

    const currentFilter = getCurrentVersionFilter(os);
    const button = container.querySelector('.filter-button');
    const versionLabel = container.querySelector('.os-version-label');
    const filter = osVersionFilters[os].find(item => item.version === currentFilter);
    container.classList.toggle('filter-active', Boolean(currentFilter));
    versionLabel.style.display = currentFilter ? 'inline-flex' : 'none';
    if (currentFilter) updateVersionLabel(versionLabel, filter?.label || currentFilter, os);
    button.title = currentFilter ? `Compatible up to Spotify ${currentFilter}` : '';

    container.querySelectorAll('.os-version-option').forEach(option => {
        const selected = (option.dataset.version || null) === currentFilter;
        option.classList.toggle('selected', selected);
        option.setAttribute('aria-pressed', String(selected));
        option.title = selected ? 'Click to remove version filter' : '';
    });
}

export function updateVersionLabel(versionLabel, label, os) {
    versionLabel.textContent = '';
    const text = document.createElement('span');
    text.textContent = label;
    versionLabel.appendChild(text);
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'os-version-label-close';
    closeBtn.title = 'Remove filter';
    closeBtn.setAttribute('aria-label', 'Remove filter');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', event => {
        event.stopPropagation();
        event.preventDefault();
        clearOsVersionFilter(os);
        document.querySelector(`.filter-button[data-os="${os}"]`)?.focus();
    });
    versionLabel.appendChild(closeBtn);
}

export function clearOsVersionFilter(os) {
    setCurrentVersionFilter(os, null);
    syncVersionFilterUi(os);
    syncUrlWithState();
    reRenderVersions();
}

function openOsVersionDropdown(container, focusOption = false) {
    const dropdown = container.querySelector('.os-version-dropdown');
    closeAllDropdowns();
    activatePlatform(container.dataset.os);
    positionOsVersionDropdown(container, dropdown);
    container.classList.add('dropdown-open');
    dropdown.style.display = 'block';
    container.querySelector('.os-version-toggle').setAttribute('aria-expanded', 'true');
    document.getElementById('tableContainer').style.overflow = 'visible';
    if (focusOption) {
        (dropdown.querySelector('.selected') || dropdown.querySelector('button')).focus();
    }
}

function createVersionOption(os, filter, toggle) {
    const li = document.createElement('li');
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'os-version-option';
    option.dataset.version = filter.version;

    const text = document.createElement('span');
    text.className = 'os-version-option-text';
    const label = document.createElement('span');
    label.textContent = filter.full;
    text.appendChild(label);
    if (filter.name) {
        const name = document.createElement('span');
        name.className = 'os-version-name';
        name.textContent = filter.name;
        text.appendChild(name);
    }
    option.appendChild(text);
    option.addEventListener('click', () => {
        closeAllDropdowns();
        toggle.focus();
        if (getCurrentVersionFilter(os) === filter.version) {
            clearOsVersionFilter(os);
        } else {
            setCurrentVersionFilter(os, filter.version);
            syncVersionFilterUi(os);
            syncUrlWithState();
            reRenderVersions();
        }
    });
    li.appendChild(option);
    return li;
}

export function initOsVersionFilters() {
    document.querySelectorAll('.filter-button').forEach(btn => {
        const os = btn.dataset.os;

        if (os === 'win' || os === 'mac' || os === 'linux') {
            if (btn.closest('.os-filter-container')) return;
            const hasFilters = osVersionFilters[os] && osVersionFilters[os].length > 0;
            const container = document.createElement('div');
            container.className = 'os-filter-container';
            container.setAttribute('data-os', os);
            btn.parentNode.insertBefore(container, btn);
            container.appendChild(btn);
            container.classList.toggle('active', os === state.currentOS);
            btn.type = 'button';
            btn.setAttribute('aria-pressed', String(os === state.currentOS));

            const buttonContent = document.createElement('span');
            buttonContent.className = 'button-content';
            btn.dataset.platformLabel = btn.textContent.trim();
            const platformLabel = document.createElement('span');
            platformLabel.className = 'platform-label';
            platformLabel.textContent = btn.dataset.platformLabel;
            buttonContent.appendChild(btn.querySelector('.os-icon'));
            buttonContent.appendChild(platformLabel);
            btn.textContent = '';
            btn.appendChild(buttonContent);

            const versionLabel = document.createElement('span');
            versionLabel.className = 'os-version-label';
            versionLabel.style.display = 'none';
            container.appendChild(versionLabel);

            if (hasFilters) {
                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'os-version-toggle';
                toggle.setAttribute('aria-label', `${os === 'mac' ? 'macOS' : 'Windows'} compatibility`);
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-controls', `${os}-version-options`);
                const arrow = document.createElement('span');
                arrow.className = 'dropdown-arrow';
                arrow.setAttribute('aria-hidden', 'true');
                toggle.appendChild(arrow);
                container.appendChild(toggle);

                const dropdown = document.createElement('div');
                dropdown.className = 'os-version-dropdown';
                dropdown.id = `${os}-version-options`;
                const heading = document.createElement('div');
                heading.className = 'os-version-heading';
                heading.textContent = `${os === 'mac' ? 'macOS' : 'Windows'} compatibility`;
                dropdown.appendChild(heading);
                container.appendChild(dropdown);

                const ul = document.createElement('ul');
                dropdown.appendChild(ul);

                osVersionFilters[os].forEach(filter => {
                    ul.appendChild(createVersionOption(os, filter, toggle));
                });

                toggle.addEventListener('click', () => {
                    if (toggle.getAttribute('aria-expanded') === 'true') {
                        closeAllDropdowns();
                    } else {
                        openOsVersionDropdown(container);
                    }
                });
                container.addEventListener('keydown', event => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closeAllDropdowns();
                        toggle.focus();
                        return;
                    }
                    if (event.target === toggle && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
                        event.preventDefault();
                        openOsVersionDropdown(container, true);
                    } else if (dropdown.contains(event.target)) {
                        const options = Array.from(dropdown.querySelectorAll('button'));
                        const index = options.indexOf(event.target);
                        let next;
                        if (event.key === 'ArrowDown') next = (index + 1) % options.length;
                        if (event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
                        if (event.key === 'Home') next = 0;
                        if (event.key === 'End') next = options.length - 1;
                        if (next !== undefined) {
                            event.preventDefault();
                            options[next].focus();
                        }
                    }
                });
                container.addEventListener('focusout', event => {
                    if (!container.contains(event.relatedTarget)) closeAllDropdowns();
                });
            }
            syncVersionFilterUi(os);
        }

        if (os === state.currentOS) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('.os-filter-container')) closeAllDropdowns();
    });
    window.addEventListener('resize', closeAllDropdowns);
    window.addEventListener('scroll', () => {
        if (document.querySelector('.os-filter-container.dropdown-open')) closeAllDropdowns();
    }, { passive: true });
}

export function updateArchFilters() {
    const filterPanel = document.querySelector('.filter-panel');
    const archContainer = document.getElementById('arch-filters');

    if (filterPanel) {
        filterPanel.classList.add('hidden');
    }

    setTimeout(() => {
        if (state.currentOS === 'linux' || isOsTemporarilyUnavailable(state.currentOS)) {
            archContainer.innerHTML = '';
            if (filterPanel) {
                filterPanel.classList.add('hidden');
            }
            return;
        }

        archContainer.innerHTML = '';

        const archSet = new Set();
        state.allVersions.forEach(([, data]) => {
            if (data.links[state.currentOS]) {
                getOrderedArchKeys(state.currentOS, data.links[state.currentOS]).forEach(arch => archSet.add(arch));
            }
        });

        let archArr = [];
        if (state.currentOS === 'win') {
            archArr = ['x86', 'x64', 'arm64'].filter(arch => archSet.has(arch));
        } else if (state.currentOS === 'mac') {
            archArr = ['intel', 'arm64'].filter(arch => archSet.has(arch));
        } else {
            archArr = Array.from(archSet).sort();
        }

        archArr.forEach(arch => {
            const btn = document.createElement('button');
            btn.className = 'arch-filter-button' + (state.currentArch === arch ? ' active' : '');
            btn.textContent = arch;
            btn.addEventListener('click', () => {
                state.currentArch = state.currentArch === arch ? 'all' : arch;
                syncUrlWithState();
                updateArchFilters();
                reRenderVersions();
            });
            archContainer.appendChild(btn);
        });

        if (filterPanel) {
            filterPanel.classList.remove('hidden');
        }
    }, 150);
}

export function initPlatformTabs() {
    document.querySelectorAll('.filter-button').forEach(button => {
        button.addEventListener('click', () => {
            closeAllDropdowns();
            activatePlatform(button.dataset.os);
        });
    });
}

function activatePlatform(newOS) {
    document.querySelectorAll('.filter-button').forEach(button => {
        const active = button.dataset.os === newOS;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
        button.closest('.os-filter-container').classList.toggle('active', active);
    });
    if (newOS === state.currentOS) return;

    if (newOS === 'linux' && state.currentArch !== 'all') {
        state.currentArch = 'all';
    }

    state.currentOS = newOS;
    resetSizePreload();
    resetTableLoadingState({ resetOverflow: state.currentSortColumn !== 'size' });

    if (state.currentOS !== 'linux') {
        const availableArch = new Set();
        state.allVersions.forEach(([, data]) => {
            if (data.links[state.currentOS]) {
                getOrderedArchKeys(state.currentOS, data.links[state.currentOS]).forEach(arch => availableArch.add(arch));
            }
        });
        if (!availableArch.has(state.currentArch)) {
            state.currentArch = 'all';
        }
    }

    const container = document.getElementById('versions-container');
    container.style.opacity = '0';

    updateArchFilters();
    syncUrlWithState();

    clearTimeout(platformRenderTimer);
    platformRenderTimer = setTimeout(() => {
        if (state.currentOS === 'linux' && !state.linuxDataLoaded) {
            platformCallbacks.loadLinuxPackages?.();
        } else if (state.currentSearchTerm !== '') {
            platformCallbacks.performSearch?.(state.currentSearchTerm);
        } else {
            state.currentSearchResults = null;
            startLazyLoading();
        }
    }, 300);
}
