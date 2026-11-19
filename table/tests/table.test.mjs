import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

globalThis.window = { location: new URL('https://example.test/versions') };
const { readVersionsUrlState, state } = await import('../js/state.js');
const { buildLinuxVersionsData, normalizeVersionsData } = await import('../js/data/normalize.js');
const { prepareTableItems } = await import('../js/ui/table-items.js');
const { restoreVersionsUrlState, syncUrlWithState } = await import('../js/router/routes.js');

function loadCatalog(search) {
    const data = normalizeVersionsData({
        '1.2.9.2': { win: { x64: { url: 'b', size: 4000000 }, arm64: { url: 'c', size: 2000000 } } },
        '1.2.9.1': { links: { win: { x64: 'a' } }, linux: { amd64: 'deb-a' } },
        '1.2.8.3': { win: { x64: { url: 'd', size: 1000000 } }, linux: { amd64: 'deb-d' } }
    });
    Object.assign(state, readVersionsUrlState(search), {
        allVersions: Object.entries(data),
        linuxVersionsData: buildLinuxVersionsData(data),
        currentSearchResults: null
    });
}

test('size sorting uses individual files and a subsequent search uses version groups', () => {
    loadCatalog('?sortSize=asc');
    const bySize = prepareTableItems();
    assert.equal(bySize.bySize, true);
    assert.deepEqual(bySize.items.map(item => item.file.link), ['a', 'd', 'c', 'b']);
    assert.equal(bySize.items[0].file.date, '—');
    assert.equal(bySize.items[0].file.size, '—');

    state.currentSearchResults = state.allVersions.slice(0, 2);
    state.currentSearchTerm = '1.2.9';
    const search = prepareTableItems();
    assert.equal(search.bySize, false);
    assert.equal(search.items.length, 1);
    assert.equal(search.items[0][0], '1.2.9');
    assert.equal(search.items[0][1].length, 2);
});

test('compatibility and architecture filters apply before groups are paginated', () => {
    loadCatalog('?os=win&arch=x64&winVersion=1.2.9.1');
    const items = prepareTableItems().items;
    assert.deepEqual(items.map(([key]) => key), ['1.2.9', '1.2.8']);
    assert.deepEqual(items[0][1].map(build => build.version.short), ['1.2.9.1']);
    assert.deepEqual(items[0][1][0].architectures.map(file => file.arch), ['x64']);

    loadCatalog('?os=linux&linuxVersion=1.2.8.3');
    assert.deepEqual(prepareTableItems().items.map(([key]) => key), ['1.2.8']);
    state.currentLinuxVersionFilter = '1.0.0';
    assert.equal(prepareTableItems().items.length, 0);
});

test('scrolling consumes one prepared list and stops observing its last search batch', async () => {
    class Node {
        constructor(fragment = false) {
            this.fragment = fragment;
            this.children = [];
            this.dataset = {};
            this.style = {};
        }
        get isConnected() { return this.parent === body; }
        remove() {
            if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
            this.parent = null;
        }
        append(...nodes) {
            for (const node of nodes) {
                if (node.fragment) this.append(...node.children);
                else {
                    node.remove();
                    this.children.push(node);
                    node.parent = this;
                }
            }
        }
        appendChild(node) { this.append(node); }
        replaceChildren() { this.children.slice().forEach(node => node.remove()); }
        setAttribute() {}
    }
    loadCatalog('?sortSize=asc');
    const build = state.allVersions[0][1];
    state.currentSearchResults = Array.from({ length: 11 }, (_, index) => [`1.2.${index}.1`, build]);
    state.currentSearchTerm = '1.2.';
    let preparations = 0;
    let intersect;
    let observed = false;
    const body = new Node();
    const context = createContext({
        document: {
            getElementById: () => body,
            createElement: () => new Node(),
            createDocumentFragment: () => new Node(true)
        },
        IntersectionObserver: class {
            constructor(callback) { intersect = () => callback([{ isIntersecting: true }]); }
            observe() { observed = true; }
            unobserve() { observed = false; }
            takeRecords() { return []; }
        }
    });
    const dependencies = {
        '../state.js': await import('../js/state.js'),
        './table-items.js': { prepareTableItems() { preparations++; return prepareTableItems(); } },
        '../utils/version.js': { getOsDisplayName() {} },
        './download.js': { createDownloadCell: () => new Node() },
        './components.js': {
            createVersionElement: () => ({ versionText: new Node() }), createVersionContainer: node => node,
            addBuildBranch() {}, connectBuildFamily() {}, createSpoiler() {}, resetFamilyOrigins() {}
        }
    };
    const source = await readFile(new URL('../js/ui/table.js', import.meta.url), 'utf8');
    const table = new SourceTextModule(source, { context });
    await table.link(specifier => {
        const exports = dependencies[specifier];
        return new SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await table.evaluate();
    table.namespace.startLazyLoading();
    assert.equal(observed, true);
    assert.equal(body.children.length, 11);
    intersect();
    assert.equal(body.children.length, 21);
    intersect();
    assert.equal(observed, false);
    assert.equal(table.namespace.sentinel.isConnected, false);
    intersect();
    assert.equal(body.children.length, 22);
    assert.equal(preparations, 1);
});

test('history restores the platform, filters, search and sort from the current entry', () => {
    const macUrl = new URL('https://example.test/versions?os=mac&arch=intel&macVersion=1.2.98.301&sortSize=desc');
    window.location = macUrl;
    assert.equal(restoreVersionsUrlState(), true);
    assert.equal(state.currentOS, 'mac');
    assert.equal(state.currentArch, 'intel');
    assert.equal(state.currentMacVersionFilter, '1.2.98.301');
    assert.equal(state.currentSortColumn, 'size');
    assert.equal(restoreVersionsUrlState(), false);

    state.currentOS = 'win';
    state.currentSearchTerm = '1.2.9';
    window.history = { replaceState(_data, _title, url) { window.location = url; } };
    syncUrlWithState();
    assert.equal(restoreVersionsUrlState(), false);
    assert.equal(state.currentSortColumn, 'size');

    window.location = macUrl;
    assert.equal(restoreVersionsUrlState(), true);
    assert.equal(state.currentOS, 'mac');
    assert.equal(state.currentSearchTerm, '');
    assert.equal(state.sortSizeAscending, false);
});
