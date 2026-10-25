import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule } from 'node:vm';

const source = await readFile(new URL('../js/ui/sticky-header.js', import.meta.url), 'utf8');

async function createFixture() {
    const state = { visible: true, width: 1000, widths: [260, 180, 180, 180, 200], scrollY: 0, origin: 328, sourceFont: 32, targetFont: 20, titleWidth: 1240, titleHeight: 51.2, titleTop: 104 };
    const frames = [];
    const listeners = new Map();
    const rootStyle = new Map();
    const classes = new Set();
    const columns = state.widths.map(() => ({ style: {} }));
    const makeStyle = () => {
        const properties = new Map();
        return { setProperty: (name, value) => properties.set(name, value), getPropertyValue: name => properties.get(name) || '', removeProperty: name => properties.delete(name) };
    };
    const cells = state.widths.map((_, index) => ({ getBoundingClientRect: () => ({ width: state.widths[index] }) }));
    const makeScroller = () => ({ scrollLeft: 0, listeners: new Map(), addEventListener(name, callback) { this.listeners.set(name, callback); } });
    const scroller = makeScroller();
    const headingScroller = makeScroller();
    const table = { tHead: { rows: [{ cells }] }, getBoundingClientRect: () => ({ width: state.visible ? state.width : 0 }) };
    const heading = { style: makeStyle(), querySelectorAll: () => columns };
    const backdrop = { style: makeStyle(), hidden: true };
    const navigation = { style: makeStyle(), getBoundingClientRect: () => ({ height: 64 }) };
    const title = { style: makeStyle() };
    const heroClasses = new Set();
    const titleRect = () => ({ left: 20, top: state.titleTop - state.scrollY, width: state.titleWidth, height: state.titleHeight });
    const hero = {
        style: makeStyle(), textContent: 'Spotify full installers for desktop', getBoundingClientRect: titleRect,
        classList: { add: name => heroClasses.add(name), remove: name => heroClasses.delete(name) }
    };
    const heroOrigin = { hidden: true, getBoundingClientRect: titleRect };
    const toolbar = { style: makeStyle() };
    const contextTitle = { style: makeStyle(), getBoundingClientRect: () => ({ height: state.visible ? 28 : 0 }) };
    const shell = {
        querySelector: () => headingScroller,
        getBoundingClientRect: () => ({ height: state.visible ? 44 : 0 }),
        classList: {
            remove: name => classes.delete(name),
            toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)
        }
    };
    const sentinel = { getBoundingClientRect: () => ({ top: state.origin - state.scrollY }) };
    const elements = { versionsTable: table, columnHeadingTable: heading, tableHeading: shell, tableHeadingStart: sentinel, headerMorphBackdrop: backdrop, tableContextTitle: contextTitle, heroTitle: hero, heroTitleOrigin: heroOrigin };
    const selected = { '.table-scroll': scroller, '.nav-container': navigation, header: title, '.versions-toolbar': toolbar };
    let resize;
    let motionChange;
    const motion = { matches: false, addEventListener: (_, callback) => { motionChange = callback; } };
    const context = createContext({
        document: {
            getElementById: name => elements[name],
            querySelector: selector => selected[selector],
            documentElement: { clientWidth: 1280, style: { setProperty: (name, value) => rootStyle.set(name, value) } }
        },
        window: { addEventListener: (name, callback) => listeners.set(name, callback), matchMedia: () => motion, get scrollY() { return state.scrollY; } },
        requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
        getComputedStyle: element => ({ fontSize: `${element === contextTitle ? state.targetFont : state.sourceFont}px` }),
        ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} }
    });
    const module = new SourceTextModule(source, { context });
    await module.link(() => assert.fail('Unexpected dependency'));
    await module.evaluate();
    module.namespace.initStickyTableHeader();
    const flush = () => {
        while (frames.length) frames.splice(0).forEach(callback => callback());
    };
    flush();
    return { state, columns, heading, rootStyle, classes, scroller, headingScroller, frames, flush, backdrop, navigation, title, toolbar, contextTitle, hero, heroOrigin, motion, resize: () => resize(), scroll: () => listeners.get('scroll')(), motionChange: () => motionChange() };
}

test('column widths follow the data table and batch resize updates', async () => {
    const fixture = await createFixture();
    assert.equal(fixture.heading.style.width, '1000px');
    assert.deepEqual(fixture.columns.map(column => column.style.width), ['260px', '180px', '180px', '180px', '200px']);
    fixture.state.widths = [300, 160, 160, 160, 220];
    fixture.resize();
    fixture.resize();
    assert.equal(fixture.frames.length, 1);
    fixture.flush();
    assert.deepEqual(fixture.columns.map(column => column.style.width), ['300px', '160px', '160px', '160px', '220px']);
    assert.equal(fixture.heading.style.transform, undefined);
});

test('the same hero title shrinks into the header and reverses with scrolling', async () => {
    const fixture = await createFixture();
    assert.equal(fixture.hero.style.getPropertyValue('font-size'), '32px');
    assert.equal(fixture.heroOrigin.hidden, false);
    assert.equal(fixture.toolbar.style.getPropertyValue('--intro-opacity'), '1');
    fixture.state.scrollY = 150;
    fixture.scroll();
    fixture.flush();
    const filterOpacity = Number(fixture.toolbar.style.getPropertyValue('--intro-opacity'));
    assert.ok(filterOpacity > 0 && filterOpacity < 1);
    assert.match(fixture.hero.style.getPropertyValue('transform'), /scale\(0\./);
    fixture.state.scrollY = 300;
    fixture.scroll();
    fixture.flush();
    assert.equal(fixture.toolbar.style.getPropertyValue('--intro-opacity'), '0');
    assert.equal(fixture.hero.style.getPropertyValue('font-size'), '20px');
    assert.match(fixture.hero.style.getPropertyValue('transform'), /scale\(1\)$/);
    assert.equal(fixture.toolbar.inert, true);
    assert.equal(fixture.classes.has('is-pinned'), true);
    fixture.state.scrollY = 0;
    fixture.scroll();
    fixture.flush();
    assert.equal(fixture.hero.style.getPropertyValue('font-size'), '32px');
    assert.equal(fixture.toolbar.style.getPropertyValue('--intro-opacity'), '1');
    assert.equal(fixture.hero.style.getPropertyValue('transform'), 'translate3d(20px, 104px, 0) scale(1)');
    assert.equal(fixture.toolbar.inert, false);
    assert.equal(fixture.classes.has('is-pinned'), false);
});

test('horizontal scrolling stays synchronized in both directions', async () => {
    const fixture = await createFixture();
    fixture.scroller.scrollLeft = 30;
    fixture.scroller.listeners.get('scroll')();
    assert.equal(fixture.headingScroller.scrollLeft, 30);
    fixture.headingScroller.scrollLeft = 55;
    fixture.headingScroller.listeners.get('scroll')();
    assert.equal(fixture.scroller.scrollLeft, 55);
});

test('the hero settles only when the column headings reach their pinned position', async () => {
    const fixture = await createFixture();
    const distance = fixture.state.origin - parseFloat(fixture.rootStyle.get('--table-context-height'));
    for (const progress of [0.75, 0.9, 0.99]) {
        fixture.state.scrollY = distance * progress;
        fixture.scroll();
        fixture.flush();
        assert.equal(fixture.hero.style.getPropertyValue('font-size'), '32px');
        assert.doesNotMatch(fixture.hero.style.getPropertyValue('transform'), /scale\(1\)$/);
        assert.equal(fixture.classes.has('is-pinned'), false);
    }
    fixture.state.scrollY = distance;
    fixture.scroll();
    fixture.flush();
    assert.equal(fixture.hero.style.getPropertyValue('font-size'), '20px');
    assert.match(fixture.hero.style.getPropertyValue('transform'), /scale\(1\)$/);
    assert.equal(fixture.classes.has('is-pinned'), true);
});

test('hiding the table clears its appearance and reserved scroll space', async () => {
    const fixture = await createFixture();
    fixture.state.scrollY = 300;
    fixture.scroll();
    fixture.flush();
    fixture.state.visible = false;
    fixture.resize();
    fixture.flush();
    assert.equal(fixture.classes.has('is-pinned'), false);
    assert.equal(fixture.rootStyle.get('--table-heading-height'), '0px');
    assert.equal(fixture.backdrop.hidden, true);
    assert.equal(fixture.heroOrigin.hidden, true);
    assert.equal(fixture.hero.style.getPropertyValue('font-size'), '');
    fixture.state.visible = true;
    fixture.resize();
    fixture.flush();
    assert.equal(fixture.rootStyle.get('--table-heading-height'), '88px');
    assert.equal(fixture.backdrop.hidden, false);
});

test('reduced motion disables intro movement and the gradient sweep', async () => {
    const fixture = await createFixture();
    fixture.motion.matches = true;
    fixture.motionChange();
    fixture.state.scrollY = 150;
    fixture.scroll();
    fixture.flush();
    assert.equal(fixture.hero.style.getPropertyValue('font-size'), '32px');
    assert.equal(fixture.hero.style.getPropertyValue('transform'), 'translate3d(20px, -46px, 0) scale(1)');
    assert.equal(fixture.toolbar.style.getPropertyValue('--intro-blur'), '0px');
    assert.equal(fixture.backdrop.style.getPropertyValue('--morph-scrim-height'), '0px');
});

test('a wrapped mobile title reserves enough room above the column names', async () => {
    const fixture = await createFixture();
    Object.assign(fixture.state, { sourceFont: 22, targetFont: 16, titleWidth: 335, titleHeight: 59.4 });
    fixture.resize();
    fixture.flush();
    fixture.state.scrollY = 300;
    fixture.scroll();
    fixture.flush();
    assert.equal(fixture.hero.style.getPropertyValue('font-size'), '16px');
    assert.equal(fixture.rootStyle.get('--table-context-height'), '56px');
    assert.equal(fixture.rootStyle.get('--table-heading-height'), '100px');
});
