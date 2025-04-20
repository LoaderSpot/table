// определяем os из url параметров перед загрузкой данных
let currentOS = (() => {
    const urlParams = new URLSearchParams(window.location.search);
    switch (true) {
        case urlParams.has('mac'):
            return 'mac';
        case urlParams.has('linux'):
            return 'linux';
        default:
            return 'win';
    }
})();

const osVersionFilters = {
    win: [
        { version: '1.2.5.1006', label: '7-8.1', full: 'Windows 7-8.1' }
    ],
    mac: [
        { version: '1.2.37.701', label: '10.15', full: 'macOS 10.15' },
        { version: '1.2.20.1218', label: '10.13/10.14', full: 'macOS 10.13 / 10.14' },
        { version: '1.1.89.862', label: '10.11/10.12', full: 'macOS 10.12 / OS X 10.11' }
    ]
};

let currentWinVersionFilter = null;
let currentMacVersionFilter = null;

function closeAllOsVersionDropdowns() {
    document.querySelectorAll('.os-version-dropdown').forEach(dd => {
        dd.style.display = 'none';
    });
}

// обновляем активную вкладку в ui при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.filter-button').forEach(btn => {
        const os = btn.dataset.os;

        // Добавляем стрелку и контейнер для выпадающего списка (Windows и Mac)
        if (os === 'win' || os === 'mac') {
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

            const dropdownWrapper = document.createElement('span');
            dropdownWrapper.className = 'dropdown-wrapper';
            dropdownWrapper.style.pointerEvents = 'none';

            const arrow = document.createElement('span');
            arrow.className = 'dropdown-arrow';
            arrow.innerHTML = '▼';
            dropdownWrapper.appendChild(arrow);
            btn.appendChild(dropdownWrapper);

            const versionLabel = document.createElement('span');
            versionLabel.className = 'os-version-label';
            versionLabel.style.display = 'none';
            container.appendChild(versionLabel);

            const dropdown = document.createElement('div');
            dropdown.className = 'os-version-dropdown';
            container.appendChild(dropdown);

            const ul = document.createElement('ul');
            dropdown.appendChild(ul);

            if (osVersionFilters[os]) {
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
            }

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
                const wrapperRect = wrapper.getBoundingClientRect();
                const clickX = e.clientX;
                if (
                    clickX >= wrapperRect.left
                ) {
                    e.stopPropagation();
                    if (dropdown.style.display === 'block') {
                        dropdown.style.display = 'none';
                    } else {
                        closeAllOsVersionDropdowns();
                        dropdown.style.display = 'block';
                    }
                }
            });

            document.addEventListener('click', () => {
                dropdown.style.display = 'none';
            });
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

    let currentFilter = os === 'win' ? currentWinVersionFilter : currentMacVersionFilter;

    if (currentFilter === version) {
        currentFilter = null;
        versionLabel.style.display = 'none';
        listItem.classList.remove('selected');
        container.classList.remove('filter-active');
    } else {

        currentFilter = version;
        versionLabel.textContent = label;
        versionLabel.style.display = 'block';
        container.classList.add('filter-active');

        allItems.forEach(item => item.classList.remove('selected'));
        listItem.classList.add('selected');
    }

    if (os === 'win') {
        currentWinVersionFilter = currentFilter;
    } else {
        currentMacVersionFilter = currentFilter;
    }

    reRenderVersions();
}

// функция отображения тоста
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
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
function updateLinkInfo(dateCell, sizeCell, url) {
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
    if (headCache.has(url)) {
        const cached = headCache.get(url);
        dateCell.textContent = cached.date;
        sizeCell.textContent = cached.size;
        return;
    }
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const lastModified = response.headers.get('Last-Modified');
        const contentLength = response.headers.get('Content-Length');

        const formattedDate = formatDate(lastModified);
        const sizeMb = formatSize(contentLength);

        // сохраняем результат в кэше
        headCache.set(url, { date: formattedDate, size: sizeMb });
        dateCell.textContent = formattedDate;
        sizeCell.textContent = sizeMb;
    } catch (error) {
        console.error('Error getting headers', error);
        dateCell.textContent = '—';
        sizeCell.textContent = '—';
        headCache.set(url, { date: '—', size: '—' });
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

        // таймаут для запроса к Worker - 3 секунды
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(workerUrl, {
            signal: controller.signal,
            cache: 'no-store'
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // обрабатываем счетчики скачиваний, если это не запрос только комментариев
        if (!commentsOnly && data.downloads) {
            allDownloadCounters = data.downloads;
            countersLoaded = true;

            // обновляем все ожидающие элементы ui для счетчиков скачиваний
            pendingCounterElements.forEach((counterInfo, counterKey) => {
                const count = allDownloadCounters[counterKey] || "0";
                counterInfo.element.innerHTML = count === "0" ? "" :
                    `<span class="download-counter">${formatDownloadCount(count)}</span>`;
            });
            pendingCounterElements.clear();

            // разрешаем начать HEAD-запросы после получения данных только при полном запросе
            startHeadRequests();
        }

        // обрабатываем данные о комментариях
        if (data.comments && Array.isArray(data.comments)) {
            processDiscussionData(data.comments);
            commentCountsLoaded = true;
            updateExistingCommentButtons();
        }

        return commentsOnly ? { comments: commentCountCache } :
            { downloads: allDownloadCounters, comments: commentCountCache };
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

    return `${formatted}${formatted.endsWith('k') ? 'k' : ''} ${suffix}`;
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

// глобальная переменная для архитектурного фильтра
let currentArch = 'all';

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
            updateArchFilters();
            reRenderVersions();
        });
        archContainer.appendChild(btn);
    });
}

// Функция для сравнения версий
function compareVersions(version1, version2) {
    const parts1 = version1.split('.');
    const parts2 = version2.split('.');

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const num1 = parseInt(parts1[i] || 0, 10);
        const num2 = parseInt(parts2[i] || 0, 10);

        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }

    return 0;
}

// функция для повторного рендера версий с учетом текущих фильтров (ОС + архитектура + поиск + версия ОС)
function reRenderVersions() {
    container.style.opacity = "0";
    observer.unobserve(sentinel);

    currentIndex = 0;

    setTimeout(() => {
        if (currentSearchTerm !== "") {
            performSearch(currentSearchTerm);
        } else {
            currentSearchResults = null;
            startLazyLoading();
        }
    }, 300);
}

// функция для создания строк таблицы для одной версии
function createVersionRows(versionKey, data, searchTerm = '') {
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
    }

    // фильтруем только по текущей ОС
    if (data.links[currentOS]) {
        for (const arch of Object.keys(data.links[currentOS])) {
            // фильтруем по архитектуре, если выбран конкретный
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

            // используем оптимизированную функцию для создания элементов версий
            const { versionText, shortVersionElem } = createVersionElement(
                { short: shortVersion, full: data.fullversion },
                searchTerm
            );

            // добавляем кнопку комментариев
            const commentBtn = createCommentButton(versionKey);
            shortVersionElem.after(commentBtn);

            versionCell.appendChild(versionText);
            row.appendChild(versionCell);
            isFirstVersionRow = false;
        }

        // архитектура
        const archCell = document.createElement('td');
        archCell.textContent = combo.arch;
        row.appendChild(archCell);

        // дата
        const dateCell = document.createElement('td');
        dateCell.textContent = '—';
        row.appendChild(dateCell);

        // размер
        const sizeCell = document.createElement('td');
        sizeCell.textContent = '—';
        row.appendChild(sizeCell);

        // создаем ячейку с кнопкой скачивания и счетчиком
        row.appendChild(createDownloadCell(combo.link, shortVersion, currentOS, combo.arch));

        // обновляем инфу о дате и размере
        updateLinkInfo(dateCell, sizeCell, combo.link);

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
let currentSearchTerm = '';
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
            const currentSource = getCurrentDataSource();
            if (currentIndex < currentSource.length) {
                observer.observe(sentinel);
            }
        }
    });
}, { root: null, rootMargin: '100px', threshold: 0 });

// функция для получения текущего источника данных в зависимости от ОС и поиска
function getCurrentDataSource() {
    if (currentOS === 'linux') {
        return currentSearchResults || linuxVersionsData;
    } else {
        return currentSearchResults || allVersions;
    }
}

// функция для создания строк таблицы для Linux-пакетов с поддержкой ленивой загрузки
function loadMoreLinuxRows() {
    const dataSource = currentSearchResults || linuxVersionsData;
    const endIndex = Math.min(currentIndex + ITEMS_PER_BATCH, dataSource.length);

    for (let i = currentIndex; i < endIndex; i++) {
        const version = dataSource[i];

        // создаем элементы для версии с использованием общей функции
        const { versionText, shortVersionElem } = createVersionElement(
            { short: version.version.short, full: version.version.full },
            currentSearchTerm
        );

        // добавляем кнопку комментариев
        const commentBtn = createCommentButton(version.version.short);
        shortVersionElem.after(commentBtn);

        version.architectures.forEach((arch, index) => {
            const row = document.createElement('tr');

            if (index === 0) {
                const versionCell = document.createElement('td');
                versionCell.className = 'version-cell has-comments';
                versionCell.rowSpan = version.architectures.length;
                versionCell.appendChild(versionText);
                row.appendChild(versionCell);
            }

            // архитектура
            const archCell = document.createElement('td');
            archCell.textContent = arch.arch;
            row.appendChild(archCell);

            // дата
            const dateCell = document.createElement('td');
            dateCell.textContent = arch.date;
            row.appendChild(dateCell);

            // размер
            const sizeCell = document.createElement('td');
            sizeCell.textContent = arch.size;
            row.appendChild(sizeCell);

            // кнопка скачать с обновлением счетчика
            row.appendChild(createDownloadCell(arch.link, version.version.short, 'linux', arch.arch));

            // добавляем строку в контейнер
            container.appendChild(row);
        });
    }

    currentIndex = endIndex;
    if (currentIndex < dataSource.length) {
        container.appendChild(sentinel);
    }
}

// функция для Windows/Mac ленивой загрузки
function loadMoreWinMacRows() {
    const dataSource = currentSearchResults || allVersions;
    const endIndex = Math.min(currentIndex + ITEMS_PER_BATCH, dataSource.length);
    let rowsAdded = 0;

    for (let i = currentIndex; i < endIndex; i++) {
        const [versionKey, versionData] = dataSource[i];
        const versionRows = createVersionRows(versionKey, versionData, currentSearchTerm);
        versionRows.forEach(r => container.appendChild(r));
        rowsAdded += versionRows.length;
    }

    currentIndex = endIndex;

    if (currentIndex < dataSource.length) {
        container.appendChild(sentinel);
    } else if (rowsAdded === 0 && currentIndex === dataSource.length) {
        if (container.childElementCount === 0) {
            showNoResults();
        }
    }
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
    if (currentIndex < dataSource.length) {
        observer.observe(sentinel);
    }

    container.style.opacity = "1";
}

// функция для сортировки результатов поиска для Win/Mac
function sortSearchResults(filtered, term) {
    return filtered.sort((a, b) => {
        const [versionKeyA, dataA] = a;
        const [versionKeyB, dataB] = b;

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
        return versionKeyB.localeCompare(versionKeyA, undefined, { numeric: true, sensitivity: 'base' });
    });
}

// функция поиска для всех OS
function performSearch(term) {
    term = term.trim().toLowerCase();
    container.style.opacity = "0";
    currentSearchTerm = term;
    observer.unobserve(sentinel);

    setTimeout(() => {
        if (term === "") {
            currentSearchResults = null;
            startLazyLoading();
            return;
        }

        // Очищаем контейнер
        container.innerHTML = "";
        currentIndex = 0;

        // проверяем, загружены ли данные для Linux, если это текущая ОС
        if (currentOS === 'linux' && !linuxDataLoaded) {
            loadLinuxPackages();
            return;
        }

        // выполняем поиск в зависимости от текущей ОС
        if (currentOS === 'linux') {
            // поиск по Linux-данным
            currentSearchResults = linuxVersionsData.filter(version =>
                version.version.short.toLowerCase().includes(term) ||
                version.version.full.toLowerCase().includes(term)
            ).sort((a, b) => {
                // логика сортировки для Linux
                const shortA = a.version.short.toLowerCase();
                const shortB = b.version.short.toLowerCase();
                const fullA = a.version.full.toLowerCase();
                const fullB = b.version.full.toLowerCase();

                // проверяем точное совпадение
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

                // сортируем по версии
                return b.version.short.localeCompare(a.version.short, undefined, { numeric: true });
            });
        } else {
            // поиск для Windows и Mac (существующая логика)
            const filtered = allVersions.filter(([versionKey, data]) => {
                return (versionKey.toLowerCase().includes(term) ||
                    data.fullversion.toLowerCase().includes(term)) &&
                    data.links[currentOS] &&
                    (currentArch === 'all' || data.links[currentOS].hasOwnProperty(currentArch));
            });

            currentSearchResults = sortSearchResults(filtered, term);
        }

        // запускаем ленивую загрузку результатов поиска
        startLazyLoading();
    }, 300);
}

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

        // сортируем версии (новые первыми)
        linuxVersionsData.sort((a, b) => {
            return b.version.short.localeCompare(a.version.short, undefined, { numeric: true });
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
            console.log('Starting HEAD requests after timeout');
            startHeadRequests();
        }, 2000);

        // отображаем первую партию данных для текущей ОС, только если это не markdown страница
        if (currentOS === 'linux') {
            loadLinuxPackages();
        } else {
            startLazyLoading();
            updateArchFilters();
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
commentsModal.innerHTML = `
<div class="comments-modal-content">
  <div class="comments-modal-header">
    <h3 class="comments-modal-title">Comments for version <span id="comment-version-title"></span></h3>
    <button class="comments-close-button">&times;</button>
  </div>
  <div class="comments-modal-body" id="comments-container">
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

// функция открытия модального окна с блокировкой прокрутки основной страницы
function openModal() {
    scrollPosition = window.pageYOffset;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollPosition}px`;
    commentsModal.style.display = 'flex';

    // добавляем небольшую задержку перед показом для плавности
    setTimeout(() => {
        commentsModal.classList.add('show');
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
        window.scrollTo(0, scrollPosition);
        cleanupGiscus();

        // обновляем счетчики комментариев после закрытия модального окна
        // используем запрос только для комментариев
        if (currentCommentVersion) {
            refreshCommentCountForVersion(currentCommentVersion);
        }
    }, 300); // задержка должна соответствовать времени transition для opacity
}

// слушаем сообщения от giscus iframe
window.addEventListener('message', function (e) {
    if (e.origin !== 'https://giscus.app') return;

    try {
        // проверяем, что данные - это строка JSON, а не объект
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

        // проверяем, что это сообщение от giscus
        if (data.giscus) {
            giscusLoaded = true;

            // проверяем, содержит ли сообщение информацию о добавлении комментария
            if (data.giscus.discussion && currentCommentVersion) {
                // если это событие добавления комментария
                if (data.giscus.discussion.totalCommentCount !== undefined) {
                    // обновляем кэш счетчика комментариев для текущей версии
                    const newCount = data.giscus.discussion.totalCommentCount;

                    // обновляем кэш только если значение изменилось
                    if (commentCountCache[currentCommentVersion] !== newCount) {
                        commentCountCache[currentCommentVersion] = newCount;

                        // обновляем счетчик на главной странице
                        updateCommentCountForVersion(currentCommentVersion, newCount);
                    }
                }
            }

            // отслеживаем события
            if (data.giscus.error === null && data.giscus.eventName) {
                // если произошло событие обновляем счетчик
                if (data.giscus.eventName === 'comment' ||
                    data.giscus.eventName === 'reply') {

                    // небольшая задержка для обновления счетчика после действия
                    setTimeout(() => {
                        if (currentCommentVersion) {
                            refreshCommentCountForVersion(currentCommentVersion);
                        }
                    }, 1000);
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

// функция открытия модального окна с комментариями для версии
function openComments(version) {

    document.getElementById('comment-version-title').textContent = version;
    const commentsContainer = document.getElementById('comments-container');

    // очищаем предыдущие комментарии
    cleanupGiscus();

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
    if (commentCountCache[version]) {
        updateCommentCountForVersion(version, commentCountCache[version]);
    }
}

// функция для обновления существующих кнопок комментариев после загрузки данных
function updateExistingCommentButtons() {
    document.querySelectorAll('.comment-button').forEach(button => {
        const version = button.dataset.version;
        if (version && commentCountCache[version]) {
            const countBadge = button.querySelector('.comment-count') || document.createElement('span');
            if (!button.querySelector('.comment-count')) {
                countBadge.className = 'comment-count';
                button.appendChild(countBadge);
            }
            countBadge.textContent = commentCountCache[version];

            // если есть комментарии, делаем бейдж более заметным
            if (commentCountCache[version] > 0) {
                button.classList.add('has-comments');
            }
        }
    });
}

// функция для обновления счетчика комментариев для конкретной версии
function updateCommentCountForVersion(version, count) {
    // находим все кнопки комментариев для данной версии
    document.querySelectorAll(`.comment-button[data-version="${version}"]`).forEach(button => {
        // обновляем счетчик
        const countBadge = button.querySelector('.comment-count') || document.createElement('span');
        if (!button.querySelector('.comment-count')) {
            countBadge.className = 'comment-count';
            button.appendChild(countBadge);
        }

        countBadge.textContent = count;

        // обновляем стиль кнопки в зависимости от наличия комментариев
        if (count > 0) {
            button.classList.add('has-comments');
        } else {
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
    // Инициализируем приложение (таблицу) только если это не markdown страница
    const hash = window.location.hash;
    if (hash !== "#faq" && hash !== "#links") {
        initializeApp();
    }
});