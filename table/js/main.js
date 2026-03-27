const urlParams = new URLSearchParams(window.location.search);
let currentArch = urlParams.get('arch') || 'all';
let currentOS = urlParams.get('os') || 'win';
let currentSearchTerm = urlParams.get('search') || '';
let currentWinVersionFilter = urlParams.get('winVersion') || null;
let currentMacVersionFilter = urlParams.get('macVersion') || null;
let currentLinuxVersionFilter = urlParams.get('linuxVersion') || null;
let sortVersionAscending = urlParams.get('sortVersion') === 'asc' || (urlParams.get('sortVersion') === null && urlParams.get('sort') === 'asc');
let sortSizeAscending = urlParams.get('sortSize') === 'asc';
let currentSortColumn = urlParams.get('sortSize') !== null ? 'size' : 'version';

if (currentSearchTerm) {
    sortVersionAscending = false;
    sortSizeAscending = false;
    currentSortColumn = 'version';
}

if (urlParams.get('sort') && !urlParams.get('sortVersion') && !urlParams.get('sortSize')) {
    sortVersionAscending = urlParams.get('sort') === 'asc';
}

const osVersionFilters = {
    win: [
        { version: '1.2.5.1006', label: '7-8.1', full: 'Windows 7-8.1' }
    ],
    mac: [
        { version: '1.2.66.447', label: '11.x', full: 'macOS 11' },
        { version: '1.2.37.701', label: '10.15', full: 'macOS 10.15' },
        { version: '1.2.20.1218', label: '10.14/10.13', full: 'macOS 10.14 / 10.13' }
        //   { version: '1.1.89.862', label: '10.12/10.11', full: 'macOS 10.12 / OS X 10.11' }
    ],
    linux: [
        // { version: '1.2.40.651', label: 'Latest', full: 'Latest stable' }
    ]
};

const temporarilyUnavailableOs = new Set();

function isOsTemporarilyUnavailable(os) {
    return temporarilyUnavailableOs.has(os);
}

function getOsDisplayName(os) {
    if (os === 'win') return 'Windows';
    if (os === 'mac') return 'macOS';
    if (os === 'linux') return 'Linux';
    return os;
}

function closeAllOsVersionDropdowns() {
    document.querySelectorAll('.os-version-dropdown').forEach(dd => {
        dd.style.display = 'none';
        dd.classList.remove('dropdown-up');
    });

    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) {
        tableContainer.style.overflow = '';
    }
}

function closeAllDropdowns() {
    closeAllOsVersionDropdowns();
}

function positionOsVersionDropdown(container, dropdown) {
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

// обновляем активную вкладку в ui при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
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
                    li.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleOsVersionFilter(os, filter.version, filter.label, li);
                        dropdown.style.display = 'none';
                    });
                    ul.appendChild(li);
                });

                // восстанавливаем состояние фильтра версий из параметров URL
                const currentVersionFilter = os === 'win' ? currentWinVersionFilter :
                    os === 'mac' ? currentMacVersionFilter : currentLinuxVersionFilter;
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

            const currentVersionFilter = os === 'win' ? currentWinVersionFilter :
                os === 'mac' ? currentMacVersionFilter : currentLinuxVersionFilter;
            if (currentVersionFilter && !hasFilters) {
                updateVersionLabel(versionLabel, currentVersionFilter, os);
                versionLabel.style.display = 'block';
                container.classList.add('filter-active');
            }

            if (hasFilters) {
                btn.addEventListener('click', function (e) {
                    const isActive = btn.classList.contains('active');
                    if (!isActive) {
                        e.preventDefault();
                        btn.classList.add('active');
                        btn.click();
                        return;
                    }
                    const rect = btn.getBoundingClientRect();
                    const wrapper = btn.querySelector('.dropdown-wrapper');
                    if (wrapper) {
                        const wrapperRect = wrapper.getBoundingClientRect();
                        const clickX = e.clientX;
                        if (clickX >= wrapperRect.left) {
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
                    }
                });

                const dropdown = container.querySelector('.os-version-dropdown');
                document.addEventListener('click', () => {
                    closeAllDropdowns();
                });
            }
        }

        if (os === currentOS) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
});

function toggleOsVersionFilter(os, version, label, listItem) {
    const container = listItem.closest('.os-filter-container');
    const versionLabel = container.querySelector('.os-version-label');
    const allItems = container.querySelectorAll('li');

    let currentFilter = os === 'win' ? currentWinVersionFilter :
        os === 'mac' ? currentMacVersionFilter : currentLinuxVersionFilter;

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

    if (os === 'win') {
        currentWinVersionFilter = currentFilter;
    } else if (os === 'mac') {
        currentMacVersionFilter = currentFilter;
    } else {
        currentLinuxVersionFilter = currentFilter;
    }

    syncUrlWithState();
    reRenderVersions();
}

// обновление плашки версии с кнопкой закрытия
function updateVersionLabel(versionLabel, label, os) {
    versionLabel.innerHTML = `${label}<button class="os-version-label-close" title="Remove filter">×</button>`;

    const closeBtn = versionLabel.querySelector('.os-version-label-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        clearOsVersionFilter(os);
    });
}

function clearOsVersionFilter(os) {
    if (os === 'win') {
        currentWinVersionFilter = null;
    } else if (os === 'mac') {
        currentMacVersionFilter = null;
    } else if (os === 'linux') {
        currentLinuxVersionFilter = null;
    }

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

// функция отображения тоста
function showToast(message, duration = 2000, type = null) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = String(message).replace(/\n/g, '<br>');
    let bg = "";
    let fg = "";
    if (type === "error") {
        bg = "#6f1611";
        fg = "#fff";
    } else if (type === "success") {
        bg = "#1db954";
        fg = "#000000";
    } else {
        bg = "#333";
        fg = "#fff";
    }
    toast.style.background = bg;
    toast.style.color = fg;
    toast.style.textAlign = "center";
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.style.background = "";
            toast.style.color = "";
            toast.style.textAlign = "";
        }, 300);
    }, duration);
}

// функция fallback для копирования текста
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showToast('Copied to clipboard');
    } catch (err) {
        showToast('Error while copying');
        console.error('Error while copying:', err);
    }
    document.body.removeChild(textArea);
}

// универсальная функция для копирования текста в буфер обмена
async function copyTextToClipboard(text, successMessage = 'Copied to clipboard') {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showToast(successMessage);
        } else {
            fallbackCopyTextToClipboard(text);
        }
    } catch (err) {
        console.error('Error while copying:', err);
        fallbackCopyTextToClipboard(text);
    }
}

// кэш метаданных ссылок на скачивание: дата и размер
const linkMetaCache = new Map();

// до инициализации данных обновления ячеек складываем в очередь
let linkMetaQueueStarted = false;

// очередь отложенных обновлений ячеек с метаданными
const pendingLinkMetaUpdates = [];

// применяем все накопленные обновления после инициализации данных
function flushPendingLinkMetaUpdates() {
    if (linkMetaQueueStarted) return;

    linkMetaQueueStarted = true;

    for (const request of pendingLinkMetaUpdates) {
        applyCachedLinkMeta(request.dateCell, request.sizeCell, request.url);
    }
    pendingLinkMetaUpdates.length = 0;
}

// обновляем ячейки даты и размера сразу или откладываем до готовности данных
function updateLinkInfo(dateCell, sizeCell, url, isVisible = true) {
    if (!isVisible) {
        return;
    }

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

// функция для форматирования даты в формат DD.MM.YYYY
function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return String(date.getDate()).padStart(2, '0') + '.' +
        String(date.getMonth() + 1).padStart(2, '0') + '.' +
        date.getFullYear();
}

// функция для форматирования размера в MB
function formatSize(sizeInBytes) {
    const bytes = Number(sizeInBytes);
    if (!Number.isFinite(bytes) || bytes <= 0) return '—';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function normalizeMetaDate(dateValue) {
    if (!dateValue) return '—';
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(dateValue))) {
        return String(dateValue);
    }
    return formatDate(dateValue);
}

function normalizeMetaSize(sizeValue) {
    if (sizeValue == null || sizeValue === '') return '—';
    if (typeof sizeValue === 'number' || /^\d+$/.test(String(sizeValue))) {
        return formatSize(sizeValue);
    }
    return String(sizeValue);
}

const supportedPlatforms = ['win', 'mac', 'linux'];
const architectureOrder = {
    win: ['x86', 'x64', 'arm64'],
    mac: ['intel', 'arm64'],
    linux: ['amd64']
};

function getOrderedArchKeys(os, archMap) {
    if (!archMap || typeof archMap !== 'object') return [];

    const keys = Object.keys(archMap);
    const preferred = architectureOrder[os] || [];
    const ordered = preferred.filter(arch => keys.includes(arch));
    const remaining = keys.filter(arch => !preferred.includes(arch)).sort();

    return [...ordered, ...remaining];
}

function getOrderedArchEntries(os, archMap) {
    return getOrderedArchKeys(os, archMap).map(arch => [arch, archMap[arch]]);
}

function compareArchNames(os, left, right) {
    const preferred = architectureOrder[os] || [];
    const leftIndex = preferred.indexOf(left);
    const rightIndex = preferred.indexOf(right);
    const normalizedLeft = leftIndex === -1 ? preferred.length + 100 : leftIndex;
    const normalizedRight = rightIndex === -1 ? preferred.length + 100 : rightIndex;

    if (normalizedLeft !== normalizedRight) {
        return normalizedLeft - normalizedRight;
    }

    return left.localeCompare(right);
}

function normalizeVersionEntry(versionData) {
    const normalized = {
        fullversion: versionData?.fullversion || '',
        links: {},
        meta: {}
    };

    supportedPlatforms.forEach(os => {
        const compactEntries = versionData?.[os];
        const legacyLinks = versionData?.links?.[os];
        const source = compactEntries && typeof compactEntries === 'object'
            ? compactEntries
            : legacyLinks && typeof legacyLinks === 'object'
                ? legacyLinks
                : null;

        if (!source) return;

        getOrderedArchEntries(os, source).forEach(([arch, value]) => {
            let url = null;
            let date = null;
            let size = null;

            if (typeof value === 'string') {
                url = value;
                date = versionData?.meta?.[os]?.[arch]?.date ?? null;
                size = versionData?.meta?.[os]?.[arch]?.size ?? null;
            } else if (value && typeof value === 'object') {
                url = value.url || versionData?.links?.[os]?.[arch] || null;
                date = value.date ?? versionData?.meta?.[os]?.[arch]?.date ?? null;
                size = value.size ?? versionData?.meta?.[os]?.[arch]?.size ?? null;
            }

            if (!url) return;

            if (!normalized.links[os]) normalized.links[os] = {};
            if (!normalized.meta[os]) normalized.meta[os] = {};

            normalized.links[os][arch] = url;
            normalized.meta[os][arch] = {
                date: normalizeMetaDate(date),
                size: normalizeMetaSize(size)
            };
        });
    });

    return normalized;
}

function normalizeVersionsData(data) {
    return Object.fromEntries(
        Object.entries(data || {}).map(([versionKey, versionData]) => [versionKey, normalizeVersionEntry(versionData)])
    );
}

function getLinkMeta(versionData, os, arch) {
    const meta = versionData?.meta?.[os]?.[arch] || {};
    return {
        date: normalizeMetaDate(meta.date),
        size: normalizeMetaSize(meta.size)
    };
}

function primeMetadataCache(data) {
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

function buildLinuxVersionsData(data) {
    return Object.entries(data)
        .filter(([, versionData]) => versionData?.links?.linux)
        .map(([versionKey, versionData]) => {
            const architectures = getOrderedArchEntries('linux', versionData.links.linux)
                .filter(([, link]) => !!link)
                .map(([arch, link]) => {
                    const meta = getLinkMeta(versionData, 'linux', arch);
                    return {
                        arch,
                        link,
                        date: meta.date,
                        size: meta.size
                    };
                });

            return {
                version: {
                    short: versionKey,
                    full: versionData.fullversion
                },
                architectures
            };
        })
        .filter(version => version.architectures.length > 0);
}

// применяем закэшированные метаданные ссылки к ячейкам таблицы
function applyCachedLinkMeta(dateCell, sizeCell, url) {
    const dateCellTarget = dateCell.querySelector('.cell-wrapper') || dateCell;
    const sizeCellTarget = sizeCell.querySelector('.cell-wrapper') || sizeCell;

    const cached = linkMetaCache.get(url) || { date: '—', size: '—' };
    if (!linkMetaCache.has(url)) {
        linkMetaCache.set(url, cached);
    }

    dateCellTarget.textContent = cached.date;
    sizeCellTarget.textContent = cached.size;
}

async function preloadSizesForSorting(dataSource) {
    const linksToPrime = [];

    dataSource.forEach(([versionKey, versionData]) => {
        if (!versionData.links[currentOS]) return;

        getOrderedArchKeys(currentOS, versionData.links[currentOS]).forEach(arch => {
            if (currentArch !== 'all' && arch !== currentArch) return;

            const link = versionData.links[currentOS][arch];
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

// функция для генерации ключа счетчика
const generateCounterKey = (version, os, arch) => `${version}-${os}-${arch}`;

// глобальные переменные для хранения данных
let allDownloadCounters = {};
let commentCountCache = {};
let countersLoaded = false;
let commentCountsLoaded = false;
const pendingCounterElements = new Map();
const MIN_UPDATE_INTERVAL = 10000; // минимальный интервал между обновлениями (10 секунд)
let lastDataUpdate = 0;
const ALL_DATA_BACKGROUND_RETRY_DELAY_MS = 5000;
let allDataBackgroundRetryTimeoutId = null;

function buildVersionCommentKey(version) {
    return `spotify-version-${version}`;
}

function clearAllDataBackgroundRetry() {
    if (allDataBackgroundRetryTimeoutId) {
        clearTimeout(allDataBackgroundRetryTimeoutId);
        allDataBackgroundRetryTimeoutId = null;
    }
}

function scheduleAllDataBackgroundRetry() {
    clearAllDataBackgroundRetry();
    allDataBackgroundRetryTimeoutId = setTimeout(() => {
        allDataBackgroundRetryTimeoutId = null;
        loadAllData(true, false).catch(err => {
            console.warn('Background all-data retry failed:', err);
        });
    }, ALL_DATA_BACKGROUND_RETRY_DELAY_MS);
}

function getAllDataResponseState(response, data, commentsOnly) {
    const rawErrors = data && typeof data === 'object' && data.errors && typeof data.errors === 'object'
        ? data.errors
        : null;
    const xError = String(response?.headers?.get?.('X-Error') || '').trim().toLowerCase();
    const headerIndicatesPartial = xError === 'partial' || xError === 'timeout';
    const hasExplicitDownloadsFlag = Boolean(rawErrors && Object.prototype.hasOwnProperty.call(rawErrors, 'downloads'));
    const hasExplicitCommentsFlag = Boolean(rawErrors && Object.prototype.hasOwnProperty.call(rawErrors, 'comments'));
    const downloadsFailed = !commentsOnly && (hasExplicitDownloadsFlag ? Boolean(rawErrors.downloads) : headerIndicatesPartial);
    const commentsFailed = hasExplicitCommentsFlag ? Boolean(rawErrors.comments) : headerIndicatesPartial;

    return {
        downloadsFailed,
        commentsFailed
    };
}

// функция для получения всех данных одним запросом
async function loadAllData(forceUpdate = false, commentsOnly = false) {
    const requestedDataLoaded = commentsOnly
        ? commentCountsLoaded
        : (countersLoaded && commentCountsLoaded);

    // если запрашиваются только комментарии, проверяем только флаг загрузки комментариев
    if (commentsOnly && commentCountsLoaded && !forceUpdate) {
        return { comments: commentCountCache };
    }

    // для полного запроса проверяем оба флага
    if (!commentsOnly && countersLoaded && commentCountsLoaded && !forceUpdate) {
        clearAllDataBackgroundRetry();
        return { downloads: allDownloadCounters, comments: commentCountCache };
    }

    try {
        const now = Date.now();
        if (now - lastDataUpdate < MIN_UPDATE_INTERVAL && !forceUpdate) {
            return commentsOnly ? { comments: commentCountCache } :
                { downloads: allDownloadCounters, comments: commentCountCache };
        }
        lastDataUpdate = now;

        // добавляем параметр для запроса только комментариев при необходимости
        const workerUrl = `https://broad-pine-bbc0.amd64fox1.workers.dev/all-data${commentsOnly ? '?comments-only=1' : ''}`;

        let lastError;
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);

                const response = await fetch(workerUrl, {
                    signal: controller.signal,
                    cache: 'no-store'
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const data = await response.json();
                const responseState = getAllDataResponseState(response, data, commentsOnly);
                const downloadsPayloadValid = !commentsOnly && data && data.downloads && typeof data.downloads === 'object';
                const commentsPayloadValid = data && Array.isArray(data.comments);
                const downloadsSucceeded = commentsOnly
                    ? false
                    : (!responseState.downloadsFailed && downloadsPayloadValid);
                const commentsSucceeded = !responseState.commentsFailed && commentsPayloadValid;
                const requestedSectionFailed = commentsOnly
                    ? !commentsSucceeded
                    : (!downloadsSucceeded || !commentsSucceeded);

                if (!commentsOnly && downloadsSucceeded) {
                    allDownloadCounters = data.downloads;
                    countersLoaded = true;

                    pendingCounterElements.forEach((counterInfo, counterKey) => {
                        const count = allDownloadCounters[counterKey] || "0";
                        counterInfo.element.innerHTML = count === "0" ? "" :
                            `<span class="download-counter">${formatDownloadCount(count)}</span>`;
                    });
                    pendingCounterElements.clear();

                    flushPendingLinkMetaUpdates();
                }

                if (commentsSucceeded) {
                    processDiscussionData(data.comments);
                    commentCountsLoaded = true;
                    updateExistingCommentButtons();
                }

                if (!commentsOnly) {
                    if (requestedSectionFailed) {
                        scheduleAllDataBackgroundRetry();
                    } else {
                        clearAllDataBackgroundRetry();
                    }
                }

                return commentsOnly ? { comments: commentCountCache } :
                    { downloads: allDownloadCounters, comments: commentCountCache };

            } catch (err) {
                lastError = err;
                const errorType = err.name === 'AbortError' ? 'timeout' : 'network';
                console.warn(`Worker request attempt ${attempt} failed (${errorType}):`, err);

                if (attempt < 2) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        throw lastError;
    } catch (err) {
        console.error('Error loading data from worker:', err);
        if (!commentsOnly && requestedDataLoaded) {
            clearAllDataBackgroundRetry();
        }

        return commentsOnly ? { comments: commentCountCache } :
            { downloads: allDownloadCounters, comments: commentCountCache };
    }
}

// функцию форматирования счетчика скачиваний
function formatDownloadCount(count) {
    count = parseInt(count, 10);

    const suffix = count === 1 ? "download" : "downloads";

    if (count < 1000) {
        return `${count} ${suffix}`;
    }

    const units = ['', 'k', 'm'];
    const unit = count < 1000000 ? units[1] : units[2];
    const value = count < 1000000 ? count / 1000 : count / 1000000;

    let formatted = value.toFixed(1);

    if (formatted.endsWith('.0')) {
        formatted = formatted.slice(0, -2);
    }

    return `${formatted}${unit} ${suffix}`;
}

function updateDownloadCount(fileUrl, countElement, version, os, arch) {
    const counterKey = generateCounterKey(version, os, arch);

    if (countersLoaded) {
        // если данные уже загружены, используем их
        const count = allDownloadCounters[counterKey] || "0";
        countElement.innerHTML = count === "0" ? "" : `<span class="download-counter">${formatDownloadCount(count)}</span>`;
    } else {
        // сохраняем элемент для отложенного обновления
        pendingCounterElements.set(counterKey, { element: countElement, url: fileUrl });
    }
}

// cooldown для кнопок скачивания (предотвращает повторные запросы)
const downloadCooldowns = new WeakSet();
const pendingDownloadRequests = new Map();
let downloadRequestSeq = 0;
const DOWNLOAD_IFRAME_SETTLE_MS = 15000;

function getDownloadFileName(fileUrl, fallback = 'download') {
    try {
        const url = new URL(fileUrl, window.location.href);
        const pathName = url.pathname.split('/').pop() || '';
        const decoded = decodeURIComponent(pathName);
        return decoded || fallback;
    } catch {
        return fallback;
    }
}

function escapeToastText(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createDownloadErrorMessage(status, message, fileName) {
    const safeStatus = Number(status) > 0 ? Number(status) : null;
    const trimmedMessage = escapeToastText(String(message || '').trim());
    const safeFileName = escapeToastText(fileName);

    if (safeStatus === 429) {
        return `Download blocked for ${safeFileName}.\nToo many requests. Please wait and try again.`;
    }

    if (safeStatus === 404) {
        return `File not found: ${safeFileName}`;
    }

    if (safeStatus === 403) {
        return `Access denied for ${safeFileName}`;
    }

    if (safeStatus && trimmedMessage) {
        return `Download failed (${safeStatus}): ${trimmedMessage}`;
    }

    if (safeStatus) {
        return `Download failed (${safeStatus}) for ${safeFileName}`;
    }

    if (trimmedMessage) {
        return `Download failed for ${safeFileName}.\n${trimmedMessage}`;
    }

    return `Download failed for ${safeFileName}`;
}

function rollbackDownloadCounter(counterKey, previousCount, countElement) {
    const safePreviousCount = Math.max(0, Number(previousCount) || 0);
    allDownloadCounters[counterKey] = String(safePreviousCount);

    if (countElement) {
        countElement.innerHTML = safePreviousCount === 0
            ? ''
            : `<span class="download-counter">${formatDownloadCount(String(safePreviousCount))}</span>`;
    }
}

function cleanupDownloadRequest(requestId, reason = 'done') {
    const pending = pendingDownloadRequests.get(requestId);
    if (!pending) return null;

    pendingDownloadRequests.delete(requestId);

    if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
    }

    if (pending.frame) {
        pending.frame.src = 'about:blank';
        if (pending.frame.parentNode) {
            pending.frame.parentNode.removeChild(pending.frame);
        }
    }

    if (reason === 'error') {
        rollbackDownloadCounter(pending.counterKey, pending.previousCount, pending.countElement);
    }

    return pending;
}

function createDownloadFrame(requestId) {
    const frame = document.createElement('iframe');
    frame.name = `download-bridge-${requestId}`;
    frame.title = 'download bridge';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.left = '-9999px';
    frame.style.top = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    return frame;
}

function buildDownloadFrameUrl(fileUrl, requestId) {
    const url = new URL(fileUrl, window.location.href);
    url.searchParams.set('dl_frame', '1');
    url.searchParams.set('dl_req', requestId);
    return url.toString();
}

window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type !== 'download-error') return;

    const pendingEntry = [...pendingDownloadRequests.entries()].find(([, pending]) => {
        return pending.frame?.contentWindow
            && event.source === pending.frame.contentWindow
            && event.origin === pending.downloadOrigin;
    });
    if (!pendingEntry) return;

    const [requestId, pending] = pendingEntry;
    cleanupDownloadRequest(requestId, 'error');

    const message = createDownloadErrorMessage(
        event.data.status,
        event.data.message,
        pending.fileName
    );
    showToast(message, 5000, 'error');
});

// функция для обработки событий скачивания
async function handleDownload(downloadLink, fileUrl, version, os, arch) {
    // блокируем повторные клики в течение cooldown
    if (downloadCooldowns.has(downloadLink)) return;
    downloadCooldowns.add(downloadLink);
    downloadLink.classList.add('download-cooldown');
    setTimeout(() => {
        downloadCooldowns.delete(downloadLink);
        downloadLink.classList.remove('download-cooldown');
    }, 5000);

    const countElement = downloadLink.closest('.download-container').querySelector('.download-count-slot');
    const counterKey = generateCounterKey(version, os, arch);
    const previousCount = parseInt(allDownloadCounters[counterKey] || "0", 10);

    // увеличиваем счетчик в глобальном объекте
    const newCount = (previousCount + 1).toString();
    allDownloadCounters[counterKey] = newCount;

    // обновляем UI с новым значением
    countElement.innerHTML = newCount === "0" ? "" :
        `<span class="download-counter">${formatDownloadCount(newCount)}</span>`;

    const requestId = `${Date.now()}-${++downloadRequestSeq}`;
    const downloadOrigin = new URL(fileUrl, window.location.href).origin;
    const fileName = getDownloadFileName(fileUrl, `${version}-${os}-${arch}`);
    const frame = createDownloadFrame(requestId);
    document.body.appendChild(frame);

    // Если воркер не прислал iframe-ошибку в течение этого окна,
    // считаем, что скачивание стартовало успешно, и просто убираем bridge
    const timeoutId = setTimeout(() => {
        cleanupDownloadRequest(requestId, 'done');
    }, DOWNLOAD_IFRAME_SETTLE_MS);

    pendingDownloadRequests.set(requestId, {
        requestId,
        frame,
        timeoutId,
        counterKey,
        previousCount,
        countElement,
        downloadOrigin,
        fileName
    });

    frame.src = buildDownloadFrameUrl(fileUrl, requestId);
}

// кэш для регулярных выражений
const regexCache = new Map();

// подсветки найденного текста с кэшированием регулярных выражений
function highlight(text, term) {
    if (!term) return text;

    // используем кэшированное регулярное выражение или создаём новое
    if (!regexCache.has(term)) {
        // экранируем специальные символы в поисковом запросе
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regexCache.set(term, new RegExp(`(${escapedTerm})`, 'gi'));
    }

    return text.replace(regexCache.get(term), '<mark>$1</mark>');
}

// функция обновления фильтров архитектур
function updateArchFilters() {
    const filterPanel = document.querySelector('.filter-panel');
    const archContainer = document.getElementById('arch-filters');

    if (filterPanel) {
        filterPanel.classList.add('hidden');
    }

    setTimeout(() => {
        if (currentOS === 'linux' || isOsTemporarilyUnavailable(currentOS)) {
            archContainer.innerHTML = '';
            if (filterPanel) {
                filterPanel.classList.add('hidden');
            }
            return;
        }

        archContainer.innerHTML = '';

        const archSet = new Set();

        allVersions.forEach(([, data]) => {
            if (data.links[currentOS]) {
                getOrderedArchKeys(currentOS, data.links[currentOS]).forEach(arch => archSet.add(arch));
            }
        });
        let archArr = [];
        if (currentOS === 'win') {

            const order = ["x86", "x64", "arm64"];
            archArr = order.filter(arch => archSet.has(arch));
        } else if (currentOS === 'mac') {

            const order = ["intel", "arm64"];
            archArr = order.filter(arch => archSet.has(arch));
        } else {
            archArr = Array.from(archSet).sort();
        }

        archArr.forEach(arch => {
            const btn = document.createElement('button');
            btn.className = 'arch-filter-button' + (currentArch === arch ? ' active' : '');
            btn.textContent = arch;
            btn.addEventListener('click', () => {

                if (currentArch === arch) {
                    currentArch = 'all';
                } else {
                    currentArch = arch;
                }
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

// Функция для сравнения версий
function compareVersions(version1, version2) {
    const parts1 = version1.split('.').map(p => parseInt(p || '0', 10) || 0);
    const parts2 = version2.split('.').map(p => parseInt(p || '0', 10) || 0);
    const minLength = Math.min(parts1.length, parts2.length);

    for (let i = 0; i < minLength; i++) {
        if (parts1[i] > parts2[i]) return 1;
        if (parts1[i] < parts2[i]) return -1;
    }

    return 0;
}

function getCurrentVersionFilter(os = currentOS) {
    if (os === 'win') return currentWinVersionFilter;
    if (os === 'mac') return currentMacVersionFilter;
    if (os === 'linux') return currentLinuxVersionFilter;
    return null;
}

function hasVisibleWinMacRows(versionKey, data, os = currentOS) {
    if (!data.links[os]) return false;

    const currentVersionFilter = getCurrentVersionFilter(os);
    if (currentVersionFilter && compareVersions(versionKey, currentVersionFilter) > 0) {
        return false;
    }

    return getOrderedArchKeys(os, data.links[os]).some(arch => {
        return currentArch === 'all' || arch === currentArch;
    });
}

function parseSizeToBytes(sizeStr) {
    if (sizeStr == null || sizeStr === '' || sizeStr === '—') return 0;

    if (typeof sizeStr === 'number') {
        return sizeStr;
    }

    const match = String(sizeStr).match(/^([\d.]+)\s*(MB|GB|KB|B)?$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    const multipliers = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024
    };

    return value * (multipliers[unit] || 1);
}

function getSortMultiplier() {
    if (currentSortColumn === 'size') {
        return sortSizeAscending ? 1 : -1;
    }
    return sortVersionAscending ? 1 : -1;
}

function versionCompare(v1, v2) {
    return getSortMultiplier() * compareVersions(v1, v2);
}

function sizeCompare(size1, size2) {
    const bytes1 = parseSizeToBytes(size1);
    const bytes2 = parseSizeToBytes(size2);
    const diff = bytes1 - bytes2;
    return getSortMultiplier() * (diff === 0 ? 0 : (diff > 0 ? 1 : -1));
}

function reRenderVersions() {
    container.style.opacity = "0";
    observer.unobserve(sentinel);

    currentIndex = 0;
    window.sizesPreloaded = false;

    const loadingIndicator = document.getElementById('sizeLoadingIndicator');
    const tableContainer = document.getElementById('tableContainer');

    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

    if (container) {
        container.classList.remove('table-skeleton-overlay');
    }

    if (tableContainer) {
        tableContainer.style.overflow = '';
    }
    document.body.style.overflow = '';

    setTimeout(() => {
        if (currentSearchTerm !== "") {
            performSearch(currentSearchTerm);
        } else {
            currentSearchResults = null;
            startLazyLoading();
        }
    }, 300);
}

function createVersionRows(versionKey, data, searchTerm = '', isVisible = true) {
    const shortVersion = versionKey;
    const archCombos = [];
    let totalRowsForVersion = 0;

    if (currentOS === 'win' && currentWinVersionFilter) {
        if (compareVersions(shortVersion, currentWinVersionFilter) > 0) {
            return [];
        }
    } else if (currentOS === 'mac' && currentMacVersionFilter) {
        if (compareVersions(shortVersion, currentMacVersionFilter) > 0) {
            return [];
        }
    } else if (currentOS === 'linux' && currentLinuxVersionFilter) {
        if (compareVersions(shortVersion, currentLinuxVersionFilter) > 0) {
            return [];
        }
    }

    if (data.links[currentOS]) {
        for (const arch of getOrderedArchKeys(currentOS, data.links[currentOS])) {
            if (currentArch !== 'all' && arch !== currentArch) continue;
            const link = data.links[currentOS][arch];
            if (link) {
                archCombos.push({ arch, link });
                totalRowsForVersion++;
            }
        }
    }

    if (totalRowsForVersion === 0) return [];

    const rows = [];
    let isFirstVersionRow = true;

    archCombos.forEach((combo, comboIndex) => {
        const row = document.createElement('tr');

        if (isFirstVersionRow) {
            const versionCell = document.createElement('td');
            versionCell.className = 'version-cell';
            versionCell.rowSpan = totalRowsForVersion;

            const versionContainer = document.createElement('div');
            versionContainer.className = 'version-container';

            const versionTextWrapper = document.createElement('div');
            versionTextWrapper.className = 'version-text-wrapper';

            const { versionText } = createVersionElement(
                { short: shortVersion, full: data.fullversion },
                searchTerm,
                versionKey,
                currentOS
            );

            versionTextWrapper.appendChild(versionText);

            versionContainer.appendChild(versionTextWrapper);

            versionCell.appendChild(versionContainer);
            row.appendChild(versionCell);
            isFirstVersionRow = false;
        }

        const archCell = document.createElement('td');
        archCell.textContent = combo.arch;
        row.appendChild(archCell);

        const dateCell = document.createElement('td');
        dateCell.textContent = '—';
        row.appendChild(dateCell);

        const sizeCell = document.createElement('td');
        sizeCell.textContent = '—';
        row.appendChild(sizeCell);

        const downloadCell = createDownloadCell(combo.link, shortVersion, currentOS, combo.arch);

        downloadCell.setAttribute('data-download-url', combo.link);
        row.appendChild(downloadCell);

        updateLinkInfo(dateCell, sizeCell, combo.link, isVisible);

        rows.push(row);
    });

    return rows;
}

let allVersions = [];
const ITEMS_PER_BATCH = 5; // по 5 версий за раз для ленивой подгрузки
let currentIndex = 0;
let currentSearchResults = null;
const container = document.getElementById('versions-container');
let versionsAppInitialized = false;
let versionsAppInitPromise = null;
const ROUTE_PATHS = {
    versions: '/versions',
    faq: '/faq',
    links: '/links'
};
const VERSIONS_ROUTE_STATE_KEY = 'loadspot:last-versions-search';

// глобальная переменная для хранения Linux-пакетов
let linuxVersionsData = [];
let linuxDataLoaded = false; // флаг успешной загрузки Linux-данных

// сторож для Intersection Observer
const sentinel = document.createElement('tr');
sentinel.style.height = '1px';

// создаем универсальный Intersection Observer для всех типов данных
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            observer.unobserve(sentinel);

            // загружаем следующую партию данных в зависимости от текущей ОС
            if (currentOS === 'linux') {
                loadMoreLinuxRows();
            } else {
                loadMoreWinMacRows();
            }

            // если есть еще данные для загрузки, снова подключаем наблюдателя
            if (currentOS === 'linux') {
                const dataSource = currentSearchResults || linuxVersionsData;
                let totalItems;

                if (currentSortColumn === 'size') {
                    totalItems = dataSource.reduce((sum, version) => {
                        if (currentLinuxVersionFilter && compareVersions(version.version.short, currentLinuxVersionFilter) > 0) {
                            return sum;
                        }
                        return sum + version.architectures.length;
                    }, 0);
                } else {
                    const groupedVersions = groupLinuxVersions(dataSource);
                    totalItems = Object.keys(groupedVersions).length;
                }

                if (currentIndex < totalItems) {
                    observer.observe(sentinel);
                }
            } else {
                const dataSource = currentSearchResults || allVersions;
                let totalItems;

                if (currentSortColumn === 'size') {
                    const currentVersionFilter = currentOS === 'win' ? currentWinVersionFilter : currentMacVersionFilter;
                    totalItems = dataSource.reduce((sum, [versionKey, versionData]) => {
                        if (currentVersionFilter && compareVersions(versionKey, currentVersionFilter) > 0) {
                            return sum;
                        }
                        if (!versionData.links[currentOS]) return sum;

                        const archCount = Object.keys(versionData.links[currentOS]).filter(arch => {
                            return currentArch === 'all' || arch === currentArch;
                        }).length;

                        return sum + archCount;
                    }, 0);
                } else {
                    const groupedVersions = groupVersions(dataSource);
                    totalItems = Object.keys(groupedVersions).length;
                }

                if (currentIndex < totalItems) {
                    observer.observe(sentinel);
                }
            }
        }
    });
}, { root: null, rootMargin: '100px', threshold: 0 });

// функция для получения текущего источника данных в зависимости от ОС и поиска
function getCurrentDataSource() {
    if (currentOS === 'linux') {
        const dataSource = currentSearchResults || linuxVersionsData;
        const groupedVersions = groupLinuxVersions(dataSource);
        const groups = Object.entries(groupedVersions);
        groups.sort((a, b) => versionCompare(a[0], b[0]));
        return groups;
    } else {
        return currentSearchResults || allVersions;
    }
}

function hasSearchMatchInHiddenVersions(versions, searchTerm, osType = 'winmac') {
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

function getVersionSize(versionData, os = currentOS) {
    if (os === 'linux') {
        if (versionData.architectures && versionData.architectures.length > 0) {
            return versionData.architectures[0].size || '—';
        }
        return '—';
    } else {
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
}

function loadMoreLinuxRows() {
    const dataSource = currentSearchResults || linuxVersionsData;

    if (currentSortColumn === 'size' && !currentSearchResults) {
        let flatRows = [];
        dataSource.forEach(version => {
            if (currentLinuxVersionFilter && compareVersions(version.version.short, currentLinuxVersionFilter) > 0) {
                return;
            }

            version.architectures.forEach(arch => {
                flatRows.push({
                    version: version.version,
                    arch: arch
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

        const endIndex = Math.min(currentIndex + ITEMS_PER_BATCH * 3, flatRows.length);

        for (let i = currentIndex; i < endIndex; i++) {
            const item = flatRows[i];
            const row = document.createElement('tr');
            const { versionText } = createVersionElement(
                { short: item.version.short, full: item.version.full },
                currentSearchTerm,
                item.version.short,
                'linux'
            );

            const versionContainer = document.createElement('div');
            versionContainer.className = 'version-container';

            const versionTextWrapper = document.createElement('div');
            versionTextWrapper.className = 'version-text-wrapper';

            versionTextWrapper.appendChild(versionText);
            versionContainer.appendChild(versionTextWrapper);

            const versionCell = document.createElement('td');
            versionCell.className = 'version-cell has-comments';
            versionCell.appendChild(versionContainer);
            row.appendChild(versionCell);

            const archCell = document.createElement('td');
            archCell.textContent = item.arch.arch;
            row.appendChild(archCell);

            const dateCell = document.createElement('td');
            dateCell.textContent = item.arch.date;
            row.appendChild(dateCell);

            const sizeCell = document.createElement('td');
            sizeCell.textContent = item.arch.size;
            row.appendChild(sizeCell);

            row.appendChild(createDownloadCell(item.arch.link, item.version.short, 'linux', item.arch.arch));

            container.appendChild(row);
        }

        currentIndex = endIndex;
        if (currentIndex < flatRows.length) {
            container.appendChild(sentinel);
        }
        return;
    }

    const groupedVersions = groupLinuxVersions(dataSource);
    const groups = Object.entries(groupedVersions);
    if (!currentSearchResults) {
        groups.sort((a, b) => versionCompare(a[0], b[0]));
    }

    const endIndex = Math.min(currentIndex + ITEMS_PER_BATCH, groups.length);

    for (let i = currentIndex; i < endIndex; i++) {
        const [groupKey, versions] = groups[i];

        versions.sort((a, b) => versionCompare(a.version.short, b.version.short));

        let visibleVersions = versions;
        if (currentLinuxVersionFilter) {
            visibleVersions = versions.filter(v => compareVersions(v.version.short, currentLinuxVersionFilter) <= 0);
        }

        if (visibleVersions.length === 0) continue;

        visibleVersions.sort((a, b) => versionCompare(a.version.short, b.version.short));

        const displayVersion = visibleVersions[0];

        const { versionText, spoilerSlot } = createVersionElement(
            { short: displayVersion.version.short, full: displayVersion.version.full },
            currentSearchTerm,
            displayVersion.version.short,
            'linux'
        );

        const versionContainer = document.createElement('div');
        versionContainer.className = 'version-container';

        const versionTextWrapper = document.createElement('div');
        versionTextWrapper.className = 'version-text-wrapper';

        versionTextWrapper.appendChild(versionText);
        versionContainer.appendChild(versionTextWrapper);

        const hiddenVersions = visibleVersions.slice(1);

        if (hiddenVersions.length > 0) {
            const hiddenCount = hiddenVersions.length;
            const spoilerBtn = createSpoiler(groupKey, hiddenCount);

            const hasMatchInHidden = hasSearchMatchInHiddenVersions(visibleVersions, currentSearchTerm, 'linux');
            const hasVersionFilterInHidden = currentLinuxVersionFilter && hiddenVersions.some(v => v.version.short === currentLinuxVersionFilter);

            if (hasMatchInHidden || hasVersionFilterInHidden) {
                spoilerBtn.classList.add('expanded');
            }

            spoilerSlot.appendChild(spoilerBtn);
        }

        displayVersion.architectures.forEach((arch, index) => {
            const row = document.createElement('tr');

            if (index === 0) {
                const versionCell = document.createElement('td');
                versionCell.className = 'version-cell has-comments';
                versionCell.rowSpan = displayVersion.architectures.length;
                versionCell.appendChild(versionContainer);
                row.appendChild(versionCell);
            }

            const archCell = document.createElement('td');
            archCell.textContent = arch.arch;
            row.appendChild(archCell);

            const dateCell = document.createElement('td');
            dateCell.textContent = arch.date;
            row.appendChild(dateCell);

            const sizeCell = document.createElement('td');
            sizeCell.textContent = arch.size;
            row.appendChild(sizeCell);

            row.appendChild(createDownloadCell(arch.link, displayVersion.version.short, 'linux', arch.arch));

            container.appendChild(row);
        });

        if (hiddenVersions.length > 0) {
            const shouldExpand = hasSearchMatchInHiddenVersions(visibleVersions, currentSearchTerm, 'linux') || (currentLinuxVersionFilter && hiddenVersions.some(v => v.version.short === currentLinuxVersionFilter));

            for (let j = 0; j < hiddenVersions.length; j++) {
                const olderVersion = hiddenVersions[j];

                olderVersion.architectures.forEach((arch, index) => {
                    const row = document.createElement('tr');
                    row.classList.add('spoiler-content-row');
                    row.dataset.spoilerFor = groupKey;

                    if (shouldExpand) {
                        row.style.display = 'table-row';
                        row.classList.add('visible');
                    } else {
                        row.style.display = 'none';
                    }

                    if (index === 0) {
                        const { versionText: oldVersionText } = createVersionElement(
                            { short: olderVersion.version.short, full: olderVersion.version.full },
                            currentSearchTerm,
                            olderVersion.version.short,
                            'linux'
                        );

                        const versionCell = document.createElement('td');
                        versionCell.className = 'version-cell has-comments';
                        versionCell.rowSpan = olderVersion.architectures.length;
                        versionCell.appendChild(oldVersionText);
                        row.appendChild(versionCell);
                    }

                    const archCell = document.createElement('td');
                    archCell.textContent = arch.arch;
                    row.appendChild(archCell);

                    const dateCell = document.createElement('td');
                    dateCell.textContent = arch.date;
                    row.appendChild(dateCell);

                    const sizeCell = document.createElement('td');
                    sizeCell.textContent = arch.size;
                    row.appendChild(sizeCell);

                    row.appendChild(createDownloadCell(arch.link, olderVersion.version.short, 'linux', arch.arch));

                    container.appendChild(row);

                    if (shouldExpand) {
                        wrapSpoilerCells(row);
                    }
                });
            }
        }
    }

    currentIndex = endIndex;
    if (currentIndex < groups.length) {
        container.appendChild(sentinel);
    }
}
function loadMoreWinMacRows() {
    const dataSource = currentSearchResults || allVersions;

    if (currentSortColumn === 'size' && !currentSearchResults) {
        const currentVersionFilter = currentOS === 'win' ? currentWinVersionFilter : currentMacVersionFilter;

        if (!window.sizesPreloaded) {
            window.sizesPreloaded = true;
            preloadSizesForSorting(dataSource).then(() => {
                if (currentSortColumn === 'size') {
                    container.innerHTML = '';
                    currentIndex = 0;
                    loadMoreWinMacRows();
                }
            });
        }

        let flatRows = [];
        dataSource.forEach(([versionKey, versionData]) => {
            if (currentVersionFilter && compareVersions(versionKey, currentVersionFilter) > 0) {
                return;
            }

            if (!versionData.links[currentOS]) return;

            getOrderedArchKeys(currentOS, versionData.links[currentOS]).forEach(arch => {
                if (currentArch !== 'all' && arch !== currentArch) return;

                const link = versionData.links[currentOS][arch];
                if (link) {
                    let size = '—';
                    let date = '—';
                    if (linkMetaCache.has(link)) {
                        const cached = linkMetaCache.get(link);
                        size = cached.size;
                        date = cached.date;
                    }

                    flatRows.push({
                        versionKey: versionKey,
                        versionData: versionData,
                        arch: arch,
                        link: link,
                        size: size,
                        date: date
                    });
                }
            });
        });

        flatRows.sort((a, b) => {
            const sizeComp = sizeCompare(a.size, b.size);
            if (sizeComp !== 0) return sizeComp;
            const versionComp = versionCompare(a.versionKey, b.versionKey);
            if (versionComp !== 0) return versionComp;
            return compareArchNames(currentOS, a.arch, b.arch);
        });

        const endIndex = Math.min(currentIndex + ITEMS_PER_BATCH * 3, flatRows.length);

        for (let i = currentIndex; i < endIndex; i++) {
            const item = flatRows[i];
            const row = document.createElement('tr');
            const { versionText } = createVersionElement(
                { short: item.versionKey, full: item.versionData.fullversion },
                currentSearchTerm,
                item.versionKey,
                currentOS
            );

            const versionContainer = document.createElement('div');
            versionContainer.className = 'version-container';

            const versionTextWrapper = document.createElement('div');
            versionTextWrapper.className = 'version-text-wrapper';

            versionTextWrapper.appendChild(versionText);
            versionContainer.appendChild(versionTextWrapper);

            const versionCell = document.createElement('td');
            versionCell.className = 'version-cell';
            versionCell.appendChild(versionContainer);
            row.appendChild(versionCell);

            const archCell = document.createElement('td');
            archCell.textContent = item.arch;
            row.appendChild(archCell);

            const dateCell = document.createElement('td');
            dateCell.textContent = item.date;
            row.appendChild(dateCell);

            const sizeCell = document.createElement('td');
            sizeCell.textContent = item.size;
            row.appendChild(sizeCell);

            const downloadCell = createDownloadCell(item.link, item.versionKey, currentOS, item.arch);
            downloadCell.setAttribute('data-download-url', item.link);
            row.appendChild(downloadCell);

            if (!linkMetaCache.has(item.link)) {
                updateLinkInfo(dateCell, sizeCell, item.link, true);
            }

            container.appendChild(row);
        }

        currentIndex = endIndex;
        if (currentIndex < flatRows.length) {
            container.appendChild(sentinel);
        } else if (container.childElementCount === 0) {
            showNoResults();
        }
        return;
    }

    const groupedVersions = groupVersions(dataSource);
    const groups = Object.entries(groupedVersions);
    if (!currentSearchResults) {
        groups.sort((a, b) => versionCompare(a[0], b[0]));
    }

    const endIndex = Math.min(currentIndex + ITEMS_PER_BATCH, groups.length);
    let rowsAdded = 0;

    for (let i = currentIndex; i < endIndex; i++) {
        const [groupKey, versions] = groups[i];
        versions.sort((a, b) => versionCompare(a[0], b[0]));

        const currentVersionFilter = currentOS === 'win' ? currentWinVersionFilter : currentMacVersionFilter;

        let visibleVersions = versions;
        if (currentVersionFilter) {
            visibleVersions = versions.filter(([v]) => compareVersions(v, currentVersionFilter) <= 0);
        }

        if (visibleVersions.length === 0) continue;

        visibleVersions.sort((a, b) => versionCompare(a[0], b[0]));

        const [displayVersionKey, displayVersionData] = visibleVersions[0];
        const displayVersionRows = createVersionRows(displayVersionKey, displayVersionData, currentSearchTerm);

        if (displayVersionRows.length > 0) {
            const hiddenVersions = visibleVersions.slice(1);

            if (hiddenVersions.length > 0) {
                const spoilerControls = displayVersionRows[0].querySelector('.version-cell .version-spoiler-slot');
                if (spoilerControls) {
                    const hiddenCount = hiddenVersions.length;
                    const spoilerBtn = createSpoiler(groupKey, hiddenCount);
                    const hasMatchInHidden = hasSearchMatchInHiddenVersions(visibleVersions, currentSearchTerm, 'winmac');
                    const hasVersionFilterInHidden = currentVersionFilter && hiddenVersions.some(([v]) => v === currentVersionFilter);

                    if (hasMatchInHidden || hasVersionFilterInHidden) {
                        spoilerBtn.classList.add('expanded');
                    }

                    spoilerControls.appendChild(spoilerBtn);
                }
            }

            displayVersionRows.forEach(r => container.appendChild(r));
            rowsAdded += displayVersionRows.length;

            if (hiddenVersions.length > 0) {
                const shouldExpand = hasSearchMatchInHiddenVersions(visibleVersions, currentSearchTerm, 'winmac') || (currentVersionFilter && hiddenVersions.some(([v]) => v === currentVersionFilter));
                for (let j = 0; j < hiddenVersions.length; j++) {
                    const [versionKey, versionData] = hiddenVersions[j];
                    const olderVersionRows = createVersionRows(versionKey, versionData, currentSearchTerm, shouldExpand);

                    olderVersionRows.forEach(row => {
                        row.classList.add('spoiler-content-row');
                        row.dataset.spoilerFor = groupKey;

                        if (shouldExpand) {
                            row.style.display = 'table-row';
                            row.classList.add('visible');
                        } else {
                            row.style.display = 'none';
                        }
                        container.appendChild(row);

                        if (shouldExpand) {
                            wrapSpoilerCells(row);
                        }
                    });
                }
            }
        }
    }

    currentIndex = endIndex;

    if (currentIndex < groups.length) {
        container.appendChild(sentinel);
    } else if (rowsAdded === 0 && currentIndex === groups.length) {
        if (container.childElementCount === 0) {
            showNoResults();
        }
    }
}

function toggleSpoiler(groupKey) {
    const spoilerRows = document.querySelectorAll(`tr.spoiler-content-row[data-spoiler-for="${groupKey}"]`);
    const toggleButton = document.querySelector(`.spoiler-toggle[data-group-key="${groupKey}"]`);

    if (spoilerRows.length > 0) {

        const isHidden = !toggleButton.classList.contains('expanded');

        if (isHidden) {
            toggleButton.classList.add('expanded');

            spoilerRows.forEach((row, index) => {

                row.style.display = 'table-row';

                const cells = row.querySelectorAll('td');

                wrapSpoilerCells(row);

                let dateCell, sizeCell, downloadCell;
                const versionCell = row.querySelector('.version-cell');
                if (versionCell) {
                    dateCell = cells[2];
                    sizeCell = cells[3];
                    downloadCell = cells[4];
                } else {
                    dateCell = cells[1];
                    sizeCell = cells[2];
                    downloadCell = cells[3];
                }

                if (dateCell && sizeCell && downloadCell) {
                    const url = downloadCell.getAttribute('data-download-url');
                    if (url) {

                        const dateCellWrapper = dateCell.querySelector('.cell-wrapper');
                        const sizeCellWrapper = sizeCell.querySelector('.cell-wrapper');

                        if (linkMetaCache.has(url)) {
                            const cached = linkMetaCache.get(url);
                            if (dateCellWrapper) dateCellWrapper.textContent = cached.date;
                            if (sizeCellWrapper) sizeCellWrapper.textContent = cached.size;
                        } else {
                            updateLinkInfo(dateCell, sizeCell, url, true);
                        }
                    }
                }

                setTimeout(() => {
                    row.classList.add('visible');
                }, index * 30);
            });

        } else {
            toggleButton.classList.remove('expanded');

            spoilerRows.forEach((row, index) => {

                setTimeout(() => {
                    row.classList.remove('visible');
                }, index * 20);


                setTimeout(() => {
                    row.style.display = 'none';
                }, 400 + (index * 20));
            });
        }
    }
}

function wrapSpoilerCells(row) {
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

function groupVersions(versions) {
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

function groupLinuxVersions(versions) {
    const groups = {};
    versions.forEach((version) => {
        const groupKey = version.version.short.split('.').slice(0, 3).join('.');
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(version);
    });
    return groups;
}

function createSpoiler(groupKey, hiddenCount) {
    const spoilerBtn = document.createElement('span');
    spoilerBtn.className = 'spoiler-toggle';
    spoilerBtn.title = (currentSortColumn === 'version' && !sortVersionAscending) ? 'Show older builds' : 'Show builds';
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


function showNoResults() {
    container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No results</td></tr>';
    container.style.opacity = "1";
}

function showTemporarilyUnavailableNotice(os = currentOS) {
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
    container.style.opacity = "1";
}

// функция для запуска ленивой загрузки в зависимости от ОС
function startLazyLoading() {
    container.innerHTML = '';
    currentIndex = 0;

    if (isOsTemporarilyUnavailable(currentOS)) {
        showTemporarilyUnavailableNotice(currentOS);
        return;
    }

    const dataSource = getCurrentDataSource();

    if (!dataSource || dataSource.length === 0) {
        showNoResults();
        return;
    }

    if (currentOS !== 'linux') {
        const filteredVersions = dataSource.filter(([versionKey, data]) => {
            if (!data.links[currentOS]) return false;

            if (currentArch !== 'all' && !data.links[currentOS][currentArch]) return false;

            if (currentOS === 'win' && currentWinVersionFilter && compareVersions(versionKey, currentWinVersionFilter) > 0) {
                return false;
            }
            if (currentOS === 'mac' && currentMacVersionFilter && compareVersions(versionKey, currentMacVersionFilter) > 0) {
                return false;
            }
            if (currentOS === 'linux' && currentLinuxVersionFilter && compareVersions(versionKey, currentLinuxVersionFilter) > 0) {
                return false;
            }

            return true;
        });

        if (filteredVersions.length === 0) {
            showNoResults();
            return;
        }
    }

    // загружаем первую порцию в зависимости от ОС
    if (currentOS === 'linux') {
        loadMoreLinuxRows();
    } else {
        loadMoreWinMacRows();
    }

    // если есть еще данные для загрузки, подключаем наблюдателя
    if (currentOS === 'linux') {
        const dataSource = currentSearchResults || linuxVersionsData;
        let totalItems;

        if (currentSortColumn === 'size') {
            totalItems = dataSource.reduce((sum, version) => {
                if (currentLinuxVersionFilter && compareVersions(version.version.short, currentLinuxVersionFilter) > 0) {
                    return sum;
                }
                return sum + version.architectures.length;
            }, 0);
        } else {
            const groupedVersions = groupLinuxVersions(dataSource);
            totalItems = Object.keys(groupedVersions).length;
        }

        if (currentIndex < totalItems) {
            observer.observe(sentinel);
        }
    } else {
        const dataSource = currentSearchResults || allVersions;
        let totalItems;

        if (currentSortColumn === 'size') {
            const currentVersionFilter = currentOS === 'win' ? currentWinVersionFilter : currentMacVersionFilter;
            totalItems = dataSource.reduce((sum, [versionKey, versionData]) => {
                if (currentVersionFilter && compareVersions(versionKey, currentVersionFilter) > 0) {
                    return sum;
                }
                if (!versionData.links[currentOS]) return sum;

                const archCount = Object.keys(versionData.links[currentOS]).filter(arch => {
                    return currentArch === 'all' || arch === currentArch;
                }).length;

                return sum + archCount;
            }, 0);
        } else {
            const groupedVersions = groupVersions(dataSource);
            totalItems = Object.keys(groupedVersions).length;
        }

        if (currentIndex < totalItems) {
            observer.observe(sentinel);
        }
    }

    container.style.opacity = "1";
}

// функция для сортировки результатов поиска для Win/Mac
function sortSearchResults(filtered, term) {
    return filtered.sort((a, b) => {
        const [versionKeyA, dataA] = a;
        const [versionKeyB, dataB] = b;

        // if (currentSortColumn === 'size') {
        //     const sizeA = getVersionSize(dataA, currentOS);
        //     const sizeB = getVersionSize(dataB, currentOS);
        //     const sizeComp = sizeCompare(sizeA, sizeB);
        //     return sizeComp !== 0 ? sizeComp : versionCompare(versionKeyA, versionKeyB);
        // }

        const fullVersionA = dataA.fullversion.toLowerCase();
        const fullVersionB = dataB.fullversion.toLowerCase();

        // проверяем точное совпадение целого числа (окруженного точками или границами строки)
        const termWithBoundaries = `(^|\\.|\\ )${term}($|\\.|\\s)`;
        const reExact = new RegExp(termWithBoundaries);

        const exactMatchA = reExact.test(versionKeyA.toLowerCase()) || reExact.test(fullVersionA);
        const exactMatchB = reExact.test(versionKeyB.toLowerCase()) || reExact.test(fullVersionB);

        // если у одного точное совпадение, а у другого нет
        if (exactMatchA && !exactMatchB) return -1;
        if (!exactMatchA && exactMatchB) return 1;

        // проверяем совпадение в первой части версии (до 'g')
        // разделяем версию на основную часть и хеш
        const mainPartA = fullVersionA.split('g')[0];
        const mainPartB = fullVersionB.split('g')[0];

        const inMainA = mainPartA.includes(term);
        const inMainB = mainPartB.includes(term);

        // приоритизируем совпадения в основной части версии
        if (inMainA && !inMainB) return -1;
        if (!inMainA && inMainB) return 1;

        // сортируем по версии (сначала новые)
        return -1 * versionKeyA.localeCompare(versionKeyB, undefined, { numeric: true, sensitivity: 'base' });
    });
}

// функция поиска для всех OS
function performSearch(term) {
    term = term.trim().toLowerCase();
    container.style.opacity = "0";
    currentSearchTerm = term;
    observer.unobserve(sentinel);

    updateSortUI();
    syncUrlWithState();

    setTimeout(() => {
        if (term === "") {
            currentSearchResults = null;
            startLazyLoading();
            return;
        }

        container.innerHTML = "";
        currentIndex = 0;

        if (isOsTemporarilyUnavailable(currentOS)) {
            currentSearchResults = null;
            showTemporarilyUnavailableNotice(currentOS);
            return;
        }

        // проверяем, загружены ли данные для Linux, если это текущая ОС
        if (currentOS === 'linux' && !linuxDataLoaded) {
            loadLinuxPackages();
            return;
        }

        if (currentOS === 'linux') {
            currentSearchResults = linuxVersionsData.filter(version =>
                version.version.short.toLowerCase().includes(term) ||
                version.version.full.toLowerCase().includes(term)
            ).sort((a, b) => {

                const shortA = a.version.short.toLowerCase();
                const shortB = b.version.short.toLowerCase();
                const fullA = a.version.full.toLowerCase();
                const fullB = b.version.full.toLowerCase();

                const termWithBoundaries = `(^|\\.|\\ )${term}($|\\.|\\s)`;
                const reExact = new RegExp(termWithBoundaries);

                const exactMatchA = reExact.test(shortA) || reExact.test(fullA);
                const exactMatchB = reExact.test(shortB) || reExact.test(fullB);

                if (exactMatchA && !exactMatchB) return -1;
                if (!exactMatchA && exactMatchB) return 1;

                // проверяем совпадение в основной части
                const mainPartA = fullA.split('g')[0];
                const mainPartB = fullB.split('g')[0];

                const inMainA = mainPartA.includes(term);
                const inMainB = mainPartB.includes(term);

                if (inMainA && !inMainB) return -1;
                if (!inMainA && inMainB) return 1;

                return -1 * a.version.short.localeCompare(b.version.short, undefined, { numeric: true });
            });
        } else {
            // поиск для Windows и Mac
            const filtered = allVersions.filter(([versionKey, data]) => {
                return (versionKey.toLowerCase().includes(term) ||
                    data.fullversion.toLowerCase().includes(term)) &&
                    data.links[currentOS] &&
                    (currentArch === 'all' || data.links[currentOS].hasOwnProperty(currentArch));
            });
            const unique = new Map();
            filtered.forEach(([versionKey, data]) => {
                if (!unique.has(versionKey)) {
                    unique.set(versionKey, data);
                }
            });
            currentSearchResults = sortSearchResults(Array.from(unique.entries()), term);
        }

        // запускаем ленивую загрузку результатов поиска
        startLazyLoading();
    }, 300);
}

function syncUrlWithState() {
    if (getCurrentPageKey() !== 'versions') {
        return;
    }

    const params = {};

    params.os = currentOS;
    params.search = currentSearchTerm;

    if (currentArch && currentArch !== 'all') {
        params.arch = currentArch;
    } else {
        params.arch = null;
    }

    params.winVersion = currentWinVersionFilter;
    params.macVersion = currentMacVersionFilter;
    params.linuxVersion = currentLinuxVersionFilter;

    if (currentSortColumn === 'version') {
        params.sortVersion = sortVersionAscending ? 'asc' : 'desc';
        params.sortSize = null;
    } else if (currentSortColumn === 'size') {
        params.sortSize = sortSizeAscending ? 'asc' : 'desc';
        params.sortVersion = null;
    } else {
        params.sortVersion = null;
        params.sortSize = null;
    }

    if (currentSearchTerm && currentSearchTerm.trim() !== '') {
        params.sortVersion = null;
        params.sortSize = null;
    }

    params.sort = null;

    const url = new URL(window.location);
    url.pathname = ROUTE_PATHS.versions;
    url.hash = '';

    Object.entries(params).forEach(([key, value]) => {
        if (value == null || value === undefined || value === '') {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });

    window.history.replaceState(null, '', url);
}

function updateSortUI() {
    const versionArrow = document.getElementById('sortArrow');
    const sizeArrow = document.getElementById('sizeSortArrow');
    const versionControl = document.getElementById('versionSortControl');
    const sizeControl = document.getElementById('sizeSortControl');

    const isSearchActive = currentSearchTerm && currentSearchTerm.trim() !== '';

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
    } else {
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
    }

    if (versionArrow) {
        const versionSvg = versionArrow.querySelector('svg');
        if (versionSvg) {
            if (currentSortColumn === 'version') {
                versionArrow.style.opacity = '1';
                versionSvg.style.transform = sortVersionAscending ? 'rotate(180deg)' : 'rotate(0deg)';
            } else {
                versionArrow.style.opacity = '0';
            }
        }
    }

    if (sizeArrow) {
        const sizeSvg = sizeArrow.querySelector('svg');
        if (sizeSvg) {
            if (currentSortColumn === 'size') {
                sizeArrow.style.opacity = '1';
                sizeSvg.style.transform = sortSizeAscending ? 'rotate(180deg)' : 'rotate(0deg)';
            } else {
                sizeArrow.style.opacity = '0';
            }
        }
    }
}

function toggleVersionSort() {
    if (currentSearchTerm && currentSearchTerm.trim() !== '') return;
    if (currentSortColumn !== 'version') {
        currentSortColumn = 'version';
    } else {
        sortVersionAscending = !sortVersionAscending;
    }
    updateSortUI();
    syncUrlWithState();
    reRenderVersions();
}

function toggleSizeSort() {
    if (currentSearchTerm && currentSearchTerm.trim() !== '') return;
    if (currentSortColumn !== 'size') {
        currentSortColumn = 'size';
        sortSizeAscending = true;
    } else if (sortSizeAscending) {
        sortSizeAscending = false;
    } else {
        currentSortColumn = 'version';
        sortVersionAscending = false;
    }
    updateSortUI();
    syncUrlWithState();
    reRenderVersions();
}


document.addEventListener('DOMContentLoaded', () => {
    const versionControl = document.getElementById('versionSortControl');
    if (versionControl) {
        versionControl.addEventListener('click', toggleVersionSort);
        versionControl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleVersionSort();
            }
        });
    }

    const sizeControl = document.getElementById('sizeSortControl');
    if (sizeControl) {
        sizeControl.addEventListener('click', toggleSizeSort);
        sizeControl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSizeSort();
            }
        });
    }

    updateSortUI();
});

// функция для обработки пустых строк в markdown
function processMarkdownSpacing(mdText) {

    return mdText.replace(/(<div class="answer">\s*)(.*?)(\s*<\/div>)/gs, (match, start, content, end) => {

        const lines = content.trim().split(/\n\s*\n/);
        const processedLines = lines.map(line => marked.parse(line.trim()));
        if (lines.length > 1) {
            const cleanedLines = processedLines.map(line =>
                line.replace(/<\/?p>/g, '')
            );
            return `${start}${cleanedLines.join('<br><br>')}${end}`;
        }
        return `${start}${marked.parse(content.trim()).replace(/<\/?p>/g, '')}${end}`;
    });
}

// функция для Linux ленивой загрузки
async function loadLinuxPackages() {
    try {
        linuxVersionsData = buildLinuxVersionsData(Object.fromEntries(allVersions));

        linuxVersionsData.sort((a, b) => {
            return getSortMultiplier() * a.version.short.localeCompare(b.version.short, undefined, { numeric: true });
        });

        linuxDataLoaded = true;

        // отображаем данные с учетом текущих фильтров
        if (currentSearchTerm !== "") {
            performSearch(currentSearchTerm);
        } else {
            startLazyLoading();
        }
    } catch (error) {
        console.error('Ошибка загрузки Linux пакетов:', error);
        container.innerHTML = '<tr><td colspan="5">Ошибка загрузки списка пакетов</td></tr>';
        container.style.opacity = "1";
    }
}

async function loadVersionsApp() {
    try {
        const response = await fetch('versions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawData = await response.json();
        const data = normalizeVersionsData(rawData);

        container.innerHTML = '';
        primeMetadataCache(data);
        allVersions = Object.entries(data);
        linuxVersionsData = buildLinuxVersionsData(data);
        linuxDataLoaded = true;

        // запускаем загрузку всех данных
        loadAllData().catch(err => console.error('Data fetch error:', err));
        flushPendingLinkMetaUpdates();

        // отображаем первую партию данных для текущей ОС, только если это не markdown страница
        if (currentSearchTerm) {
            versionSearch.value = currentSearchTerm
            searchContainer.classList.add('show-clear');
            searchContainer.classList.add('expanded');

            if (currentOS !== 'linux') {
                updateArchFilters();
            }

            performSearch(currentSearchTerm);
        } else {
            if (currentOS === 'linux') {
                startLazyLoading();
            } else {
                startLazyLoading();
                updateArchFilters();
            }
        }

        versionsAppInitialized = true;
    } catch (err) {
        versionsAppInitialized = false;
        console.error('Error loading version data:', err);
        container.innerHTML = '<tr><td colspan="5">Failed to load version data.</td></tr>';
        throw err;
    }
}

function ensureVersionsAppInitialized() {
    if (versionsAppInitialized) {
        return Promise.resolve();
    }

    if (!versionsAppInitPromise) {
        versionsAppInitPromise = loadVersionsApp()
            .catch((err) => {
                versionsAppInitPromise = null;
                throw err;
            });
    }

    return versionsAppInitPromise;
}

function normalizePathname(pathname = window.location.pathname) {
    if (!pathname || pathname === '/') return '/';
    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function getCurrentPageKey() {
    const hash = window.location.hash;
    if (hash === '#faq') return 'faq';
    if (hash === '#links') return 'links';
    if (hash === '#versions') return 'versions';

    const pathname = normalizePathname();
    if (pathname === ROUTE_PATHS.faq) return 'faq';
    if (pathname === ROUTE_PATHS.links) return 'links';
    return 'versions';
}

function rememberVersionsSearch(search = window.location.search) {
    try {
        sessionStorage.setItem(VERSIONS_ROUTE_STATE_KEY, search || '');
    } catch (_) {
        // sessionStorage may be unavailable in private mode or restricted contexts
    }
}

function getRememberedVersionsSearch() {
    try {
        return sessionStorage.getItem(VERSIONS_ROUTE_STATE_KEY) || '';
    } catch (_) {
        return '';
    }
}

function buildRouteUrl(pageKey) {
    const url = new URL(window.location.origin);
    url.pathname = ROUTE_PATHS[pageKey] || ROUTE_PATHS.versions;
    url.hash = '';

    if (pageKey === 'versions') {
        url.search = getCurrentPageKey() === 'versions'
            ? window.location.search
            : getRememberedVersionsSearch();
    } else {
        url.search = '';
    }

    return url;
}

function navigateToPage(pageKey, replace = false) {
    const targetKey = ROUTE_PATHS[pageKey] ? pageKey : 'versions';
    const currentKey = getCurrentPageKey();

    if (currentKey === 'versions') {
        rememberVersionsSearch(window.location.search);
    }

    const url = buildRouteUrl(targetKey);
    const currentUrl = `${normalizePathname()}${window.location.search}`;
    const targetUrl = `${normalizePathname(url.pathname)}${url.search}`;
    const method = replace ? 'replaceState' : 'pushState';

    if (currentUrl !== targetUrl) {
        window.history[method](null, '', url);
    } else if (replace && window.location.hash) {
        window.history.replaceState(null, '', url);
    }

    loadMarkdownPage();
    updateNavActive();
}

function migrateLegacyRoute() {
    const hash = window.location.hash;
    if (hash === '#faq') {
        if (window.location.search) rememberVersionsSearch(window.location.search);
        navigateToPage('faq', true);
    } else if (hash === '#links') {
        if (window.location.search) rememberVersionsSearch(window.location.search);
        navigateToPage('links', true);
    } else if (hash === '#versions') {
        navigateToPage('versions', true);
    } else if (getCurrentPageKey() === 'versions' && normalizePathname() !== ROUTE_PATHS.versions) {
        navigateToPage('versions', true);
    }
}

async function initializeApp() {
    if (getCurrentPageKey() !== 'versions') {
        return;
    }

    return ensureVersionsAppInitialized();
}

// обработчик для переключения вкладок (фильтрации по ОС)
document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const newOS = button.dataset.os;
        // если ОС не изменилась, не выполняем лишних действий
        if (newOS === currentOS) return;

        // сбрасываем фильтр архитектуры при переходе на Linux
        if (newOS === 'linux' && currentArch !== 'all') {
            currentArch = 'all'; // Сбросить фильтр архитектуры на "все"
        }

        currentOS = newOS;

        window.sizesPreloaded = false;

        const loadingIndicator = document.getElementById('sizeLoadingIndicator');
        const tbody = document.getElementById('versions-container');
        const tableContainer = document.getElementById('tableContainer');

        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

        if (tbody) {
            tbody.classList.remove('table-skeleton-overlay');
        }

        if (currentSortColumn !== 'size') {
            if (tableContainer) {
                tableContainer.style.overflow = '';
            }
            document.body.style.overflow = '';
        }

        // сброс фильтра архитектуры при необходимости
        if (currentOS !== 'linux') {
            let availableArch = new Set();
            allVersions.forEach(([, data]) => {
                if (data.links[currentOS]) {
                    getOrderedArchKeys(currentOS, data.links[currentOS]).forEach(arch => availableArch.add(arch));
                }
            });
            if (!availableArch.has(currentArch)) {
                currentArch = 'all';
            }
        }

        // анимация перехода
        container.style.opacity = "0";

        // обновляем фильтры архитектур
        updateArchFilters();

        syncUrlWithState();

        setTimeout(() => {
            // если мы переходим на Linux и данные еще не загружены, загружаем их
            if (currentOS === 'linux' && !linuxDataLoaded) {
                loadLinuxPackages();
            } else {
                // если поисковый запрос активен, обновляем поиск для новой ОС
                if (currentSearchTerm !== "") {
                    performSearch(currentSearchTerm);
                } else {
                    // иначе просто перерисовываем данные
                    currentSearchResults = null;
                    startLazyLoading();
                }
            }
        }, 300);
    });
});

// обработчик для поиска по версиям с ленивой загрузкой результатов
const versionSearch = document.getElementById('versionSearch');
const searchContainer = document.getElementById('searchContainer');
const clearSearchBtn = document.querySelector('.clear-search');

versionSearch.addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (e.target.value.trim() !== "") {
        searchContainer.classList.add('show-clear');
    } else {
        searchContainer.classList.remove('show-clear');
    }
    performSearch(term);
});

// обработчик клика на кнопку очистки
clearSearchBtn.addEventListener('click', () => {
    if (searchContainer.classList.contains('show-clear')) {
        versionSearch.value = '';
        searchContainer.classList.remove('show-clear');
        performSearch('');
        versionSearch.focus();
    }
});

// добавляем логику для сворачивания/разворачивания поиска
const searchIcon = document.getElementById('searchIcon');

// функция для переключения состояния поиска
function toggleSearch() {
    if (searchContainer.classList.contains('expanded')) {
        // если поисковый запрос пуст, сворачиваем поиск
        if (versionSearch.value.trim() === '') {
            searchContainer.classList.remove('expanded');
        }
    } else {
        // разворачиваем поиск
        searchContainer.classList.add('expanded');
        // устанавливаем фокус на поле поиска после небольшой задержки для анимации
        setTimeout(() => versionSearch.focus(), 300);
    }
}

// обработчик клика на иконку поиска
document.getElementById('searchIcon').addEventListener('click', (e) => {
    if (searchContainer.classList.contains('expanded')) {
        if (versionSearch.value.trim() === '') {
            searchContainer.classList.remove('expanded');
        }
    } else {
        toggleSearch();
    }
    e.stopPropagation();
});

searchContainer.addEventListener('click', (e) => {
    if (!searchContainer.classList.contains('expanded')) {
        toggleSearch();
    }
    e.stopPropagation();
});

// обработчик потери фокуса для сворачивания при клике вне поля поиска
document.addEventListener('click', (e) => {
    // если клик вне контейнера поиска и поле поиска пусто
    if (!searchContainer.contains(e.target) && versionSearch.value.trim() === '') {
        searchContainer.classList.remove('expanded');
    }
});

// отменяем всплытие события при клике на контейнер поиска,
// чтобы не срабатывал обработчик document.click
searchContainer.addEventListener('click', (e) => {
    e.stopPropagation();
});

// код для работы с комментариями по версиям
let commentsModal;
function ensureCommentsModal() {
    if (document.getElementById('commentsModal')) return document.getElementById('commentsModal');

    const template = document.getElementById('comments-modal-template');
    if (template) {
        const modalClone = template.content.cloneNode(true);
        const modalElement = modalClone.querySelector('.comments-modal');
        modalElement.id = 'commentsModal';
        document.body.appendChild(modalElement);
        commentsModal = modalElement;

        // Re-attach event listeners after creating the modal from template
        modalElement.querySelector('.comments-close-button').addEventListener('click', closeModal);
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                closeModal();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && commentsModal.style.display === 'flex') {
                closeModal();
            }
        });

        return modalElement;
    }
    return null;
}

// функция для удаления giscus фрейма и скрипта
function cleanupGiscus() {
    const commentsContainer = document.getElementById('comments-container');
    if (commentsContainer) {
        commentsContainer.innerHTML = '';
    }

    const oldGiscusFrame = document.querySelector('iframe.giscus-frame');
    if (oldGiscusFrame) {
        oldGiscusFrame.remove();
    }

    const oldGiscusScript = document.getElementById('giscus-comments-script');
    if (oldGiscusScript) {
        oldGiscusScript.remove();
    }
}

// отслеживаем загрузку giscus
let giscusLoaded = false;
let currentCommentKey = '';
let scrollPosition = 0;
const commentRefreshTimers = new Map();

// функция открытия модального окна с блокировкой прокрутки основной страницы
function openModal() {
    const modal = ensureCommentsModal();
    if (!modal) return;
    commentsModal = modal;

    scrollPosition = window.pageYOffset;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    commentsModal.style.display = 'flex';

    // добавляем небольшую задержку перед показом для плавности
    setTimeout(() => {
        commentsModal.classList.add('show');
        const closeButton = commentsModal.querySelector('.comments-close-button');
        if (closeButton) closeButton.focus();
    }, 10);
}

// функция закрытия модального окна с восстановлением прокрутки
function closeModal() {
    // Анимация скрытия
    commentsModal.classList.remove('show');

    // ждем завершения анимации перед полным скрытием
    setTimeout(() => {
        commentsModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        document.body.style.position = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollPosition);
        cleanupGiscus();

        // обновляем счетчики комментариев после закрытия модального окна
        // используем запрос только для комментариев
        if (currentCommentKey) {
            const t = commentRefreshTimers.get(currentCommentKey);
            if (t) {
                clearTimeout(t);
                commentRefreshTimers.delete(currentCommentKey);
            }
            refreshCommentCountForKey(currentCommentKey);
        }
    }, 300); // задержка должна соответствовать времени transition для opacity
}

// слушаем сообщения от giscus iframe
window.addEventListener('message', function (e) {
    if (e.origin !== 'https://giscus.app') return;

    if (!e.data || typeof e.data !== 'object') return;

    try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

        if (data.giscus) {
            giscusLoaded = true;

            if (data.giscus.error === null && data.giscus.eventName) {

                if (data.giscus.eventName === 'comment' ||
                    data.giscus.eventName === 'reply') {
                    if (currentCommentKey) {
                        const prev = commentRefreshTimers.get(currentCommentKey);
                        if (prev) clearTimeout(prev);
                        const timer = setTimeout(() => {
                            commentRefreshTimers.delete(currentCommentKey);
                            refreshCommentCountForKey(currentCommentKey);
                        }, 800);
                        commentRefreshTimers.set(currentCommentKey, timer);
                    }
                }
            }
        }
    } catch (error) {
        console.log('Error processing giscus message:', error);
    }
});


function openComments(target) {
    ensureCommentsModal();
    document.getElementById('comment-version-title').textContent = target.modalLabel;
    const commentsContainer = document.getElementById('comments-container');
    cleanupGiscus();

    // ссылка в шапке дискуссии
    let backlink = document.querySelector('meta[name="giscus:backlink"]');
    if (!backlink) {
        backlink = document.createElement('meta');
        backlink.setAttribute('name', 'giscus:backlink');
        document.head.appendChild(backlink);
    }
    backlink.setAttribute('content', target.backlink);

    // giscus config
    const giscusScript = document.createElement('script');
    giscusScript.id = 'giscus-comments-script';
    giscusScript.src = 'https://giscus.app/client.js';
    giscusScript.setAttribute('data-repo', 'LoaderSpot/table');
    giscusScript.setAttribute('data-repo-id', 'R_kgDOOANMeQ');
    giscusScript.setAttribute('data-category', 'Comments');
    giscusScript.setAttribute('data-category-id', 'DIC_kwDOOANMec4Cn2gF');
    giscusScript.setAttribute('data-mapping', 'specific');
    giscusScript.setAttribute('data-term', target.commentKey);
    giscusScript.setAttribute('data-strict', '0');
    giscusScript.setAttribute('data-reactions-enabled', '1');
    giscusScript.setAttribute('data-emit-metadata', '1');
    giscusScript.setAttribute('data-input-position', 'bottom');
    giscusScript.setAttribute('data-theme', 'noborder_dark');
    giscusScript.setAttribute('data-lang', 'en');
    giscusScript.setAttribute('data-loading', 'lazy');
    giscusScript.setAttribute('crossorigin', 'anonymous');
    giscusScript.async = true;

    giscusScript.onerror = function () {
        commentsContainer.innerHTML = '<div class="giscus-error">Failed to load comments. Please try again later.</div>';
    };

    commentsContainer.appendChild(giscusScript);
    currentCommentKey = target.commentKey;
    giscusLoaded = false;

    openModal();
}

// функция для обработки данных дискуссий и обновления счетчиков
function processDiscussionData(discussions) {
    if (!discussions) return;

    discussions.forEach(discussion => {
        if (!discussion.title) return;

        const commentKey = discussion.title;
        const newCount = discussion.commentCount;

        if (commentCountCache[commentKey] !== newCount) {
            commentCountCache[commentKey] = newCount;
            updateCommentCountForKey(commentKey, newCount);
        }
    });
}

async function refreshCommentCountForKey(commentKey) {
    // используем запрос только для комментариев
    await loadAllData(true, true);

    // после обновления счетчиков комментариев, обновляем UI для конкретной цели
    updateCommentCountForKey(commentKey, commentCountCache[commentKey] || 0);
}

// функция для обновления существующих кнопок комментариев после загрузки данных
function updateExistingCommentButtons() {
    document.querySelectorAll('.comment-button').forEach(button => {
        const commentKey = button.dataset.commentKey;
        if (!commentKey) return;
        applyCommentCountToButton(button, commentCountCache[commentKey] || 0);
    });
}

function updateCommentCountForKey(commentKey, count) {
    document.querySelectorAll(`.comment-button[data-comment-key="${commentKey}"]`).forEach(button => {
        applyCommentCountToButton(button, count);
    });
}

function formatCommentCount(count) {
    const numeric = Number(count || 0);
    if (numeric <= 0) return '';
    if (numeric > 99) return '99+';
    return `+${numeric}`;
}

function applyCommentCountToButton(button, count) {
    const numeric = Number(count || 0);
    const existing = button.querySelector('.comment-count');

    if (numeric > 0) {
        const badge = existing || document.createElement('span');
        if (!existing) {
            badge.className = 'comment-count';
            button.appendChild(badge);
        }
        badge.textContent = formatCommentCount(numeric);
        badge.title = `${numeric} comments`;
        button.classList.add('has-comments');
        return;
    }

    if (existing) existing.remove();
    button.classList.remove('has-comments');
}

function buildVersionBacklink(version, os) {
    const versionParamNames = {
        win: 'winVersion',
        mac: 'macVersion',
        linux: 'linuxVersion'
    };
    const origin = window.location.origin || 'https://loadspot.pages.dev';
    const url = new URL(`${origin}${ROUTE_PATHS.versions}`);
    url.searchParams.set('os', os);

    const versionParam = versionParamNames[os];
    if (versionParam) {
        url.searchParams.set(versionParam, version);
    }

    return url.toString();
}

function createCommentButton(target, options = {}) {
    const logicalId = String(target);
    const commentKey = options.commentKey || buildVersionCommentKey(logicalId);
    const modalLabel = options.modalLabel || `version ${logicalId}`;
    const backlink = options.backlink || buildVersionBacklink(logicalId, options.os || currentOS);

    const commentButton = document.createElement('button');
    commentButton.className = 'comment-button comment-button-compact';
    commentButton.dataset.commentKey = commentKey;
    commentButton.type = 'button';
    commentButton.title = `Open comments for ${modalLabel}`;
    commentButton.setAttribute('aria-label', `Open comments for ${modalLabel}`);

    const commentIconTemplate = document.getElementById('comment-icon-template');
    if (commentIconTemplate) {
        commentButton.appendChild(commentIconTemplate.content.cloneNode(true));
    } else {
        commentButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 17.5H6l-2.5 2v-3.244A5.9 5.9 0 0 1 2.5 13a6.5 6.5 0 0 1 6.5-6.5h6A6.5 6.5 0 0 1 21.5 13a6.5 6.5 0 0 1-6.5 6.5H10"/><path d="M8.5 11h7"/><path d="M8.5 14h4.5"/></svg>`;
    }

    if (commentCountCache[commentKey]) {
        applyCommentCountToButton(commentButton, commentCountCache[commentKey]);
    }

    commentButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openComments({ commentKey, modalLabel, backlink });
    });

    return commentButton;
}

// функция для создания элементов версий
function createVersionElement(version, searchTerm, commentTarget = null, commentOs = currentOS) {
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
            backlink: buildVersionBacklink(commentTarget, commentOs)
        }));
    }

    if (commentTarget) {
        topRow.appendChild(controlsSlot);
    }

    versionText.appendChild(topRow);
    versionText.appendChild(bottomRow);

    return { versionText, shortVersionElem, topRow, controlsSlot, spoilerSlot, commentSlot };
}

function createVersionPart(text, searchTerm, className, toastMessage) {
    const element = document.createElement('span');
    element.className = className;
    element.innerHTML = searchTerm ? highlight(text, searchTerm) : text;

    element.addEventListener('click', () => {
        copyTextToClipboard(text, toastMessage);
    });

    return element;
}

// создание ячейки с кнопкой скачивания
function createDownloadCell(link, version, os, arch) {
    const actionCell = document.createElement('td');
    actionCell.className = 'action-cell';

    const downloadContainer = document.createElement('div');
    downloadContainer.className = 'download-container';

    const downloadLink = document.createElement('a');
    downloadLink.className = 'download-link';
    downloadLink.removeAttribute('href');

    // формируем тултип в зависимости от OS
    const extensions = { win: '.exe', mac: '.tbz', linux: '.deb' };
    const extension = extensions[os] || '';
    downloadLink.title = `download ${version}-${arch}${extension}`;

    downloadLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleDownload(downloadLink, link, version, os, arch);
    });

    const iconTemplate = document.getElementById('download-icon-template');
    if (iconTemplate) {
        downloadLink.appendChild(iconTemplate.content.cloneNode(true));
    }
    downloadContainer.appendChild(downloadLink);

    const copyLinkButton = document.createElement('button');
    copyLinkButton.type = 'button';
    copyLinkButton.className = 'copy-download-link';
    copyLinkButton.title = `copy download link for ${version}-${arch}${extension}`;
    copyLinkButton.setAttribute('aria-label', `Copy download link for ${version} ${arch}`);

    const copyIconTemplate = document.getElementById('copy-link-icon-template');
    if (copyIconTemplate) {
        copyLinkButton.appendChild(copyIconTemplate.content.cloneNode(true));
    }

    copyLinkButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyTextToClipboard(link, 'Download link copied to clipboard');
    });

    downloadContainer.appendChild(copyLinkButton);

    const downloadCountSpan = document.createElement('div');
    downloadCountSpan.className = 'download-count-slot';
    downloadCountSpan.style.fontSize = 'small';
    downloadContainer.appendChild(downloadCountSpan);

    actionCell.appendChild(downloadContainer);

    // обновляем счетчик скачиваний
    updateDownloadCount(link, downloadCountSpan, version, os, arch);

    return actionCell;
}

const markdownPageCache = new Map();
const markdownPageRequests = new Map();
let markdownNavigationToken = 0;

function loadMarkdownContent(mdFile) {
    if (markdownPageCache.has(mdFile)) {
        return Promise.resolve(markdownPageCache.get(mdFile));
    }

    if (!markdownPageRequests.has(mdFile)) {
        const request = fetch(mdFile)
            .then(response => {
                if (!response.ok) throw new Error("Error loading " + mdFile);
                return response.text();
            })
            .then(mdText => {
                const processedMd = processMarkdownSpacing(mdText);
                const html = marked.parse(processedMd);
                markdownPageCache.set(mdFile, html);
                markdownPageRequests.delete(mdFile);
                return html;
            })
            .catch(err => {
                markdownPageRequests.delete(mdFile);
                throw err;
            });

        markdownPageRequests.set(mdFile, request);
    }

    return markdownPageRequests.get(mdFile);
}

// загрузка markdown страниц по текущему route
function loadMarkdownPage() {
    updateNavActive();
    const pageKey = getCurrentPageKey();
    const mdContainer = document.getElementById('markdownContainer');
    const tableContainer = document.getElementById('tableContainer');

    if (pageKey === 'faq' || pageKey === 'links') {
        // скрываем таблицу и показываем контейнер для markdown
        tableContainer.style.display = "none";
        mdContainer.style.display = "block"; // Показываем контейнер, чтобы было куда грузить

        let mdFile = pageKey === 'faq' ? "content/faq.md" : "content/links.md";
        const currentToken = ++markdownNavigationToken;

        loadMarkdownContent(mdFile)
            .then(html => {
                if (currentToken !== markdownNavigationToken) return;
                mdContainer.innerHTML = html;
            })
            .catch(err => {
                if (currentToken !== markdownNavigationToken) return;
                mdContainer.innerHTML = "<p>Error loading page</p>";
                console.error(err);
            });
    } else {
        // Показываем таблицу и скрываем контейнер markdown
        markdownNavigationToken++;
        mdContainer.style.display = "none";
        tableContainer.style.display = "block";
        ensureVersionsAppInitialized().catch(err => console.error('Error loading version data:', err));
    }
}

// Обработчик навигации по истории браузера
window.addEventListener('popstate', () => {
    loadMarkdownPage();
    updateNavActive();
});

// обновление active-состояния навигационных ссылок по route
function updateNavActive() {
    const currentPage = getCurrentPageKey();
    document.querySelectorAll('.nav-center a').forEach(link => {
        const targetPage = link.dataset.page;
        if (targetPage === currentPage) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

// Вызываем при первой загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    migrateLegacyRoute();
    initializeApp().catch(err => console.error('Error loading version data:', err));
    loadMarkdownPage(); // Сначала проверяем и загружаем markdown

    document.querySelectorAll('.nav-center a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
                return;
            }

            e.preventDefault();
            navigateToPage(link.dataset.page);
        });
    });
});

