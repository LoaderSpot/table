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

    const viewportPadding = 12;
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

    dropdown.style.display = previousDisplay;
    dropdown.style.visibility = previousVisibility;
}

export function toggleOsVersionFilter(os, version, label, listItem) {
    const container = listItem.closest('.os-filter-container');
    const versionLabel = container.querySelector('.os-version-label');
    const allItems = container.querySelectorAll('li');
    let currentFilter = getCurrentVersionFilter(os);

    if (currentFilter === version) {
        currentFilter = null;
        versionLabel.style.display = 'none';
        listItem.classList.remove('selected');
        container.classList.remove('filter-active');
    } else {
        currentFilter = version;
        updateVersionLabel(versionLabel, label, os);
        versionLabel.style.display = 'block';
        container.classList.add('filter-active');

        allItems.forEach(item => item.classList.remove('selected'));
        listItem.classList.add('selected');
    }

    setCurrentVersionFilter(os, currentFilter);
    syncUrlWithState();
    reRenderVersions();
}

export function updateVersionLabel(versionLabel, label, os) {
    versionLabel.innerHTML = `${label}<button class="os-version-label-close" title="Remove filter">×</button>`;

    const closeBtn = versionLabel.querySelector('.os-version-label-close');
    closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        clearOsVersionFilter(os);
    });
}

export function clearOsVersionFilter(os) {
    setCurrentVersionFilter(os, null);

    const container = document.querySelector(`.os-filter-container[data-os="${os}"]`);
    if (container) {
        const versionLabel = container.querySelector('.os-version-label');
        const allItems = container.querySelectorAll('li');

        if (versionLabel) versionLabel.style.display = 'none';
        allItems.forEach(item => item.classList.remove('selected'));
        container.classList.remove('filter-active');
    }

    syncUrlWithState();
    reRenderVersions();
}

export function initOsVersionFilters() {
    document.querySelectorAll('.filter-button').forEach(btn => {
        const os = btn.dataset.os;

        if (os === 'win' || os === 'mac' || os === 'linux') {
            const hasFilters = osVersionFilters[os] && osVersionFilters[os].length > 0;
            const container = document.createElement('div');
            container.className = 'os-filter-container';
            container.setAttribute('data-os', os);
            btn.parentNode.insertBefore(container, btn);
            container.appendChild(btn);

            const buttonContent = document.createElement('span');
            buttonContent.className = 'button-content';

            while (btn.firstChild) {
                buttonContent.appendChild(btn.firstChild);
            }
            btn.appendChild(buttonContent);

            if (hasFilters) {
                const dropdownWrapper = document.createElement('span');
                dropdownWrapper.className = 'dropdown-wrapper';
                dropdownWrapper.style.pointerEvents = 'none';

                const arrow = document.createElement('span');
                arrow.className = 'dropdown-arrow';
                arrow.innerHTML = '▼';
                dropdownWrapper.appendChild(arrow);
                btn.appendChild(dropdownWrapper);
            }

            const versionLabel = document.createElement('span');
            versionLabel.className = 'os-version-label';
            versionLabel.style.display = 'none';
            container.appendChild(versionLabel);

            if (hasFilters) {
                const dropdown = document.createElement('div');
                dropdown.className = 'os-version-dropdown';
                container.appendChild(dropdown);

                const ul = document.createElement('ul');
                dropdown.appendChild(ul);

                osVersionFilters[os].forEach(filter => {
                    const li = document.createElement('li');
                    li.textContent = filter.full;
                    li.dataset.version = filter.version;
                    li.addEventListener('click', e => {
                        e.stopPropagation();
                        toggleOsVersionFilter(os, filter.version, filter.label, li);
                        dropdown.style.display = 'none';
                    });
                    ul.appendChild(li);
                });

                const currentVersionFilter = getCurrentVersionFilter(os);
                if (currentVersionFilter) {
                    const matchingFilter = osVersionFilters[os].find(filter => filter.version === currentVersionFilter);
                    if (matchingFilter) {
                        const matchingLi = ul.querySelector(`li[data-version="${currentVersionFilter}"]`);
                        if (matchingLi) {
                            matchingLi.classList.add('selected');
                            updateVersionLabel(versionLabel, matchingFilter.label, os);
                            versionLabel.style.display = 'block';
                            container.classList.add('filter-active');
                        }
                    } else {
                        updateVersionLabel(versionLabel, currentVersionFilter, os);
                        versionLabel.style.display = 'block';
                        container.classList.add('filter-active');
                    }
                }
            }

            const currentVersionFilter = getCurrentVersionFilter(os);
            if (currentVersionFilter && !hasFilters) {
                updateVersionLabel(versionLabel, currentVersionFilter, os);
                versionLabel.style.display = 'block';
                container.classList.add('filter-active');
            }

            if (hasFilters) {
                btn.addEventListener('click', e => {
                    const isActive = btn.classList.contains('active');
                    if (!isActive) {
                        e.preventDefault();
                        btn.classList.add('active');
                        btn.click();
                        return;
                    }

                    const wrapper = btn.querySelector('.dropdown-wrapper');
                    if (wrapper && e.clientX >= wrapper.getBoundingClientRect().left) {
                        e.stopPropagation();
                        const dropdown = container.querySelector('.os-version-dropdown');
                        if (dropdown.style.display === 'block') {
                            dropdown.style.display = 'none';
                        } else {
                            closeAllDropdowns();
                            positionOsVersionDropdown(container, dropdown);
                            const tableContainer = document.getElementById('tableContainer');
                            if (tableContainer) {
                                tableContainer.style.overflow = 'visible';
                            }
                            dropdown.style.display = 'block';
                        }
                    }
                });
            }
        }

        if (os === state.currentOS) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.addEventListener('click', closeAllDropdowns);
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
            document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const newOS = button.dataset.os;
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

            setTimeout(() => {
                if (state.currentOS === 'linux' && !state.linuxDataLoaded) {
                    platformCallbacks.loadLinuxPackages?.();
                } else if (state.currentSearchTerm !== '') {
                    platformCallbacks.performSearch?.(state.currentSearchTerm);
                } else {
                    state.currentSearchResults = null;
                    startLazyLoading();
                }
            }, 300);
        });
    });
}
