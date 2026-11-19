import { state } from '../state.js';
import { buildVersionCommentKey, getCommentCount, loadAllData, registerCommentHandlers } from '../data/api.js';
import { formatCommentCount } from '../utils/format.js';
import { ROUTE_PATHS } from '../router/routes.js';

const widgetOrigin = 'https://giscus.app';
let activeThread;
let loadTimer;
let refreshTimer;

function setRetryMessage(message) {
    const status = document.querySelector('#commentsModal .comments-status');
    status.querySelector('[role="status"]').textContent = message;
    status.hidden = !message;
    document.getElementById('comments-container').inert = Boolean(message);
}

async function mountWidget(thread) {
    clearTimeout(loadTimer);
    const container = document.getElementById('comments-container');
    container.replaceChildren();
    thread.widget = null;
    setRetryMessage('');
    loadTimer = setTimeout(() => setRetryMessage('Comments are taking longer to load'), 15000);

    try {
        const { GiscusWidget } = await import('giscus');
        if (activeThread !== thread || !document.getElementById('commentsModal').open) return;

        const widget = new GiscusWidget();
        Object.assign(widget, {
            id: `comments-${thread.os}-${thread.version}`,
            repo: 'LoaderSpot/table',
            repoId: 'R_kgDOOANMeQ',
            category: 'Comments',
            categoryId: 'DIC_kwDOOANMec4Cn2gF',
            mapping: 'specific',
            term: buildVersionCommentKey(thread.version),
            strict: '1',
            theme: location.protocol === 'https:' ? new URL('/giscus-theme.css', location.origin).href : 'noborder_dark'
        });
        thread.widget = widget;
        container.replaceChildren(widget);
    } catch {
        if (activeThread === thread) {
            clearTimeout(loadTimer);
            setRetryMessage('Comments could not be loaded');
        }
    }
}

function openComments(version, os, opener) {
    const dialog = document.getElementById('commentsModal');
    activeThread = { version, os, opener };
    document.getElementById('comment-version-title').textContent = version;
    document.querySelector('meta[name="giscus:backlink"]').content = buildVersionBacklink(version, os);
    dialog.showModal();
    dialog.querySelector('.comments-modal-body').scrollTop = 0;
    mountWidget(activeThread);
}

function scheduleCountRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => loadAllData(true, true), 500);
}

function handleGiscusMessage(event) {
    const frame = activeThread?.widget?.iframeRef;
    if (!frame || event.origin !== widgetOrigin || event.source !== frame.contentWindow) return;
    if (loadTimer && event.data?.giscus?.resizeHeight > 0) {
        clearTimeout(loadTimer);
        loadTimer = null;
        setRetryMessage('');
    }
}

export function updateExistingCommentButtons() {
    document.querySelectorAll('.comment-button').forEach(button => {
        const commentKey = button.dataset.commentKey;
        if (!commentKey) return;
        applyCommentCountToButton(button, getCommentCount(commentKey) || 0);
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
        badge.title = `${numeric} ${numeric === 1 ? 'comment' : 'comments'}`;
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
    const origin = window.location.origin || 'https://loadspot.vercel.app';
    const url = new URL(`${origin}${ROUTE_PATHS.versions}`);
    url.searchParams.set('os', os);

    const versionParam = versionParamNames[os];
    if (versionParam) {
        url.searchParams.set(versionParam, version);
    }

    return url.toString();
}

export function createCommentButton(version, { os = state.currentOS } = {}) {
    const commentKey = buildVersionCommentKey(version);
    const commentButton = document.createElement('button');

    commentButton.className = 'comment-button comment-button-compact';
    commentButton.dataset.commentKey = commentKey;
    commentButton.type = 'button';
    commentButton.title = `Open comments for version ${version}`;
    commentButton.setAttribute('aria-label', `Open comments for version ${version}`);

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
        openComments(version, os, commentButton);
    });

    return commentButton;
}

export function initComments() {
    registerCommentHandlers({ updateExistingCommentButtons });
    const dialog = document.getElementById('commentsModal');
    dialog.querySelector('.comments-close-button').addEventListener('click', () => dialog.close());
    dialog.querySelector('.comments-status button').addEventListener('click', () => {
        const { version, os, opener } = activeThread;
        openComments(version, os, opener);
        dialog.querySelector('.comments-close-button').focus({ preventScroll: true });
    });

    let pressedBackdrop = false;
    const outside = event => {
        const rect = dialog.getBoundingClientRect();
        return event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom;
    };
    dialog.addEventListener('pointerdown', event => { pressedBackdrop = event.target === dialog && outside(event); });
    dialog.addEventListener('click', event => {
        if (pressedBackdrop && event.target === dialog && outside(event)) dialog.close();
    });
    dialog.addEventListener('close', () => {
        if (dialog.open) return;
        if (activeThread?.widget) scheduleCountRefresh();
        clearTimeout(loadTimer);
        document.getElementById('comments-container').replaceChildren();
        document.querySelector('meta[name="giscus:backlink"]').content = '';
        activeThread?.opener?.focus({ preventScroll: true });
        activeThread = null;
    });
    window.addEventListener('message', handleGiscusMessage);
    window.addEventListener('popstate', () => { if (dialog.open) dialog.close(); });

    // Giscus returns from GitHub sign-in with the widget ID in the URL fragment
    const target = /^#comments-(win|mac|linux)-(\d+\.\d+\.\d+(?:\.\d+)?)$/.exec(location.hash);
    if (target && new URLSearchParams(location.search).has('giscus')) openComments(target[2], target[1]);
}
