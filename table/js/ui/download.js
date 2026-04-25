import {
    areCountersLoaded,
    generateCounterKey,
    getDownloadCounter,
    registerPendingCounterElement,
    setDownloadCounter
} from '../data/api.js';
import { copyTextToClipboard, showToast } from '../utils/clipboard.js';
import { escapeToastText, renderDownloadCounter } from '../utils/format.js';

const downloadCooldowns = new WeakSet();
const pendingDownloadRequests = new Map();
const DOWNLOAD_IFRAME_SETTLE_MS = 15000;
let downloadRequestSeq = 0;
let downloadMessageListenerInstalled = false;

export function updateDownloadCount(fileUrl, countElement, version, os, arch) {
    const counterKey = generateCounterKey(version, os, arch);

    if (areCountersLoaded()) {
        const count = getDownloadCounter(counterKey);
        countElement.innerHTML = renderDownloadCounter(count);
    } else {
        registerPendingCounterElement(counterKey, countElement, fileUrl);
    }
}

export function getDownloadFileName(fileUrl, fallback = 'download') {
    try {
        const url = new URL(fileUrl, window.location.href);
        const pathName = url.pathname.split('/').pop() || '';
        const decoded = decodeURIComponent(pathName);
        return decoded || fallback;
    } catch {
        return fallback;
    }
}

export function createDownloadErrorMessage(status, message, fileName) {
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

export function rollbackDownloadCounter(counterKey, previousCount, countElement) {
    const safePreviousCount = Math.max(0, Number(previousCount) || 0);
    setDownloadCounter(counterKey, String(safePreviousCount));

    if (countElement) {
        countElement.innerHTML = renderDownloadCounter(String(safePreviousCount));
    }
}

export function cleanupDownloadRequest(requestId, reason = 'done') {
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

export function createDownloadFrame(requestId) {
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

export function buildDownloadFrameUrl(fileUrl, requestId) {
    const url = new URL(fileUrl, window.location.href);
    url.searchParams.set('dl_frame', '1');
    url.searchParams.set('dl_req', requestId);
    return url.toString();
}

export async function handleDownload(downloadLink, fileUrl, version, os, arch) {
    if (downloadCooldowns.has(downloadLink)) return;

    downloadCooldowns.add(downloadLink);
    downloadLink.classList.add('download-cooldown');
    setTimeout(() => {
        downloadCooldowns.delete(downloadLink);
        downloadLink.classList.remove('download-cooldown');
    }, 5000);

    const countElement = downloadLink.closest('.download-container').querySelector('.download-count-slot');
    const counterKey = generateCounterKey(version, os, arch);
    const previousCount = parseInt(getDownloadCounter(counterKey), 10);
    const newCount = (previousCount + 1).toString();

    setDownloadCounter(counterKey, newCount);
    countElement.innerHTML = renderDownloadCounter(newCount);

    const requestId = `${Date.now()}-${++downloadRequestSeq}`;
    const downloadOrigin = new URL(fileUrl, window.location.href).origin;
    const fileName = getDownloadFileName(fileUrl, `${version}-${os}-${arch}`);
    const frame = createDownloadFrame(requestId);
    document.body.appendChild(frame);

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

export function createDownloadCell(link, version, os, arch) {
    const actionCell = document.createElement('td');
    actionCell.className = 'action-cell';

    const downloadContainer = document.createElement('div');
    downloadContainer.className = 'download-container';

    const downloadLink = document.createElement('a');
    downloadLink.className = 'download-link';
    downloadLink.removeAttribute('href');

    const extensions = { win: '.exe', mac: '.tbz', linux: '.deb' };
    const extension = extensions[os] || '';
    downloadLink.title = `download ${version}-${arch}${extension}`;

    downloadLink.addEventListener('click', e => {
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

    copyLinkButton.addEventListener('click', e => {
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
    updateDownloadCount(link, downloadCountSpan, version, os, arch);

    return actionCell;
}

function handleDownloadMessage(event) {
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
}

export function initDownloadMessages() {
    if (downloadMessageListenerInstalled) return;
    window.addEventListener('message', handleDownloadMessage);
    downloadMessageListenerInstalled = true;
}
