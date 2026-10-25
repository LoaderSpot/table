import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const componentSource = await readFile(new URL('../js/ui/components.js', import.meta.url), 'utf8');

function createClassList(initial = []) {
    const values = new Set(initial);
    return {
        contains: value => values.has(value),
        add: value => values.add(value),
        toggle(value, enabled) { enabled ? values.add(value) : values.delete(value); }
    };
}

async function createSpoilerFixture({ expanded = false, reducedMotion = false, animate = true, builds = 1 } = {}) {
    const animations = [];
    const media = { matches: reducedMotion };
    const attributes = new Map();
    const observedOrigins = new Set();
    let resizeOrigins;
    const button = { classList: createClassList(expanded ? ['expanded'] : []), dataset: { collapsedLabel: 'Show additional builds' }, setAttribute: (name, value) => attributes.set(name, value) };
    const makeAnimatedElement = natural => {
        const wrapper = {
            activeAnimations: new Set(),
            get frame() { return Object.assign({}, natural, ...[...this.activeAnimations].map(animation => animation.frame)); },
            getBoundingClientRect() { return { height: parseFloat(this.frame.height) }; }
        };
        if (animate) {
            wrapper.animate = (frames, options) => {
                let resolve;
                let reject;
                const animation = {
                    wrapper, frames, options, frame: frames[0], cancelled: false,
                    finished: new Promise((done, fail) => { resolve = done; reject = fail; }),
                    cancel() {
                        this.cancelled = true;
                        wrapper.activeAnimations.delete(this);
                        reject(new Error('Animation cancelled'));
                    },
                    finish() { this.frame = frames[1]; resolve(); }
                };
                animations.push(animation);
                wrapper.activeAnimations.add(animation);
                return animation;
            };
        }
        return wrapper;
    };
    const rows = Array.from({ length: builds * 2 }, (_, rowIndex) => {
        const withVersion = rowIndex % 2 === 0;
        let tree;
        let junction;
        const topLine = { appendChild: element => { junction = element; } };
        const cells = Array.from({ length: withVersion ? 5 : 4 }, (_, index) => {
            const wrapper = makeAnimatedElement({ height: withVersion && index === 0 ? '293px' : '44px', opacity: '1', paddingTop: '7px', paddingBottom: '7px', transform: 'none' });
            return {
                wrapper,
                rowSpan: withVersion && index === 0 ? 2 : 1,
                querySelector: selector => selector === '.version-line-top' ? topLine : wrapper,
                appendChild: element => { tree = element; },
                getAttribute: name => name === 'data-download-url' ? 'https://example.com/installer' : null
            };
        });
        return {
            cells,
            dataset: { spoilerIndex: String(Math.floor(rowIndex / 2)) },
            style: { display: expanded ? '' : 'none', setProperty(name, value) { this[name] = value; } },
            getBoundingClientRect() { return { height: this.style.display === 'none' ? 0 : parseFloat(cells[withVersion ? 1 : 0].wrapper.frame.height) }; },
            classList: createClassList(expanded ? ['visible'] : []),
            querySelector: selector => ({ '.version-cell': withVersion ? cells[0] : null, '.arch-cell': cells[withVersion ? 1 : 0], '.build-tree': tree })[selector],
            querySelectorAll: selector => selector === 'td' ? cells : selector === '.cell-wrapper' ? cells.map(cell => cell.wrapper) : [...(tree?.children || [])]
        };
    });
    const context = createContext({
        document: {
            querySelectorAll: () => rows,
            querySelector: () => button,
            createElement() {
                const element = makeAnimatedElement({ opacity: '1', clipPath: 'inset(0px)' });
                element.children = [];
                element.classList = { contains: name => element.className?.split(' ').includes(name) };
                element.setAttribute = () => {};
                element.appendChild = child => element.children.push(child);
                return element;
            }
        },
        window: { matchMedia: () => media },
        getComputedStyle: wrapper => wrapper.frame,
        requestAnimationFrame: callback => { callback(); return 1; },
        ResizeObserver: class {
            constructor(callback) { resizeOrigins = callback; }
            observe(element) { observedOrigins.add(element); }
            unobserve(element) { observedOrigins.delete(element); }
        }
    });
    const dependencies = {
        '../state.js': { state: {} },
        '../data/meta.js': { linkMetaCache: new Map(), updateLinkInfo() {} },
        '../utils/clipboard.js': { copyTextToClipboard() {} },
        '../utils/version.js': { highlight() {} },
        './comments.js': { createCommentButton() {} }
    };
    const module = new SourceTextModule(componentSource, { context });
    await module.link(specifier => {
        const dependency = dependencies[specifier];
        assert.ok(dependency, `Unexpected dependency: ${specifier}`);
        return new SyntheticModule(Object.keys(dependency), function () {
            for (const [name, value] of Object.entries(dependency)) this.setExport(name, value);
        }, { context });
    });
    await module.evaluate();
    return { rows, button, attributes, animations, media, toggle: () => module.namespace.toggleSpoiler('test'), connect: module.namespace.connectBuildFamily, resizeOrigins: () => resizeOrigins(), observedOrigins };
}

const flushAnimations = () => new Promise(resolve => setImmediate(resolve));

test('rapid reversal starts at the current frame and only the latest click settles visibility', async () => {
    const fixture = await createSpoilerFixture();
    fixture.toggle();
    const expanding = fixture.animations.slice();
    expanding.forEach(animation => {
        animation.frame = { height: '19px', opacity: '0.4', paddingTop: '3px', paddingBottom: '3px' };
    });

    fixture.toggle();
    const collapsing = fixture.animations.slice(expanding.length);
    assert.ok(expanding.every(animation => animation.cancelled));
    assert.ok(collapsing.filter(animation => 'height' in animation.frames[0]).every(animation => animation.frames[0].height === '19px'));
    assert.ok(collapsing.filter(animation => 'opacity' in animation.frames[0]).every(animation => animation.frames[0].opacity === '0.4'));
    collapsing.forEach(animation => {
        animation.frame = { height: '11px', opacity: '0.2', paddingTop: '2px', paddingBottom: '2px' };
    });

    fixture.toggle();
    const latest = fixture.animations.slice(expanding.length + collapsing.length);
    assert.ok(latest.filter(animation => 'height' in animation.frames[0]).every(animation => animation.frames[0].height === '11px'));
    assert.ok(latest.filter(animation => 'opacity' in animation.frames[0]).every(animation => animation.frames[0].opacity === '0.2'));
    await flushAnimations();
    assert.ok(fixture.rows.every(row => row.style.display === '' && row.classList.contains('visible')));

    latest.forEach(animation => animation.finish());
    await flushAnimations();
    assert.ok(fixture.button.classList.contains('expanded'));
    assert.ok(fixture.rows.every(row => row.style.display === ''));
    assert.ok(latest.every(animation => animation.cancelled));
});

test('collapse waits for the whole animation and handles initially expanded rows', async () => {
    const fixture = await createSpoilerFixture({ expanded: true });
    fixture.toggle();
    assert.equal(fixture.animations[0].frames[0].height, '293px');
    assert.ok(fixture.rows.every(row => row.style.display === ''));

    fixture.animations.slice(1).forEach(animation => animation.finish());
    await flushAnimations();
    assert.ok(fixture.rows.every(row => row.style.display === ''));

    fixture.animations[0].finish();
    await flushAnimations();
    assert.ok(fixture.rows.every(row => row.style.display === 'none' && !row.classList.contains('visible')));
    assert.equal(fixture.button.classList.contains('expanded'), false);
    assert.equal(fixture.rows[0].cells[0].rowSpan, 2);
});

test('expansion measures actual content height without a fixed cap or display override', async () => {
    const fixture = await createSpoilerFixture();
    fixture.toggle();
    assert.equal(fixture.animations[0].frames[0].height, '0px');
    assert.equal(fixture.animations[0].frames[1].height, '293px');
    assert.ok(fixture.animations.filter(animation => 'height' in animation.frames[0]).every(animation => !animation.options.delay));
    fixture.animations.forEach(animation => animation.finish());
    await flushAnimations();
    assert.ok(fixture.rows.every(row => row.style.display === ''));
    assert.equal(fixture.rows[0].cells[0].rowSpan, 2);
});

test('all builds and architectures share one uninterrupted reveal', async () => {
    const fixture = await createSpoilerFixture({ builds: 3 });
    fixture.toggle();
    const layouts = fixture.animations.filter(animation => 'height' in animation.frames[0]);
    const reveals = fixture.animations.filter(animation => 'opacity' in animation.frames[0]);
    assert.equal(new Set(layouts.map(animation => animation.options.duration)).size, 1);
    assert.ok(layouts.every(animation => !animation.options.delay));
    assert.ok(reveals.every(animation => !animation.options.delay));
    assert.ok(reveals.every(animation => animation.options.duration === layouts[0].options.duration));
    assert.equal(fixture.attributes.get('aria-expanded'), 'true');
    assert.ok(fixture.rows.every(row => !row.inert));
    fixture.animations.forEach(animation => animation.finish());
    await flushAnimations();
    fixture.toggle();
    assert.equal(fixture.attributes.get('aria-expanded'), 'false');
    assert.ok(fixture.rows.every(row => row.inert));
    fixture.animations.filter(animation => !animation.cancelled).forEach(animation => animation.finish());
    await flushAnimations();
    assert.ok(fixture.rows.every(row => row.style.display === 'none'));
});

test('reduced motion cancels a pending animation and applies the latest state immediately', async () => {
    const fixture = await createSpoilerFixture();
    fixture.toggle();
    fixture.media.matches = true;
    fixture.toggle();
    assert.ok(fixture.animations.every(animation => animation.cancelled));
    assert.ok(fixture.rows.every(row => row.style.display === 'none'));
    fixture.toggle();
    await flushAnimations();
    assert.ok(fixture.rows.every(row => row.style.display === '' && row.classList.contains('visible')));
    assert.ok(fixture.button.classList.contains('expanded'));
});

test('tree lines fade with their builds and reverse from their current opacity', async () => {
    const fixture = await createSpoilerFixture({ builds: 3 });
    fixture.toggle();
    const branches = fixture.animations.filter(animation => animation.wrapper.className === 'build-tree-stem');
    assert.equal(branches.length, 6);
    assert.ok(branches.every(animation => animation.frames[0].opacity === '0' && animation.options.duration === 280));
    branches.forEach(animation => { animation.frame = { opacity: '0.45' }; });
    const previousCount = fixture.animations.length;
    fixture.toggle();
    const reversing = fixture.animations.slice(previousCount).filter(animation => animation.wrapper.className === 'build-tree-stem');
    assert.equal(reversing.length, branches.length);
    assert.ok(reversing.every(animation => animation.frames[0].opacity === '0.45' && animation.frames[1].opacity === '0'));
    assert.ok(reversing.every(animation => !animation.options.delay));
    assert.ok(fixture.rows.every(row => row.style.display === ''));
    fixture.animations.filter(animation => !animation.cancelled).forEach(animation => animation.finish());
    await flushAnimations();
    assert.ok(fixture.rows.every(row => row.style.display === 'none'));
});

test('browsers without animations can still expand and collapse', async () => {
    const fixture = await createSpoilerFixture({ animate: false });
    fixture.toggle();
    assert.ok(fixture.rows.every(row => row.style.display === ''));
    fixture.toggle();
    assert.ok(fixture.rows.every(row => row.style.display === 'none'));
    assert.equal(fixture.animations.length, 0);
});

test('the family trunk stays attached to the short version after resizing and releases removed rows', async () => {
    const fixture = await createSpoilerFixture();
    const rowStyle = new Map();
    const cellStyle = new Map();
    let shortTop = 40;
    const short = { getBoundingClientRect: () => ({ top: shortTop, height: 28 }) };
    const cell = { style: { setProperty: (key, value) => cellStyle.set(key, value) }, getBoundingClientRect: () => ({ top: 12 }) };
    const row = {
        isConnected: true, dataset: {}, classList: createClassList(),
        style: { setProperty: (key, value) => rowStyle.set(key, value) },
        getBoundingClientRect: () => ({ top: 10 }),
        querySelector: selector => selector === '.short-version' ? short : cell
    };
    fixture.connect([row], 'test', true);
    assert.equal(rowStyle.get('--build-root-top'), '44px');
    assert.equal(cellStyle.get('--build-root-inset'), '42px');
    shortTop = 52;
    fixture.resizeOrigins();
    assert.equal(rowStyle.get('--build-root-top'), '56px');
    assert.equal(cellStyle.get('--build-root-inset'), '54px');
    row.isConnected = false;
    fixture.resizeOrigins();
    assert.equal(fixture.observedOrigins.size, 0);
});
