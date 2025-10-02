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

if (urlParams.get('sort') && !urlParams.get('sortVersion') && !urlParams.get('sortSize')) {
    sortVersionAscending = urlParams.get('sort') === 'asc';
}

const osVersionFilters = {
    win: [
        { version: '1.2.5.1006', label: '7-8.1', full: 'Windows 7-8.1' }
    ],
    mac: [
        { version: '1.2.37.701', label: '10.15', full: 'macOS 10.15' },
        { version: '1.2.20.1218', label: '10.14/10.13', full: 'macOS 10.14 / 10.13' },
        { version: '1.1.89.862', label: '10.12/10.11', full: 'macOS 10.12 / OS X 10.11' }
    ],
    linux: [
        // { version: '1.2.40.651', label: 'Latest', full: 'Latest stable' }
    ]
};

function closeAllOsVersionDropdowns() {
    document.querySelectorAll('.os-version-dropdown').forEach(dd => {
        dd.style.display = 'none';
    });
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
                                closeAllOsVersionDropdowns();
                                dropdown.style.display = 'block';
                            }
                        }
                    }
                });

                const dropdown = container.querySelector('.os-version-dropdown');
                document.addEventListener('click', () => {
                    if (dropdown) {
                        dropdown.style.display = 'none';
                    }
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

// глобальный кэш для результатов HEAD-запросов
const headCache = new Map();

// флаг для отслеживания необходимости отложить HEAD-запросы
let headRequestsStarted = false;

// таймер для начала HEAD-запросов даже если Worker не ответил
let headRequestsTimer = null;

// очередь HEAD-запросов
const pendingHeadRequests = [];

// функция для выполнения отложенных HEAD-запросов
function startHeadRequests() {
    if (headRequestsStarted) return; // Если запросы уже запущены, не запускаем снова

    headRequestsStarted = true;
    // отменяем таймер, если он был установлен
    if (headRequestsTimer) {
        clearTimeout(headRequestsTimer);
        headRequestsTimer = null;
    }

    // выполняем все HEAD-запросы из очереди
    for (const request of pendingHeadRequests) {
        executeHeadRequest(request.dateCell, request.sizeCell, request.url);
    }
    pendingHeadRequests.length = 0; // Очищаем очередь
}

// функция updateLinkInfo с использованием очереди
function updateLinkInfo(dateCell, sizeCell, url, isVisible = true) {
    if (!isVisible) {
        return;
    }

    // Добавляем запрос в очередь
    pendingHeadRequests.push({ dateCell, sizeCell, url });

    // если запросы уже запущены, выполняем немедленно
    if (headRequestsStarted) {
        executeHeadRequest(dateCell, sizeCell, url);
        // и удаляем из очереди
        const index = pendingHeadRequests.findIndex(req =>
            req.dateCell === dateCell && req.sizeCell === sizeCell && req.url === url);
        if (index > -1) {
            pendingHeadRequests.splice(index, 1);
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
    if (!sizeInBytes) return '—';
    return (parseInt(sizeInBytes, 10) / (1024 * 1024)).toFixed(2) + ' MB';
}

// функция для выполнения HEAD-запроса
async function executeHeadRequest(dateCell, sizeCell, url) {

    const dateCellTarget = dateCell.querySelector('.cell-wrapper') || dateCell;
    const sizeCellTarget = sizeCell.querySelector('.cell-wrapper') || sizeCell;

    if (headCache.has(url)) {
        const cached = headCache.get(url);
        dateCellTarget.textContent = cached.date;
        sizeCellTarget.textContent = cached.size;
        return;
    }
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const lastModified = response.headers.get('Last-Modified');
        const contentLength = response.headers.get('Content-Length');

        const formattedDate = formatDate(lastModified);
        const sizeMb = formatSize(contentLength);

        headCache.set(url, { date: formattedDate, size: sizeMb });

        dateCellTarget.textContent = formattedDate;
        sizeCellTarget.textContent = sizeMb;
    } catch (error) {
        console.error('Error getting headers', error);

        dateCellTarget.textContent = '—';
        sizeCellTarget.textContent = '—';

        headCache.set(url, { date: '—', size: '—' });
    }
}

function preventScroll(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
}

function disableScroll() {
    document.body.style.overflow = 'hidden';
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('keydown', (e) => {
        if ([32, 33, 34, 35, 36, 37, 38, 39, 40].includes(e.keyCode)) {
            e.preventDefault();
        }
    });
}

function enableScroll() {
    document.body.style.overflow = '';
    document.removeEventListener('wheel', preventScroll, { passive: false });
    document.removeEventListener('touchmove', preventScroll, { passive: false });
}
async function preloadSizesForSorting(dataSource) {
    const linksToFetch = [];
    
    dataSource.forEach(([versionKey, versionData]) => {
        if (!versionData.links[currentOS]) return;
        
        Object.keys(versionData.links[currentOS]).forEach(arch => {
            if (currentArch !== 'all' && arch !== currentArch) return;
            
            const link = versionData.links[currentOS][arch];
            if (link && !headCache.has(link)) {
                linksToFetch.push(link);
            }
        });
    });
    
    if (linksToFetch.length === 0) return; 
    
    const loadingIndicator = document.getElementById('sizeLoadingIndicator');
    const loadingText = loadingIndicator?.querySelector('.loading-text');
    const tbody = document.getElementById('versions-container');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
        if (loadingText) {
            loadingText.textContent = `0%`;
        }
    }
    
    // очищаем tbody и добавляем skeleton эффект
    if (tbody) {
        const skeletonRowsHTML = Array.from({ length: 15 }, () => `
            <tr class="skeleton-row">
                <td><div class="skeleton-box skeleton-version"></div></td>
                <td><div class="skeleton-box skeleton-arch"></div></td>
                <td><div class="skeleton-box skeleton-date"></div></td>
                <td><div class="skeleton-box skeleton-size"></div></td>
                <td class="skeleton-download-cell">
                    <svg class="skeleton-download-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M12 15.575c-.183 0-.36-.073-.49-.203l-4.095-4.095a.694.694 0 01.981-.981L12 13.901l3.604-3.604a.694.694 0 01.981.98l-4.095 4.095a.692.692 0 01-.49.203z"/>
                        <path d="M12 15.575a.694.694 0 01-.694-.694V3.694a.694.694 0 011.388 0v11.187c0 .383-.31.694-.694.694z"/>
                        <path d="M16.306 20.306H7.694a4.167 4.167 0 01-4.162-4.163v-2.777a.694.694 0 011.388 0v2.777a2.778 2.778 0 002.774 2.775h8.612a2.778 2.778 0 002.775-2.775v-2.777a.694.694 0 011.387 0v2.777a4.167 4.167 0 01-4.162 4.163z"/>
                    </svg>
                </td>
            </tr>
        `).join('');
        
        tbody.innerHTML = skeletonRowsHTML;
        tbody.classList.add('table-skeleton-overlay');
        
        const tableContainer = document.getElementById('tableContainer');
        if (tableContainer) {
            tableContainer.style.overflow = 'hidden';
        }
        disableScroll();
    }
    
    const maxConcurrent = 15;
    let completed = 0;
    
    const promises = linksToFetch.map(link => 
        (async () => {
            try {
                const response = await fetch(link, { method: 'HEAD' });
                const lastModified = response.headers.get('Last-Modified');
                const contentLength = response.headers.get('Content-Length');
                
                const formattedDate = formatDate(lastModified);
                const sizeMb = formatSize(contentLength);
                
                headCache.set(link, { date: formattedDate, size: sizeMb });
            } catch (error) {
                headCache.set(link, { date: '—', size: '—' });
            }
            
            completed++;
            if (loadingText) {
                const percent = Math.round((completed / linksToFetch.length) * 100);
                loadingText.textContent = `${percent}%`;
            }
        })()
    );
    
    for (let i = 0; i < promises.length; i += maxConcurrent) {
        await Promise.all(promises.slice(i, i + maxConcurrent));
    }
    
    if (tbody) {
        tbody.classList.remove('table-skeleton-overlay');
        tbody.innerHTML = ''; 
    }
    
    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) {
        tableContainer.style.overflow = '';
    }
    enableScroll();
    
    if (loadingIndicator) {
        setTimeout(() => {
            loadingIndicator.style.display = 'none';
        }, 300);
    }
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

// функция для получения всех данных одним запросом
async function loadAllData(forceUpdate = false, commentsOnly = false) {
    // если запрашиваются только комментарии, проверяем только флаг загрузки комментариев
    if (commentsOnly && commentCountsLoaded && !forceUpdate) {
        return { comments: commentCountCache };
    }

    // для полного запроса проверяем оба флага
    if (!commentsOnly && countersLoaded && commentCountsLoaded && !forceUpdate) {
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

                if (!commentsOnly && data.downloads) {
                    allDownloadCounters = data.downloads;
                    countersLoaded = true;

                    pendingCounterElements.forEach((counterInfo, counterKey) => {
                        const count = allDownloadCounters[counterKey] || "0";
                        counterInfo.element.innerHTML = count === "0" ? "" :
                            `<span class="download-counter">${formatDownloadCount(count)}</span>`;
                    });
                    pendingCounterElements.clear();

                    startHeadRequests();
                }

                if (data.comments && Array.isArray(data.comments)) {
                    processDiscussionData(data.comments);
                    commentCountsLoaded = true;
                    updateExistingCommentButtons();
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

        // помечаем счетчики как загруженные, чтобы избежать повторных запросов
        if (!commentsOnly) {
            countersLoaded = true;
            startHeadRequests(); // запускаем HEAD-запросы даже при ошибке загрузки данных
        }
        commentCountsLoaded = true;

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

// функция для обработки событий скачивания
function handleDownload(downloadLink, fileUrl, version, os, arch) {

    const countElement = downloadLink.closest('.download-container').querySelector('div');
    const counterKey = generateCounterKey(version, os, arch);

    // увеличиваем счетчик в глобальном объекте
    const newCount = (parseInt(allDownloadCounters[counterKey] || "0", 10) + 1).toString();
    allDownloadCounters[counterKey] = newCount;

    // обновляем UI с новым значением
    countElement.innerHTML = newCount === "0" ? "" :
        `<span class="download-counter">${formatDownloadCount(newCount)}</span>`;

    // скачивание файла не дожидаясь ответа от воркера
    window.open(fileUrl, '_blank');

    fetch(`https://broad-pine-bbc0.amd64fox1.workers.dev/?counter=${encodeURIComponent(counterKey)}`, {
        method: 'GET',
        cache: 'no-store', // не кэшировать запрос
        mode: 'cors',      // CORS режим
        redirect: 'manual' // не следовать редиректам
    }).catch(err => {
        console.error('Worker counter update error:', err);
    });
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
    const archContainer = document.getElementById('arch-filters');

    // для Linux скрываем фильтры архитектур, а не очищаем контейнер
    if (currentOS === 'linux') {
        archContainer.classList.add('hidden');
        return;
    }

    // для других OS показываем и заполняем фильтрами
    archContainer.classList.remove('hidden');
    archContainer.innerHTML = ''; // очистка содержимого

    const archSet = new Set();
    // собираем архитектуры из всех версий для текущей ОС
    allVersions.forEach(([, data]) => {
        if (data.links[currentOS]) {
            Object.keys(data.links[currentOS]).forEach(arch => archSet.add(arch));
        }
    });
    let archArr = [];
    if (currentOS === 'win') {
        // для Windows фиксированный порядок, если присутствуют в данных
        const order = ["x86", "x64", "arm64"];
        archArr = order.filter(arch => archSet.has(arch));
    } else if (currentOS === 'mac') {
        // для mac фиксированный порядок, если присутствуют в данных
        const order = ["intel", "arm64"];
        archArr = order.filter(arch => archSet.has(arch));
    } else {
        archArr = Array.from(archSet).sort();
    }
    // создаем по кнопке для каждой архитектуры
    archArr.forEach(arch => {
        const btn = document.createElement('button');
        btn.className = 'arch-filter-button' + (currentArch === arch ? ' active' : '');
        btn.textContent = arch;
        btn.addEventListener('click', () => {
            // если нажата уже активная кнопка, сбрасываем фильтр
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

function parseSizeToBytes(sizeStr) {
    if (!sizeStr || sizeStr === '—') return 0;
    
    const match = sizeStr.match(/^([\d.]+)\s*(MB|GB|KB|B)?$/i);
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
    enableScroll();

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
        for (const arch of Object.keys(data.links[currentOS])) {
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

    archCombos.forEach((combo) => {
        const row = document.createElement('tr');

        if (isFirstVersionRow) {
            const versionCell = document.createElement('td');
            versionCell.className = 'version-cell';
            versionCell.rowSpan = totalRowsForVersion;

            const versionContainer = document.createElement('div');
            versionContainer.className = 'version-container';

            const versionTextWrapper = document.createElement('div');
            versionTextWrapper.className = 'version-text-wrapper';

            const { versionText, shortVersionElem } = createVersionElement(
                { short: shortVersion, full: data.fullversion },
                searchTerm
            );

            const commentBtn = createCommentButton(versionKey);

            versionTextWrapper.appendChild(versionText);
            shortVersionElem.after(commentBtn);
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
            const archs = Object.keys(versionData.links[os]);
            if (archs.length > 0) {
                const link = versionData.links[os][archs[0]];
                if (headCache.has(link)) {
                    return headCache.get(link).size;
                }
            }
        }
        return '—';
    }
}

function sortAllVersionsFlat(versions, os = currentOS) {
    if (os === 'linux') {
        return versions.sort((a, b) => {
            if (currentSortColumn === 'size') {
                const sizeA = getVersionSize(a, os);
                const sizeB = getVersionSize(b, os);
                const sizeComp = sizeCompare(sizeA, sizeB);
                return sizeComp !== 0 ? sizeComp : versionCompare(a.version.short, b.version.short);
            }
            return versionCompare(a.version.short, b.version.short);
        });
    } else {
        return versions.sort((a, b) => {
            if (currentSortColumn === 'size') {
                const sizeA = getVersionSize(a[1], os);
                const sizeB = getVersionSize(b[1], os);
                const sizeComp = sizeCompare(sizeA, sizeB);
                return sizeComp !== 0 ? sizeComp : versionCompare(a[0], b[0]);
            }
            return versionCompare(a[0], b[0]);
        });
    }
}

function loadMoreLinuxRows() {
    const dataSource = currentSearchResults || linuxVersionsData;
    
    if (currentSortColumn === 'size') {
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
            return a.arch.arch.localeCompare(b.arch.arch);
        });
        
        const endIndex = Math.min(currentIndex + ITEMS_PER_BATCH * 3, flatRows.length);
        
        for (let i = currentIndex; i < endIndex; i++) {
            const item = flatRows[i];
            const row = document.createElement('tr');
            const { versionText, shortVersionElem } = createVersionElement(
                { short: item.version.short, full: item.version.full },
                currentSearchTerm
            );
            
            const versionContainer = document.createElement('div');
            versionContainer.className = 'version-container';
            
            const versionTextWrapper = document.createElement('div');
            versionTextWrapper.className = 'version-text-wrapper';
            
            const commentBtn = createCommentButton(item.version.short);
            
            versionTextWrapper.appendChild(versionText);
            shortVersionElem.after(commentBtn);
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
    groups.sort((a, b) => versionCompare(a[0], b[0]));

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

        const { versionText, shortVersionElem } = createVersionElement(
            { short: displayVersion.version.short, full: displayVersion.version.full },
            currentSearchTerm
        );

        const versionContainer = document.createElement('div');
        versionContainer.className = 'version-container';

        const versionTextWrapper = document.createElement('div');
        versionTextWrapper.className = 'version-text-wrapper';

        const commentBtn = createCommentButton(displayVersion.version.short);

        versionTextWrapper.appendChild(versionText);
        shortVersionElem.after(commentBtn);
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

            versionContainer.appendChild(spoilerBtn);
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
                            currentSearchTerm
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
    
    if (currentSortColumn === 'size') {
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
            
            Object.keys(versionData.links[currentOS]).forEach(arch => {
                if (currentArch !== 'all' && arch !== currentArch) return;
                
                const link = versionData.links[currentOS][arch];
                if (link) {
                    let size = '—';
                    let date = '—';
                    if (headCache.has(link)) {
                        const cached = headCache.get(link);
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
            return a.arch.localeCompare(b.arch);
        });
        
        const endIndex = Math.min(currentIndex + ITEMS_PER_BATCH * 3, flatRows.length);
        
        for (let i = currentIndex; i < endIndex; i++) {
            const item = flatRows[i];
            const row = document.createElement('tr');
            const { versionText, shortVersionElem } = createVersionElement(
                { short: item.versionKey, full: item.versionData.fullversion },
                currentSearchTerm
            );
            
            const versionContainer = document.createElement('div');
            versionContainer.className = 'version-container';
            
            const versionTextWrapper = document.createElement('div');
            versionTextWrapper.className = 'version-text-wrapper';
            
            const commentBtn = createCommentButton(item.versionKey);
            
            versionTextWrapper.appendChild(versionText);
            shortVersionElem.after(commentBtn);
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
            
            if (!headCache.has(item.link)) {
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
    groups.sort((a, b) => versionCompare(a[0], b[0]));

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
                const versionContainer = displayVersionRows[0].querySelector('.version-cell .version-container');
                if (versionContainer) {
                    const hiddenCount = hiddenVersions.length;
                    const spoilerBtn = createSpoiler(groupKey, hiddenCount);
                    const hasMatchInHidden = hasSearchMatchInHiddenVersions(visibleVersions, currentSearchTerm, 'winmac');
                    const hasVersionFilterInHidden = currentVersionFilter && hiddenVersions.some(([v]) => v === currentVersionFilter);

                    if (hasMatchInHidden || hasVersionFilterInHidden) {
                        spoilerBtn.classList.add('expanded');
                    }

                    versionContainer.appendChild(spoilerBtn);
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

                        if (headCache.has(url)) {

                            const cached = headCache.get(url);
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

    const counterText = document.createElement('span');
    counterText.className = 'spoiler-counter-text';
    const plural = hiddenCount > 1 ? 's' : '';
    counterText.textContent = `${hiddenCount} more build${plural}`;

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

// функция для запуска ленивой загрузки в зависимости от ОС
function startLazyLoading() {
    container.innerHTML = '';
    currentIndex = 0;

    const dataSource = getCurrentDataSource();

    if (!dataSource || dataSource.length === 0) {
        showNoResults();
        return;
    }

    if (currentOS !== 'linux') {
        const filteredVersions = dataSource.filter(([versionKey, data]) => {
            if (!data.links[currentOS]) return false;

            if (currentArch !== 'all' && !data.links[currentOS][currentArch]) return false;

            if (currentOS === 'win' && currentWinVersionFilter) {
                return compareVersions(versionKey, currentWinVersionFilter) <= 0;
            }
            if (currentOS === 'mac' && currentMacVersionFilter) {
                return compareVersions(versionKey, currentMacVersionFilter) <= 0;
            }
            if (currentOS === 'linux' && currentLinuxVersionFilter) {
                return compareVersions(versionKey, currentLinuxVersionFilter) <= 0;
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

        if (currentSortColumn === 'size') {
            const sizeA = getVersionSize(dataA, currentOS);
            const sizeB = getVersionSize(dataB, currentOS);
            const sizeComp = sizeCompare(sizeA, sizeB);
            return sizeComp !== 0 ? sizeComp : versionCompare(versionKeyA, versionKeyB);
        }

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
        return getSortMultiplier() * versionKeyA.localeCompare(versionKeyB, undefined, { numeric: true, sensitivity: 'base' });
    });
}

// функция поиска для всех OS
function performSearch(term) {
    term = term.trim().toLowerCase();
    container.style.opacity = "0";
    currentSearchTerm = term;
    observer.unobserve(sentinel);

    syncUrlWithState();

    setTimeout(() => {
        if (term === "") {
            currentSearchResults = null;
            startLazyLoading();
            return;
        }

        container.innerHTML = "";
        currentIndex = 0;

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
                if (currentSortColumn === 'size') {
                    const sizeA = getVersionSize(a, 'linux');
                    const sizeB = getVersionSize(b, 'linux');
                    const sizeComp = sizeCompare(sizeA, sizeB);
                    return sizeComp !== 0 ? sizeComp : versionCompare(a.version.short, b.version.short);
                }
                
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

                return getSortMultiplier() * a.version.short.localeCompare(b.version.short, undefined, { numeric: true });
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
    
    params.sort = null;

    const url = new URL(window.location);

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
    
    if (versionArrow) {
        const versionSvg = versionArrow.querySelector('svg');
        if (versionSvg) {
            if (currentSortColumn === 'version') {
                versionArrow.style.opacity = '1';
                versionSvg.style.transform = sortVersionAscending ? 'rotate(0deg)' : 'rotate(180deg)';
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
                sizeSvg.style.transform = sortSizeAscending ? 'rotate(0deg)' : 'rotate(180deg)';
            } else {
                sizeArrow.style.opacity = '0';
            }
        }
    }
}

function toggleVersionSort() {
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
        const response = await fetch('versions_deb.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const linuxData = await response.json();

        linuxVersionsData = Object.entries(linuxData).map(([versionKey, data]) => {
            return {
                version: {
                    short: versionKey,
                    full: data.fullversion
                },
                architectures: Object.entries(data.links).map(([arch, link]) => {
                    // Рассчитываем размер в MB
                    const sizeInMB = data.size ?
                        (parseInt(data.size, 10) / (1024 * 1024)).toFixed(2) + ' MB' :
                        '—';

                    return {
                        arch,
                        link,
                        date: data.data || '—',
                        size: sizeInMB
                    };
                })
            };
        });

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

async function initializeApp() {
    // Проверяем хэш перед загрузкой данных таблицы
    const hash = window.location.hash;
    if (hash === "#faq" || hash === "#links") {
        return; // Не инициализируем таблицу, если это markdown-страница
    }

    try {
        const response = await fetch('versions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        container.innerHTML = '';
        allVersions = Object.entries(data);

        // запускаем загрузку всех данных
        loadAllData().catch(err => console.error('Data fetch error:', err));

        // устанавливаем таймер для запуска HEAD-запросов если Worker не отвечает
        if (headRequestsTimer) {
            clearTimeout(headRequestsTimer);
        }
        headRequestsTimer = setTimeout(() => {
            startHeadRequests();
        }, 2000);

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
                loadLinuxPackages();
            } else {
                startLazyLoading();
                updateArchFilters();
            }
        }
    } catch (err) {
        console.error('Error loading version data:', err);
        container.innerHTML = '<tr><td colspan="5">Failed to load version data.</td></tr>';
    }
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
            enableScroll();
        }

        // сброс фильтра архитектуры при необходимости
        if (currentOS !== 'linux') {
            let availableArch = new Set();
            allVersions.forEach(([, data]) => {
                if (data.links[currentOS]) {
                    Object.keys(data.links[currentOS]).forEach(arch => availableArch.add(arch));
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

initializeApp();

// код для работы с комментариями по версиям
const commentsModal = document.createElement('div');
commentsModal.className = 'comments-modal';
commentsModal.setAttribute('role', 'dialog');
commentsModal.setAttribute('aria-modal', 'true');
commentsModal.setAttribute('aria-labelledby', 'comments-modal-title');
commentsModal.innerHTML = `
<div class="comments-modal-content">
  <div class="comments-modal-header">
    <h3 class="comments-modal-title" id="comments-modal-title">Comments for version <span id="comment-version-title"></span></h3>
    <button class="comments-close-button" aria-label="Close comments">&times;</button>
  </div>
  <div class="comments-modal-body" id="comments-container" role="main">
    <!-- Здесь будет инициализирован giscus -->
  </div>
</div>
`;
document.body.appendChild(commentsModal);

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
let currentCommentVersion = '';
let scrollPosition = 0;
const commentRefreshTimers = new Map();

// функция открытия модального окна с блокировкой прокрутки основной страницы
function openModal() {
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
        if (currentCommentVersion) {
            const t = commentRefreshTimers.get(currentCommentVersion);
            if (t) {
                clearTimeout(t);
                commentRefreshTimers.delete(currentCommentVersion);
            }
            refreshCommentCountForVersion(currentCommentVersion);
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
                    if (currentCommentVersion) {
                        const prev = commentRefreshTimers.get(currentCommentVersion);
                        if (prev) clearTimeout(prev);
                        const timer = setTimeout(() => {
                            commentRefreshTimers.delete(currentCommentVersion);
                            refreshCommentCountForVersion(currentCommentVersion);
                        }, 800);
                        commentRefreshTimers.set(currentCommentVersion, timer);
                    }
                }
            }
        }
    } catch (error) {
        console.log('Error processing giscus message:', error);
    }
});

// обработчик закрытия модального окна
document.querySelector('.comments-close-button').addEventListener('click', closeModal);

// закрытие модального окна при клике вне содержимого
window.addEventListener('click', (e) => {
    if (e.target === commentsModal) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && commentsModal.style.display === 'flex') {
        closeModal();
    }
});

// функция открытия модального окна с комментариями для версии
function openComments(version) {
    document.getElementById('comment-version-title').textContent = version;
    const commentsContainer = document.getElementById('comments-container');
    cleanupGiscus();

    // ссылка на версию в шапке дискуссии 
    let backlink = document.querySelector('meta[name="giscus:backlink"]');
    if (!backlink) {
        backlink = document.createElement('meta');
        backlink.setAttribute('name', 'giscus:backlink');
        document.head.appendChild(backlink);
    }
    backlink.setAttribute('content', `https://loadspot.pages.dev/?os=win&winVersion=${version}`);

    // giscus config
    const giscusScript = document.createElement('script');
    giscusScript.id = 'giscus-comments-script';
    giscusScript.src = 'https://giscus.app/client.js';
    giscusScript.setAttribute('data-repo', 'LoaderSpot/table');
    giscusScript.setAttribute('data-repo-id', 'R_kgDOOANMeQ');
    giscusScript.setAttribute('data-category', 'Comments');
    giscusScript.setAttribute('data-category-id', 'DIC_kwDOOANMec4Cn2gF');
    giscusScript.setAttribute('data-mapping', 'specific');
    giscusScript.setAttribute('data-term', `spotify-version-${version}`);
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
    currentCommentVersion = version;
    giscusLoaded = false;

    openModal();
}

// функция для обработки данных дискуссий и обновления счетчиков
function processDiscussionData(discussions) {
    if (!discussions) return;

    discussions.forEach(discussion => {
        if (discussion.title && discussion.title.startsWith('spotify-version-')) {
            const version = discussion.title.replace('spotify-version-', '');
            const newCount = discussion.commentCount;

            if (commentCountCache[version] !== newCount) {
                commentCountCache[version] = newCount;
                updateCommentCountForVersion(version, newCount);
            }
        }
    });
}

//  функция для обновления счетчика комментариев для конкретной версии
async function refreshCommentCountForVersion(version) {
    // используем запрос только для комментариев
    await loadAllData(true, true);

    // после обновления счетчиков комментариев, обновляем UI для конкретной версии
    updateCommentCountForVersion(version, commentCountCache[version] || 0);
}

// функция для обновления существующих кнопок комментариев после загрузки данных
function updateExistingCommentButtons() {
    document.querySelectorAll('.comment-button').forEach(button => {
        const version = button.dataset.version;
        if (!version) return;
        const count = Number(commentCountCache[version] || 0);
        const existing = button.querySelector('.comment-count');
        if (count > 0) {
            const badge = existing || document.createElement('span');
            if (!existing) {
                badge.className = 'comment-count';
                button.appendChild(badge);
            }
            badge.textContent = count;
            button.classList.add('has-comments');
        } else {
            if (existing) existing.remove();
            button.classList.remove('has-comments');
        }
    });
}

// функция для обновления счетчика комментариев для конкретной версии
function updateCommentCountForVersion(version, count) {
    // находим все кнопки комментариев для данной версии
    document.querySelectorAll(`.comment-button[data-version="${version}"]`).forEach(button => {
        const numeric = Number(count || 0);
        const existing = button.querySelector('.comment-count');
        if (numeric > 0) {
            const badge = existing || document.createElement('span');
            if (!existing) {
                badge.className = 'comment-count';
                button.appendChild(badge);
            }
            badge.textContent = numeric;
            button.classList.add('has-comments');
        } else {
            if (existing) existing.remove();
            button.classList.remove('has-comments');
        }
    });
}

// функция для создания кнопки комментариев с отображением количества
function createCommentButton(version) {
    const commentButton = document.createElement('button');
    commentButton.className = 'comment-button';
    commentButton.dataset.version = version;
    commentButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    commentButton.title = `Comments for version ${version}`;

    // если данные о комментариях уже загружены, добавляем счетчик
    if (commentCountCache[version]) {
        const countBadge = document.createElement('span');
        countBadge.className = 'comment-count';
        countBadge.textContent = commentCountCache[version];
        commentButton.appendChild(countBadge);

        // если есть комментарии, делаем бейдж более заметным
        if (commentCountCache[version] > 0) {
            commentButton.classList.add('has-comments');
        }
    }

    commentButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openComments(version);
    });

    return commentButton;
}

// функция для создания элементов версий
function createVersionElement(version, searchTerm) {
    const versionText = document.createElement('div');
    versionText.className = 'version-text';

    const shortVersionElem = createVersionPart(version.short || version, searchTerm, 'short-version', 'Short version copied to clipboard');
    versionText.appendChild(shortVersionElem);

    if (version.full) {
        const fullVersionElem = createVersionPart(version.full, searchTerm, 'full-version', 'Full version copied to clipboard');
        versionText.appendChild(fullVersionElem);
    }

    return { versionText, shortVersionElem };
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

const downloadIcon = `
<svg class="download-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 15.575c-.183 0-.36-.073-.49-.203l-4.095-4.095a.694.694 0 01.981-.981L12 13.901l3.604-3.604a.694.694 0 01.981.98l-4.095 4.095a.692.692 0 01-.49.203z"/>
  <path d="M12 15.575a.694.694 0 01-.694-.694V3.694a.694.694 0 011.388 0v11.187c0 .383-.31.694-.694.694z"/>
  <path d="M16.306 20.306H7.694a4.167 4.167 0 01-4.162-4.163v-2.777a.694.694 0 011.388 0v2.777a2.778 2.778 0 002.774 2.775h8.612a2.778 2.778 0 002.775-2.775v-2.777a.694.694 0 011.387 0v2.777a4.167 4.167 0 01-4.162 4.163z"/>
</svg>
`;

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

    downloadLink.innerHTML = downloadIcon;
    downloadContainer.appendChild(downloadLink);

    const downloadCountSpan = document.createElement('div');
    downloadCountSpan.style.fontSize = 'small';
    downloadContainer.appendChild(downloadCountSpan);

    actionCell.appendChild(downloadContainer);

    // обновляем счетчик скачиваний
    updateDownloadCount(link, downloadCountSpan, version, os, arch);

    return actionCell;
}

// загрузка markdown страниц по hash
function loadMarkdownPage() {
    updateNavActive();
    const hash = window.location.hash;
    const mdContainer = document.getElementById('markdownContainer');
    const tableContainer = document.getElementById('tableContainer');

    if (hash === "#faq" || hash === "#links") {
        // скрываем таблицу и показываем контейнер для markdown
        tableContainer.style.display = "none";
        mdContainer.style.display = "block"; // Показываем контейнер, чтобы было куда грузить

        currentArch = null;
        currentOS = null;
        currentSearchTerm = null;
        syncUrlWithState();

        let mdFile = hash === "#faq" ? "content/faq.md" : "content/links.md";
        fetch(mdFile)
            .then(response => {
                if (!response.ok) throw new Error("Error loading " + mdFile);
                return response.text();
            })
            .then(mdText => {
                // Преобразуем markdown в HTML с помощью marked.js
                const processedMd = processMarkdownSpacing(mdText);
                mdContainer.innerHTML = marked.parse(processedMd);
            })
            .catch(err => {
                mdContainer.innerHTML = "<p>Error loading page</p>";
                console.error(err);
            });
    } else {
        // Показываем таблицу и скрываем контейнер markdown
        mdContainer.style.display = "none";
        tableContainer.style.display = "block";
    }
}

// Обработчик изменения hash
window.addEventListener('hashchange', () => {
    loadMarkdownPage();
    updateNavActive();
});

// Новая функция для обновления active-состояния навигационных ссылок по hash
function updateNavActive() {
    const hash = window.location.hash;
    document.querySelectorAll('.nav-center a').forEach(link => {
        if ((hash === "" && link.getAttribute("href") === "index.html") || link.getAttribute("href") === hash) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

// Вызываем при первой загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadMarkdownPage(); // Сначала проверяем и загружаем markdown
});

// Кнопка плюс и микроформа
const plusButton = document.getElementById('plusButton');
const microFormContainer = document.getElementById('microFormContainer');
const blurOverlay = document.getElementById('blurOverlay');
let microFormScrollPosition = 0;

function showMicroForm() {
    if (microFormContainer.style.display === 'block') return;
    microFormContainer.innerHTML = `
      <form id="microForm" autocomplete="off" class="micro-form-vertical micro-form-with-close">
        <div class="micro-form-title">Add New Version</div>
        <div class="micro-form-subtext">
          This form is for adding new versions. You can also add outdated versions if they are missing from the table.
          After sending, the version will be automatically checked within the next hour and, if successful, will be immediately added to the table.
        </div>
        <div class="micro-form-close-wrap">
          <button type="button" class="close-micro-form" title="Close">&times;</button>
        </div>
        <div class="micro-form-field">
          <label for="microFormInput" class="micro-form-label">Version</label>
          <input type="text" id="microFormInput" class="micro-form-input micro-form-input-wide" placeholder="e.g. 1.2.62.580.gb27ad23e" maxlength="100" required />
        </div>
        <div id="microFormInputError"></div>
        <div id="descBlock" class="micro-form-field">
          <label for="microFormDesc" class="micro-form-label" id="descLabel" style="display:none;">Description</label>
          <button type="button" id="showDescBtn" class="micro-form-desc-btn">Add description</button>
          <textarea id="microFormDesc" class="micro-form-input micro-form-desc-textarea" placeholder="any useful information about the version" maxlength="300" style="display:none;resize:vertical;min-height:38px;"></textarea>
        </div>
        <div class="micro-form-actions">
          <button type="submit" class="micro-form-send">Send</button>
        </div>
      </form>
    `;
    microFormContainer.style.display = 'block';
    microFormContainer.style.overflow = 'hidden';
    blurOverlay.style.display = 'block';
    blurOverlay.style.opacity = "0";
    setTimeout(() => {
        blurOverlay.style.opacity = "1";
    }, 10);
    blurOverlay.addEventListener('click', hideMicroForm);

    const form = document.getElementById('microForm');
    form.classList.add('micro-form-animate-in');
    setTimeout(() => {
        form.classList.add('micro-form-animate-visible');
        setTimeout(() => {
            if (microFormContainer.style.display === 'block') {
                microFormContainer.style.overflowY = 'auto';
                microFormContainer.style.overflowX = 'hidden';
            }
        }, 380);
    }, 10);

    microFormScrollPosition = window.pageYOffset;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${microFormScrollPosition}px`;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';

    setTimeout(() => {
        const input = document.getElementById('microFormInput');
        if (input) input.focus();
    }, 100);

    const versionInput = document.getElementById('microFormInput');
    const errorDiv = document.getElementById('microFormInputError');
    versionInput.addEventListener('input', function () {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const value = versionInput.value.trim();
        const desc = document.getElementById('microFormDesc').value.trim();
        const regex = /^\d+\.\d+\.\d+\.\d+\.g[0-9a-f]{8}$/;

        if (!regex.test(value)) {
            errorDiv.textContent = 'version does not match the format: e.g. 1.1.11.111.g12345abc';
            errorDiv.style.display = 'block';
            versionInput.focus();
            return;
        }

        const parts = value.split('.');
        let shortVersion = '';
        if (parts.length >= 3) {
            shortVersion = parts[0] + '.' + parts[1] + '.' + parts[2];
        }

        function compareShortVersions(a, b) {
            const pa = a.split('.').map(Number);
            const pb = b.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
                if ((pa[i] || 0) > (pb[i] || 0)) return 1;
                if ((pa[i] || 0) < (pb[i] || 0)) return -1;
            }
            return 0;
        }

        if (shortVersion && compareShortVersions(shortVersion, '1.1.58') <= 0) {
            errorDiv.textContent = 'versions 1.1.58 and below are not accepted as they have been disabled on the server side';
            errorDiv.style.display = 'block';
            versionInput.focus();
            return;
        }

        let exists = false;
        if (Array.isArray(allVersions) && allVersions.length > 0) {
            exists = allVersions.some(([key, data]) => data.fullversion === value);
        }

        if (exists) {
            errorDiv.textContent = 'this version already exists in the table';
            errorDiv.style.display = 'block';
            versionInput.focus();
            return;
        }

        const errorPrefix = 'Version was not sent';
        try {
            const response = await fetch('https://broad-pine-bbc0.amd64fox1.workers.dev/submit-version', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    version: value,
                    desc: desc
                })
            });
            const result = await response.json();
            if (result.success) {
                showToast('Version <b>' + value + '</b> has been successfully sent for review', 5000, 'success');
                hideMicroForm();
            } else {
                hideMicroForm();
                let errorMsg = errorPrefix + '\n' + (result.error || 'Unknown error');
                if (result.status) {
                    errorMsg += `: ${result.status}`;
                }
                showToast(errorMsg, 5000, 'error');
            }
        } catch (err) {
            hideMicroForm();
            showToast(errorPrefix + '\n' + err, 5000, 'error');
        }
    });

    form.querySelector('.close-micro-form').addEventListener('click', hideMicroForm);

    const showDescBtn = document.getElementById('showDescBtn');
    const descTextarea = document.getElementById('microFormDesc');
    const descLabel = document.getElementById('descLabel');
    showDescBtn.addEventListener('click', function (e) {
        e.preventDefault();
        showDescBtn.style.display = 'none';
        descLabel.style.display = 'block';
        descTextarea.style.display = 'block';
        descTextarea.focus();
    });

    setTimeout(() => {
        document.addEventListener('mousedown', handleOutsideClick);
    }, 0);
}

// функция скрытия микроформы
function hideMicroForm() {
    const form = document.getElementById('microForm');
    microFormContainer.style.overflow = 'hidden';
    if (form) {
        form.classList.remove('micro-form-animate-visible');
        form.classList.remove('micro-form-animate-in');
        form.classList.add('micro-form-animate-out');
        setTimeout(() => {
            microFormContainer.style.display = 'none';
            microFormContainer.innerHTML = '';
        }, 320);
    } else {
        microFormContainer.style.display = 'none';
        microFormContainer.innerHTML = '';
    }
    blurOverlay.style.opacity = "0";
    setTimeout(() => {
        blurOverlay.style.display = 'none';
    }, 350);
    blurOverlay.removeEventListener('click', hideMicroForm);
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    document.body.style.position = '';
    document.body.style.width = '';
    window.scrollTo(0, microFormScrollPosition);
    document.removeEventListener('mousedown', handleOutsideClick);
}

// обработка клика вне микроформы
function handleOutsideClick(e) {
    if (
        !microFormContainer.contains(e.target) &&
        e.target !== plusButton &&
        !blurOverlay.contains(e.target)
    ) {
        hideMicroForm();
    }
}

// обработчик нажатия на плюс
plusButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (microFormContainer.style.display === 'block') {
        hideMicroForm();
    } else {
        showMicroForm();
    }
});