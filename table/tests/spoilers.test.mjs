import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const source = await readFile(new URL('../js/ui/components.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

async function createFixture({ expanded = false, motion = true, builds = 1 } = {}) {
    const animations = [];
    const observed = new Set();
    const frames = new Map();
    const media = { matches: false };
    let resize;
    let nextFrame = 0;

    class Element {
        constructor(tag, name = '') {
            this.tag = tag;
            this.children = [];
            this.className = name;
            this.dataset = {};
            this.attributes = {};
            this.style = { setProperty(key, value) { this[key] = value; } };
            this.classList = {
                contains: value => this.className.split(' ').includes(value),
                add: value => { if (!this.classList.contains(value)) this.className += ' ' + value; },
                toggle: (value, on) => {
                    if (on) this.classList.add(value);
                    else this.className = this.className.split(' ').filter(item => item !== value).join(' ');
                }
            };
            this.rect = { top: 0, height: 44, width: 200 };
        }

        get firstChild() { return this.children[0]; }
        get isConnected() { return this === table || Boolean(this.parent?.isConnected); }
        append(...items) {
            for (const item of items) { item.remove(); item.parent = this; this.children.push(item); }
        }
        appendChild(item) { this.append(item); return item; }
        after(...items) {
            const parent = this.parent;
            for (const item of items) item.remove();
            parent.children.splice(parent.children.indexOf(this) + 1, 0, ...items);
            items.forEach(item => { item.parent = parent; });
        }
        replaceWith(...items) { this.after(...items); this.remove(); }
        remove() {
            if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
            this.parent = null;
        }
        createTBody() { return this.appendChild(new Element('tbody')); }
        insertCell() { return this.appendChild(new Element('td')); }
        closest(tag) { return this.tag === tag ? this : this.parent?.closest(tag); }
        querySelectorAll(selector) {
            return this.children.flatMap(child => {
                const matches = selector.startsWith('.') ? child.classList.contains(selector.slice(1)) : selector === child.tag;
                return [...(matches ? [child] : []), ...child.querySelectorAll(selector)];
            });
        }
        querySelector(selector) { return this.querySelectorAll(selector)[0]; }
        setAttribute(name, value) { this.attributes[name] = value; }
        addEventListener(name, callback) { this[name] = callback; }
        getBoundingClientRect() {
            if (this.classList.contains('build-reveal-table')) {
                return { ...this.rect, height: this.querySelectorAll('tr').reduce((sum, row) => sum + row.rect.height, 0) };
            }
            return this.rect;
        }
        animate(keys, options) {
            let done, fail;
            const entry = {
                target: this, keys, options, frame: keys[0],
                finished: new Promise((resolve, reject) => { done = resolve; fail = reject; }),
                finish() { this.frame = keys[1]; done(); },
                cancel: () => { this.current = null; entry.cancelled = true; fail(new Error('Cancelled')); }
            };
            this.current = entry;
            animations.push(entry);
            return entry;
        }
    }

    const table = new Element('table');
    table.tHead = { rows: [{ cells: Array.from({ length: 5 }, () => new Element('th')) }] };
    const body = table.createTBody();
    const node = (tag, name, parent) => parent.appendChild(new Element(tag, name));
    const makeRows = () => {
        const first = new Element('tr');
        const cell = node('td', 'version-cell', first);
        cell.rowSpan = 2;
        node('span', 'short-version', node('div', 'version-line-top', cell));
        node('td', 'arch-cell', first);
        const second = new Element('tr');
        node('td', 'arch-cell', second);
        return [first, second];
    };
    const parents = makeRows();
    body.append(...parents);
    const button = new Element('button');
    Object.assign(button.dataset, { collapsedTitle: 'Show older builds', collapsedLabel: 'Show additional builds' });
    if (!motion) button.animate = undefined;

    const context = createContext({
        document: { createElement: tag => new Element(tag) },
        window: { matchMedia: () => media },
        getComputedStyle: element => element.current?.frame || { opacity: '1' },
        requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
        cancelAnimationFrame: id => frames.delete(id),
        ResizeObserver: class {
            constructor(callback) { resize = callback; }
            observe(element) { observed.add(element); }
            unobserve(element) { observed.delete(element); }
            disconnect() { observed.clear(); }
        }
    });
    const dependencies = {
        '../state.js': { state: {} }, '../utils/clipboard.js': { copyTextToClipboard() {} },
        '../utils/version.js': { highlight() {} }, './comments.js': { createCommentButton() {} }
    };
    const module = new SourceTextModule(source, { context });
    await module.link(specifier => {
        const exports = dependencies[specifier];
        return new SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await module.evaluate();
    const children = [];
    let creations = 0;
    module.namespace.connectBuildFamily(parents, button, '1.2.3', expanded, () => {
        creations++;
        children.length = 0;
        for (let i = 0; i < builds; i++) {
            const rows = makeRows();
            rows[0].rect.height = 293;
            for (const row of rows) {
                row.classList.toggle('build-branch-last', i === builds - 1);
                module.namespace.addBuildBranch(row);
            }
            children.push(...rows);
        }
        return children.slice();
    });
    return {
        parents, children, button, body, animations, media, observed, frames,
        get creations() { return creations; },
        resize: targets => resize(targets.map(target => ({ target }))),
        step: () => { const callbacks = Array.from(frames.values()); frames.clear(); callbacks.forEach(fn => fn()); },
        reset: module.namespace.resetFamilyOrigins
    };
}

test('collapsed groups create no child rows or observers until first opened', async () => {
    const f = await createFixture();
    assert.equal(f.creations, 0);
    assert.equal(f.observed.size, 0);
    assert.deepEqual(f.body.children, f.parents);
    f.button.click();
    assert.equal(f.creations, 1);
    assert.equal(f.button.attributes['aria-expanded'], 'true');
    assert.ok(f.children.every(row => row.isConnected && !row.inert));
});

test('all builds and branches share one reveal up to their natural height', async () => {
    const f = await createFixture({ builds: 3 });
    f.button.click();
    assert.equal(f.animations.length, 1);
    const [animation] = f.animations;
    assert.equal(animation.keys[0].gridTemplateRows, '0fr');
    assert.equal(animation.keys[1].gridTemplateRows, '1fr');
    assert.equal(animation.target.querySelector('table').getBoundingClientRect().height, (293 + 44) * 3);
    assert.equal(animation.keys[0].opacity, '0');
    assert.equal(animation.keys[1].opacity, '1');
    assert.equal(animation.options.duration, 280);
    assert.equal(animation.target.querySelectorAll('.build-tree-stem').length, 6);
    animation.finish();
    await flush();
    assert.deepEqual(f.body.children, [...f.parents, ...f.children]);
    assert.equal(f.children[0].querySelector('.version-cell').rowSpan, 2);
});

test('rapid reversal continues from the current height and opacity in both directions', async () => {
    const f = await createFixture();
    f.button.click();
    const [opening] = f.animations;
    opening.frame = { gridTemplateRows: '0.4fr', opacity: '0.4' };
    f.button.click();
    const closing = f.animations[1];
    assert.equal(opening.cancelled, true);
    assert.deepEqual({ ...closing.keys[0] }, opening.frame);
    assert.ok(f.children.every(row => row.inert));
    closing.frame = { gridTemplateRows: '0.2fr', opacity: '0.2' };
    f.button.click();
    const reopening = f.animations[2];
    assert.equal(closing.cancelled, true);
    assert.deepEqual({ ...reopening.keys[0] }, closing.frame);
    assert.equal(f.creations, 1);
    reopening.finish();
    await flush();
    assert.deepEqual(f.body.children, [...f.parents, ...f.children]);
    assert.ok(f.children.every(row => !row.inert));
});

test('an initially expanded group collapses only after its animation finishes', async () => {
    const f = await createFixture({ expanded: true });
    assert.equal(f.animations.length, 0);
    assert.deepEqual(f.body.children, [...f.parents, ...f.children]);
    f.button.click();
    assert.equal(f.animations[0].keys[0].gridTemplateRows, '1fr');
    assert.ok(f.children.every(row => row.isConnected && row.inert));
    assert.equal(f.button.attributes['aria-expanded'], 'false');
    f.animations[0].finish();
    await flush();
    assert.deepEqual(f.body.children, f.parents);
    assert.equal(f.observed.size, 0);
});

test('reduced motion can interrupt an animated reveal and settle immediately', async () => {
    const f = await createFixture();
    f.button.click();
    f.media.matches = true;
    f.button.click();
    assert.deepEqual(f.body.children, f.parents);
    assert.equal(f.animations[0].cancelled, true);
    f.button.click();
    await flush();
    assert.equal(f.animations.length, 1);
    assert.deepEqual(f.body.children, [...f.parents, ...f.children]);
    assert.equal(f.button.attributes['aria-expanded'], 'true');
});

test('browsers without animations expand and collapse using native rows', async () => {
    const f = await createFixture({ motion: false });
    f.button.click();
    assert.deepEqual(f.body.children, [...f.parents, ...f.children]);
    f.button.click();
    assert.deepEqual(f.body.children, f.parents);
    assert.equal(f.animations.length, 0);
});

test('tree origins measure only resized rows and release them on a view change', async () => {
    const f = await createFixture({ expanded: true });
    const row = f.parents[0];
    const cell = row.querySelector('.version-cell');
    const short = row.querySelector('.short-version');
    row.rect.top = 10;
    cell.rect.top = 12;
    short.rect = { top: 40, height: 28 };
    f.resize([row, short]);
    f.resize([short]);
    assert.equal(f.frames.size, 1);
    f.step();
    assert.equal(row.style['--build-root-top'], '44px');
    assert.equal(cell.style['--build-root-inset'], '42px');
    assert.equal(f.children[0].style['--build-root-top'], undefined);
    short.rect.top = 52;
    f.resize([short]);
    f.step();
    assert.equal(row.style['--build-root-top'], '56px');
    f.resize([short]);
    f.reset();
    assert.equal(f.observed.size, 0);
    assert.equal(f.frames.size, 0);
});
