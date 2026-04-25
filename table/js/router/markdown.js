import { getCurrentPageKey, updateNavActive } from './routes.js';

const markdownPageCache = new Map();
const markdownPageRequests = new Map();
let markdownNavigationToken = 0;
let versionsAppInitializer = null;

export function setVersionsAppInitializer(initializer) {
    versionsAppInitializer = initializer;
}

export function processMarkdownSpacing(mdText) {
    const marked = window.marked;
    if (!marked) return mdText;

    return mdText.replace(/(<div class="answer">\s*)(.*?)(\s*<\/div>)/gs, (match, start, content, end) => {
        const lines = content.trim().split(/\n\s*\n/);
        const processedLines = lines.map(line => marked.parse(line.trim()));

        if (lines.length > 1) {
            const cleanedLines = processedLines.map(line => line.replace(/<\/?p>/g, ''));
            return `${start}${cleanedLines.join('<br><br>')}${end}`;
        }

        return `${start}${marked.parse(content.trim()).replace(/<\/?p>/g, '')}${end}`;
    });
}

export function loadMarkdownContent(mdFile) {
    const marked = window.marked;

    if (markdownPageCache.has(mdFile)) {
        return Promise.resolve(markdownPageCache.get(mdFile));
    }

    if (!markdownPageRequests.has(mdFile)) {
        const request = fetch(mdFile)
            .then(response => {
                if (!response.ok) throw new Error(`Error loading ${mdFile}`);
                return response.text();
            })
            .then(mdText => {
                const processedMd = processMarkdownSpacing(mdText);
                const html = marked ? marked.parse(processedMd) : processedMd;
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

export function loadMarkdownPage() {
    updateNavActive();

    const pageKey = getCurrentPageKey();
    const mdContainer = document.getElementById('markdownContainer');
    const tableContainer = document.getElementById('tableContainer');

    if (pageKey === 'faq' || pageKey === 'links') {
        tableContainer.style.display = 'none';
        mdContainer.style.display = 'block';

        const mdFile = pageKey === 'faq' ? 'content/faq.md' : 'content/links.md';
        const currentToken = ++markdownNavigationToken;

        loadMarkdownContent(mdFile)
            .then(html => {
                if (currentToken !== markdownNavigationToken) return;
                mdContainer.innerHTML = html;
            })
            .catch(err => {
                if (currentToken !== markdownNavigationToken) return;
                mdContainer.innerHTML = '<p>Error loading page</p>';
                console.error(err);
            });
    } else {
        markdownNavigationToken++;
        mdContainer.style.display = 'none';
        tableContainer.style.display = 'block';
        versionsAppInitializer?.().catch(err => console.error('Error loading version data:', err));
    }
}
