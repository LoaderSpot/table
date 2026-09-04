import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

globalThis.window = { location: new URL('https://example.com/versions') };

const { loadMarkdownContent, loadMarkdownPage, setVersionsAppInitializer } = await import('../js/router/markdown.js');

test('FAQ renders its Markdown inside existing HTML answer blocks', async t => {
    const markdown = await readFile(new URL('../content/faq.md', import.meta.url), 'utf8');
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(markdown));

    const firstRequest = loadMarkdownContent('faq-formatting.md');
    const concurrentRequest = loadMarkdownContent('faq-formatting.md');
    assert.equal(firstRequest, concurrentRequest);

    const html = await firstRequest;
    assert.match(html, /class="markdown-content"/);
    assert.match(html, /<code>Spotify\.app\/Contents\/<\/code>/);
    assert.match(html, /<strong>\|<\/strong>/);
    assert.match(html, /<blockquote data-type="warning">/);
    assert.match(html, /href="https:\/\/github\.com\/jetfir3\/TBZify"/);
    assert.match(html, /<br><br>Steps for manual installation:/);

    assert.equal(await loadMarkdownContent('faq-formatting.md'), html);
    assert.equal(fetchMock.mock.callCount(), 1);
});

test('failed FAQ requests can be retried', async t => {
    let attempts = 0;
    t.mock.method(globalThis, 'fetch', async () => {
        attempts++;
        return attempts === 1
            ? new Response('Unavailable', { status: 503 })
            : new Response('## Recovered');
    });

    await assert.rejects(loadMarkdownContent('faq-retry.md'), /Error loading faq-retry\.md/);
    assert.match(await loadMarkdownContent('faq-retry.md'), /<h2>Recovered<\/h2>/);
    assert.equal(attempts, 2);
});

test('returning to the catalog prevents a delayed FAQ response from changing the page', async t => {
    const markdownContainer = { style: {}, innerHTML: 'Previous content' };
    const tableContainer = { style: {} };
    globalThis.document = {
        querySelectorAll: () => [],
        getElementById: id => id === 'markdownContainer' ? markdownContainer : tableContainer
    };
    t.after(() => {
        delete globalThis.document;
        window.location = new URL('https://example.com/versions');
        setVersionsAppInitializer(null);
    });

    let resolveFetch;
    const fetchMock = t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { resolveFetch = resolve; }));
    let catalogInitializations = 0;
    setVersionsAppInitializer(async () => { catalogInitializations++; });

    loadMarkdownPage();
    assert.equal(fetchMock.mock.callCount(), 0);

    window.location = new URL('https://example.com/faq');
    loadMarkdownPage();
    const pendingContent = loadMarkdownContent('content/faq.md');
    assert.equal(fetchMock.mock.callCount(), 1);

    window.location = new URL('https://example.com/versions');
    loadMarkdownPage();
    resolveFetch(new Response('# Late FAQ'));
    await pendingContent;

    assert.equal(markdownContainer.innerHTML, 'Previous content');
    assert.equal(markdownContainer.style.display, 'none');
    assert.equal(tableContainer.style.display, 'block');
    assert.equal(catalogInitializations, 2);

    window.location = new URL('https://example.com/faq');
    loadMarkdownPage();
    await Promise.resolve();
    assert.match(markdownContainer.innerHTML, /<h1>Late FAQ<\/h1>/);
    assert.equal(markdownContainer.style.display, 'block');
    assert.equal(fetchMock.mock.callCount(), 1);
});
