import { state } from '../state.js';
import {
    buildVersionCommentKey,
    getCommentCount,
    loadAllData,
    registerCommentHandlers,
    setCommentCount
} from '../data/api.js';
import { formatCommentCount } from '../utils/format.js';
import { ROUTE_PATHS } from '../router/routes.js';

let commentsModal;
let giscusLoaded = false;
let currentCommentKey = '';
let scrollPosition = 0;
const commentRefreshTimers = new Map();
let giscusMessageListenerInstalled = false;

export function ensureCommentsModal() {
    const existingModal = document.getElementById('commentsModal');
    if (existingModal) return existingModal;

    const template = document.getElementById('comments-modal-template');
    if (!template) return null;

    const modalClone = template.content.cloneNode(true);
    const modalElement = modalClone.querySelector('.comments-modal');
    modalElement.id = 'commentsModal';
    document.body.appendChild(modalElement);
    commentsModal = modalElement;

    modalElement.querySelector('.comments-close-button').addEventListener('click', closeModal);
    modalElement.addEventListener('click', e => {
        if (e.target === modalElement) {
            closeModal();
        }
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && commentsModal?.style.display === 'flex') {
            closeModal();
        }
    });

    return modalElement;
}

export function cleanupGiscus() {
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

export function openModal() {
    const modal = ensureCommentsModal();
    if (!modal) return;

    commentsModal = modal;
    scrollPosition = window.pageYOffset;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    commentsModal.style.display = 'flex';

    setTimeout(() => {
        commentsModal.classList.add('show');
        const closeButton = commentsModal.querySelector('.comments-close-button');
        if (closeButton) closeButton.focus();
    }, 10);
}

export function closeModal() {
    if (!commentsModal) return;

    commentsModal.classList.remove('show');

    setTimeout(() => {
        commentsModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        document.body.style.position = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollPosition);
        cleanupGiscus();

        if (currentCommentKey) {
            const t = commentRefreshTimers.get(currentCommentKey);
            if (t) {
                clearTimeout(t);
                commentRefreshTimers.delete(currentCommentKey);
            }
            refreshCommentCountForKey(currentCommentKey);
        }
    }, 300);
}

export function openComments(target) {
    ensureCommentsModal();
    document.getElementById('comment-version-title').textContent = target.modalLabel;
    const commentsContainer = document.getElementById('comments-container');
    cleanupGiscus();

    let backlink = document.querySelector('meta[name="giscus:backlink"]');
    if (!backlink) {
        backlink = document.createElement('meta');
        backlink.setAttribute('name', 'giscus:backlink');
        document.head.appendChild(backlink);
    }
    backlink.setAttribute('content', target.backlink);

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

export function processDiscussionData(discussions) {
    if (!discussions) return;

    discussions.forEach(discussion => {
        if (!discussion.title) return;

        const commentKey = discussion.title;
        const newCount = discussion.commentCount;

        if (getCommentCount(commentKey) !== newCount) {
            setCommentCount(commentKey, newCount);
            updateCommentCountForKey(commentKey, newCount);
        }
    });
}

export async function refreshCommentCountForKey(commentKey) {
    await loadAllData(true, true);
    updateCommentCountForKey(commentKey, getCommentCount(commentKey) || 0);
}

export function updateExistingCommentButtons() {
    document.querySelectorAll('.comment-button').forEach(button => {
        const commentKey = button.dataset.commentKey;
        if (!commentKey) return;
        applyCommentCountToButton(button, getCommentCount(commentKey) || 0);
    });
}

export function updateCommentCountForKey(commentKey, count) {
    document.querySelectorAll(`.comment-button[data-comment-key="${commentKey}"]`).forEach(button => {
        applyCommentCountToButton(button, count);
    });
}

export function applyCommentCountToButton(button, count) {
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

export function buildVersionBacklink(version, os) {
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

export function createCommentButton(target, options = {}) {
    const logicalId = String(target);
    const commentKey = options.commentKey || buildVersionCommentKey(logicalId);
    const modalLabel = options.modalLabel || `version ${logicalId}`;
    const backlink = options.backlink || buildVersionBacklink(logicalId, options.os || state.currentOS);
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
        commentButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 17.5H6l-2.5 2v-3.244A5.9 5.9 0 0 1 2.5 13a6.5 6.5 0 0 1 6.5-6.5h6A6.5 6.5 0 0 1 21.5 13a6.5 6.5 0 0 1-6.5 6.5H10"/><path d="M8.5 11h7"/><path d="M8.5 14h4.5"/></svg>';
    }

    if (getCommentCount(commentKey)) {
        applyCommentCountToButton(commentButton, getCommentCount(commentKey));
    }

    commentButton.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        openComments({ commentKey, modalLabel, backlink });
    });

    return commentButton;
}

function handleGiscusMessage(e) {
    if (e.origin !== 'https://giscus.app') return;
    if (!e.data || typeof e.data !== 'object') return;

    try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

        if (data.giscus) {
            giscusLoaded = true;

            if (data.giscus.error === null && data.giscus.eventName) {
                if (data.giscus.eventName === 'comment' || data.giscus.eventName === 'reply') {
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
}

export function initComments() {
    registerCommentHandlers({
        processDiscussionData,
        updateExistingCommentButtons
    });

    if (!giscusMessageListenerInstalled) {
        window.addEventListener('message', handleGiscusMessage);
        giscusMessageListenerInstalled = true;
    }
}
