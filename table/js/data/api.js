import { renderDownloadCounter } from '../utils/format.js';
import { flushPendingLinkMetaUpdates } from './meta.js';

let allDownloadCounters = {};
let commentCountCache = {};
let countersLoaded = false;
let commentCountsLoaded = false;
const pendingCounterElements = new Map();
const MIN_UPDATE_INTERVAL = 10000;
const ALL_DATA_BACKGROUND_RETRY_DELAY_MS = 5000;
let lastDataUpdate = 0;
let allDataBackgroundRetryTimeoutId = null;
let commentHandlers = {
    processDiscussionData: null,
    updateExistingCommentButtons: null
};

export const generateCounterKey = (version, os, arch) => `${version}-${os}-${arch}`;

export function buildVersionCommentKey(version) {
    return `spotify-version-${version}`;
}

export function registerCommentHandlers(handlers) {
    commentHandlers = {
        ...commentHandlers,
        ...handlers
    };
}

export function getDownloadCounter(counterKey) {
    return allDownloadCounters[counterKey] || '0';
}

export function setDownloadCounter(counterKey, value) {
    allDownloadCounters[counterKey] = String(value);
}

export function areCountersLoaded() {
    return countersLoaded;
}

export function registerPendingCounterElement(counterKey, element, url) {
    pendingCounterElements.set(counterKey, { element, url });
}

export function getCommentCount(commentKey) {
    return commentCountCache[commentKey] || 0;
}

export function setCommentCount(commentKey, count) {
    commentCountCache[commentKey] = count;
}

export function clearAllDataBackgroundRetry() {
    if (allDataBackgroundRetryTimeoutId) {
        clearTimeout(allDataBackgroundRetryTimeoutId);
        allDataBackgroundRetryTimeoutId = null;
    }
}

export function scheduleAllDataBackgroundRetry() {
    clearAllDataBackgroundRetry();
    allDataBackgroundRetryTimeoutId = setTimeout(() => {
        allDataBackgroundRetryTimeoutId = null;
        loadAllData(true, false).catch(err => {
            console.warn('Background all-data retry failed:', err);
        });
    }, ALL_DATA_BACKGROUND_RETRY_DELAY_MS);
}

export function getAllDataResponseState(response, data, commentsOnly) {
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

export async function loadAllData(forceUpdate = false, commentsOnly = false) {
    const requestedDataLoaded = commentsOnly
        ? commentCountsLoaded
        : (countersLoaded && commentCountsLoaded);

    if (commentsOnly && commentCountsLoaded && !forceUpdate) {
        return { comments: commentCountCache };
    }

    if (!commentsOnly && countersLoaded && commentCountsLoaded && !forceUpdate) {
        clearAllDataBackgroundRetry();
        return { downloads: allDownloadCounters, comments: commentCountCache };
    }

    try {
        const now = Date.now();
        if (now - lastDataUpdate < MIN_UPDATE_INTERVAL && !forceUpdate) {
            return commentsOnly
                ? { comments: commentCountCache }
                : { downloads: allDownloadCounters, comments: commentCountCache };
        }

        lastDataUpdate = now;

        const workerUrl = `https://loadspot.amd64fox1.workers.dev/all-data${commentsOnly ? '?comments-only=1' : ''}`;
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
                        const count = allDownloadCounters[counterKey] || '0';
                        counterInfo.element.innerHTML = renderDownloadCounter(count);
                    });
                    pendingCounterElements.clear();

                    flushPendingLinkMetaUpdates();
                }

                if (commentsSucceeded) {
                    commentHandlers.processDiscussionData?.(data.comments);
                    commentCountsLoaded = true;
                    commentHandlers.updateExistingCommentButtons?.();
                }

                if (!commentsOnly) {
                    if (requestedSectionFailed) {
                        scheduleAllDataBackgroundRetry();
                    } else {
                        clearAllDataBackgroundRetry();
                    }
                }

                return commentsOnly
                    ? { comments: commentCountCache }
                    : { downloads: allDownloadCounters, comments: commentCountCache };
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

        return commentsOnly
            ? { comments: commentCountCache }
            : { downloads: allDownloadCounters, comments: commentCountCache };
    }
}
