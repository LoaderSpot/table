import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const sourceRoot = new URL('../js/', import.meta.url);

class Element {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.children = [];
        this.listeners = new Map();
        this.attributes = new Map();
        this.style = { opacity: '1' };
        this.value = '';
        this.text = '';
        const classes = new Set();
        this.classList = {
            add: name => classes.add(name),
            remove: name => classes.delete(name),
            contains: name => classes.has(name)
        };
    }

    set textContent(value) {
        this.text = String(value);
        this.children = [];
    }

    get textContent() {
        return this.text + this.children.map(child => child.textContent).join('');
    }

    set innerHTML(value) {
        assert.equal(value, '', 'Untrusted content must not reach the HTML parser');
        this.textContent = '';
    }

    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes.set(name, value); }
    addEventListener(name, listener) { this.listeners.set(name, listener); }
    dispatch(name) { this.listeners.get(name)?.({ target: this }); }
    focus() { this.focused = true; }
}

async function createApp(search = '') {
    const elements = new Map();
    const renders = [];
    const element = name => {
        if (!elements.has(name)) elements.set(name, new Element());
        return elements.get(name);
    };
    const context = createContext({
        URLSearchParams,
        window: { location: { search } },
        document: {
            createElement: tagName => new Element(tagName),
            getElementById: element,
            querySelector: selector => selector === '.clear-search' ? element(selector) : null,
            addEventListener() {}
        },
        setTimeout: (...args) => setTimeout(...args),
        clearTimeout: timer => clearTimeout(timer)
    });
    let state;
    const render = () => renders.push({
        term: state.currentSearchTerm,
        os: state.currentOS,
        results: state.currentSearchResults
    });
    const mocks = {
        'router/routes.js': { syncUrlWithState() {} },
        'ui/sort.js': { updateSortUI() {} },
        'data/normalize.js': { getOrderedArchKeys: (_, links) => Object.keys(links) },
        'ui/table.js': {
            observer: { unobserve() {} },
            sentinel: {},
            setSearchRunner() {},
            showTemporarilyUnavailableNotice: render,
            startLazyLoading: render,
            reRenderVersions: render,
            resetTableLoadingState() {}
        }
    };
    const modules = new Map();
    async function load(url) {
        if (modules.has(url.href)) return modules.get(url.href);
        const relative = url.href.slice(sourceRoot.href.length);
        const mock = mocks[relative];
        const module = mock
            ? new SyntheticModule(Object.keys(mock), function () {
                for (const [name, value] of Object.entries(mock)) this.setExport(name, value);
            }, { context, identifier: url.href })
            : new SourceTextModule(await readFile(url, 'utf8'), { context, identifier: url.href });
        modules.set(url.href, module);
        await module.link((specifier, referring) => load(new URL(specifier, referring.identifier)));
        return module;
    }
    const stateModule = await load(new URL('state.js', sourceRoot));
    await stateModule.evaluate();
    state = stateModule.namespace.state;
    const searchModule = await load(new URL('ui/search.js', sourceRoot));
    await searchModule.evaluate();
    const filterModule = await load(new URL('ui/filters.js', sourceRoot));
    await filterModule.evaluate();
    state.allVersions = [
        ['1.2.9.746', { fullversion: '1.2.9.746.ga', links: { win: { x64: 'win-old' } } }],
        ['1.2.99.317', { fullversion: '1.2.99.317.gb', links: { win: { x64: 'win-new' }, mac: { arm64: 'mac-new' } } }],
        ['1.2.99.300', { fullversion: '1.2.99.300.gc', links: { mac: { intel: 'mac-old' } } }]
    ];
    searchModule.namespace.initSearchControls();
    return {
        state,
        stateModule: stateModule.namespace,
        search: searchModule.namespace,
        filters: filterModule.namespace,
        element,
        renders,
        input(term) {
            element('versionSearch').value = term;
            element('versionSearch').dispatch('input');
        }
    };
}

test('URL filters reject markup while preserving custom versions and comment backlinks', async () => {
    const payload = '<img src=x onerror=window.xss=1>';
    const app = await createApp(`?winVersion=${encodeURIComponent(payload)}&macVersion=1.2.99.317&linuxVersion=1.2.99`);
    assert.equal(app.state.currentWinVersionFilter, null);
    assert.equal(app.state.currentMacVersionFilter, '1.2.99.317');
    assert.equal(app.state.currentLinuxVersionFilter, '1.2.99');
    app.stateModule.setCurrentVersionFilter('mac', payload);
    assert.equal(app.state.currentMacVersionFilter, null);
    app.stateModule.setCurrentVersionFilter('win', '1.2.5.1006');
    assert.equal(app.state.currentWinVersionFilter, '1.2.5.1006');
});

test('filter labels display payloads as text and keep a working close button', async () => {
    const app = await createApp('?winVersion=1.2.99.317');
    const label = new Element();
    const payload = '<svg onload=window.xss=1>';
    app.filters.updateVersionLabel(label, payload, 'win');
    assert.equal(label.textContent, `${payload}×`);
    const buttons = label.children.filter(child => child.tagName === 'button');
    assert.equal(buttons.length, 1);
    const button = buttons[0];
    assert.equal(button.tagName, 'button');
    assert.equal(button.type, 'button');
    button.listeners.get('click')({ stopPropagation() {}, preventDefault() {} });
    assert.equal(app.state.currentWinVersionFilter, null);
    assert.equal(app.renders.length, 1);
});

test('fast typing renders only the latest query after a short pause without hiding the table', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const app = await createApp();
    for (const term of ['1', '1.2', '1.2.9', '1.2.99']) {
        app.input(term);
        t.mock.timers.tick(50);
    }
    assert.equal(app.renders.length, 0);
    assert.equal(app.element('versions-container').style.opacity, '1');
    t.mock.timers.tick(149);
    assert.equal(app.renders.length, 0);
    t.mock.timers.tick(1);
    assert.equal(app.renders.length, 1);
    assert.equal(app.renders[0].term, '1.2.99');
    assert.deepEqual(Array.from(app.state.currentSearchResults, ([version]) => version), ['1.2.99.317']);
    t.mock.timers.tick(1000);
    assert.equal(app.renders.length, 1);
});

test('clear button immediately resets results and cancels a queued query', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const app = await createApp();
    app.input('1.2.99');
    t.mock.timers.tick(100);
    app.element('.clear-search').dispatch('click');
    assert.equal(app.state.currentSearchTerm, '');
    assert.equal(app.state.currentSearchResults, null);
    assert.equal(app.renders.length, 1);
    assert.equal(app.element('versionSearch').focused, true);
    t.mock.timers.tick(1000);
    assert.equal(app.renders.length, 1);
});

test('deleting the final character clears immediately', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const app = await createApp();
    app.input('1');
    app.input('');
    assert.equal(app.renders.length, 1);
    assert.equal(app.state.currentSearchResults, null);
    t.mock.timers.tick(1000);
    assert.equal(app.renders.length, 1);
});

test('a queued search uses the current platform and architecture', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const app = await createApp();
    app.input('1.2.99');
    t.mock.timers.tick(100);
    app.state.currentOS = 'mac';
    app.state.currentArch = 'intel';
    t.mock.timers.tick(100);
    assert.equal(app.renders.length, 1);
    assert.equal(app.renders[0].os, 'mac');
    assert.deepEqual(Array.from(app.state.currentSearchResults, ([version]) => version), ['1.2.99.300']);
});

test('programmatic searches run immediately and cancel pending input', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const app = await createApp();
    app.input('1.2.9');
    app.state.currentOS = 'mac';
    app.search.performSearch('1.2.99');
    assert.equal(app.renders.length, 1);
    assert.equal(app.renders[0].term, '1.2.99');
    assert.equal(app.renders[0].os, 'mac');
    t.mock.timers.tick(1000);
    assert.equal(app.renders.length, 1);
});

test('Linux data loading resumes the current search without another timer', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const app = await createApp();
    app.input('1.2.99');
    app.state.currentOS = 'linux';
    app.search.setLinuxLoader(() => {
        app.state.linuxVersionsData = [{ version: { short: '1.2.99.300', full: '1.2.99.300.gc' } }];
        app.state.linuxDataLoaded = true;
        app.search.performSearch(app.state.currentSearchTerm);
    });
    t.mock.timers.tick(200);
    assert.equal(app.renders.length, 1);
    assert.equal(app.renders[0].os, 'linux');
    assert.equal(app.state.currentSearchResults[0].version.short, '1.2.99.300');
});
