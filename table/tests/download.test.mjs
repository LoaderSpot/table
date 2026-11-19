import assert from 'node:assert/strict';
import test from 'node:test';

let moduleSequence = 0;

function createElement() {
    const classes = new Set();
    return {
        dataset: {},
        style: {},
        innerHTML: '',
        children: [],
        listeners: {},
        classList: {
            add: name => classes.add(name),
            remove: name => classes.delete(name),
            contains: name => classes.has(name)
        },
        appendChild(child) { this.children.push(child); },
        addEventListener(name, listener) { this.listeners[name] = listener; },
        setAttribute() {}
    };
}

async function setup(t) {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const frames = [];
    const counters = [];
    const listeners = new Map();
    const toast = createElement();
    const body = {
        appendChild(frame) {
            frame.parentNode = this;
            frames.push(frame);
        },
        removeChild(frame) {
            frames.splice(frames.indexOf(frame), 1);
            frame.parentNode = null;
        }
    };

    globalThis.window = {
        location: { href: 'https://example.test/versions', search: '' },
        addEventListener: (type, handler) => listeners.set(type, handler)
    };
    globalThis.document = {
        body,
        createElement: tag => ({ ...createElement(), tag, contentWindow: {} }),
        getElementById: id => id === 'toast' ? toast : null,
        querySelectorAll: () => counters
    };
    t.mock.timers.enable({ apis: ['setTimeout'] });
    t.after(() => {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    });

    const downloads = await import(`../js/ui/download.js?test=${++moduleSequence}`);
    const api = await import('../js/data/api.js');
    downloads.initDownloadMessages();
    const key = api.generateCounterKey('1.2.99', 'win', 'x64');
    api.setDownloadCounter(key, '10');

    function createLink() {
        const counter = createElement();
        counter.dataset.counterKey = key;
        counters.push(counter);
        return {
            ...createElement(),
            counter,
            file: { link: 'https://downloads.test/installer.exe', arch: 'x64' },
            closest: () => ({ querySelector: () => counter })
        };
    }

    function renderLink(file) {
        const cell = downloads.createDownloadCell(file, '1.2.99', 'win');
        const [link, , counter] = cell.children[0].children;
        link.closest = () => ({ querySelector: () => counter });
        return { link, counter };
    }

    return {
        api, downloads, frames, counters, key, toast, createLink, renderLink,
        start: link => downloads.handleDownload(link, link.file, '1.2.99', 'win'),
        error: (frame, overrides = {}) => listeners.get('message')({
            data: { type: 'download-error', status: 403, message: 'Denied' },
            origin: 'https://downloads.test',
            source: frame.contentWindow,
            ...overrides
        })
    };
}

test('slow downloads remain active without a false timeout notification', async t => {
    const env = await setup(t);
    await env.start(env.createLink());
    const frame = env.frames[0];
    const url = frame.src;

    t.mock.timers.tick(5 * 60 * 1000);

    assert.equal(env.frames.length, 1);
    assert.equal(frame.src, url);
    assert.equal(env.toast.innerHTML, '');
    assert.equal(env.api.getDownloadCounter(env.key), '11');

    env.error(frame);

    assert.equal(env.frames.length, 0);
    assert.equal(env.api.getDownloadCounter(env.key), '10');
    assert.match(env.toast.innerHTML, /Access denied/);
});

test('the native link handles Enter once and preserves modified clicks', async t => {
    const env = await setup(t);
    const url = 'https://downloads.test/installer.exe';
    const { link } = env.renderLink({ link: url, arch: 'x64' });
    assert.equal(link.tag, 'a');
    assert.equal(link.href, url);
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
        link.listeners.click({ button: 0, [modifier]: true, preventDefault: () => assert.fail('Native action was cancelled') });
    }
    assert.equal(env.frames.length, 0);
    let prevented = 0;
    link.listeners.click({ button: 0, detail: 0, preventDefault() { prevented++; } });
    assert.equal(prevented, 1);
    assert.equal(env.frames.length, 1);
    assert.equal(new URL(env.frames[0].src).pathname, '/installer.exe');
});

test('reopening a build restores its download count and the remaining cooldown', async t => {
    const env = await setup(t);
    const file = { link: 'https://downloads.test/installer.exe', arch: 'x64' };
    const activate = link => link.listeners.click({ button: 0, preventDefault() {} });
    activate(env.renderLink(file).link);
    t.mock.timers.tick(4000);

    const { link, counter } = env.renderLink(file);
    assert.equal(link.classList.contains('download-cooldown'), true);
    assert.match(counter.innerHTML, /11 downloads/);
    activate(link);
    assert.equal(env.frames.length, 1);

    t.mock.timers.tick(1000);
    assert.equal(link.classList.contains('download-cooldown'), false);
    activate(link);
    assert.equal(env.frames.length, 2);
});

test('late errors remove only their own increment and update rerendered counters', async t => {
    const env = await setup(t);
    const firstLink = env.createLink();
    const secondLink = env.createLink();
    await env.start(firstLink);
    await env.start(secondLink);
    const [firstFrame, secondFrame] = env.frames;
    const replacement = createElement();
    replacement.dataset.counterKey = env.key;
    env.counters.splice(0, env.counters.length, replacement);

    assert.equal(env.api.getDownloadCounter(env.key), '12');
    env.error(firstFrame);

    assert.equal(env.api.getDownloadCounter(env.key), '11');
    assert.match(replacement.innerHTML, /11 downloads/);
    assert.equal(env.frames[0], secondFrame);

    env.error(firstFrame);
    assert.equal(env.api.getDownloadCounter(env.key), '11');

    env.error(secondFrame);
    assert.equal(env.api.getDownloadCounter(env.key), '10');
    assert.match(replacement.innerHTML, /10 downloads/);
});

test('unrelated windows and origins cannot cancel a download', async t => {
    const env = await setup(t);
    await env.start(env.createLink());
    const frame = env.frames[0];

    env.error(frame, { origin: 'https://unrelated.test' });
    env.error(frame, { source: {} });

    assert.equal(env.frames.length, 1);
    assert.equal(env.api.getDownloadCounter(env.key), '11');
    assert.equal(env.toast.innerHTML, '');

    env.error(frame);
    assert.equal(env.frames.length, 0);
    assert.equal(env.api.getDownloadCounter(env.key), '10');
});

test('late errors preserve a server snapshot that replaced the optimistic increment', async t => {
    const env = await setup(t);
    const link = env.createLink();
    const revision = env.api.getDownloadCountersRevision();
    await env.start(link);
    const frame = env.frames[0];
    assert.equal(env.api.getDownloadCounter(env.key), '11');
    assert.equal(env.api.getDownloadCountersRevision(), revision);

    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
        downloads: { [env.key]: '10' },
        comments: []
    })));
    await env.api.loadAllData(true);
    assert.equal(env.api.getDownloadCountersRevision(), revision + 1);
    assert.equal(env.api.getDownloadCounter(env.key), '10');

    const replacement = createElement();
    replacement.dataset.counterKey = env.key;
    env.counters.splice(0, env.counters.length, replacement);
    env.error(frame);

    assert.equal(env.api.getDownloadCounter(env.key), '10');
    assert.match(replacement.innerHTML, /10 downloads/);
    assert.match(link.counter.innerHTML, /10 downloads/);
});

test('old errors preserve new optimistic increments made after a server refresh', async t => {
    const env = await setup(t);
    await env.start(env.createLink());
    const oldFrame = env.frames[0];
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
        downloads: { [env.key]: '10' },
        comments: []
    })));
    await env.api.loadAllData(true);
    const newLink = env.createLink();
    await env.start(newLink);
    const newFrame = env.frames[1];

    env.error(oldFrame);
    assert.equal(env.api.getDownloadCounter(env.key), '11');
    assert.match(newLink.counter.innerHTML, /11 downloads/);

    env.error(newFrame);
    assert.equal(env.api.getDownloadCounter(env.key), '10');
    assert.match(newLink.counter.innerHTML, /10 downloads/);
});
