import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const componentSource = await readFile(new URL('../js/ui/components.js', import.meta.url), 'utf8');

function createClassList(initial = []) {
    const values = new Set(initial);
    return {
        contains: value => values.has(value),
        toggle(value, enabled) { enabled ? values.add(value) : values.delete(value); }
    };
}

async function createSpoilerFixture({ expanded = false, reducedMotion = false, animate = true } = {}) {
    const animations = [];
    const media = { matches: reducedMotion };
    const button = { classList: createClassList(expanded ? ['expanded'] : []) };
    const rows = [true, false].map(withVersion => {
        const cells = Array.from({ length: withVersion ? 5 : 4 }, (_, index) => {
            const natural = { height: withVersion && index === 0 ? '293px' : '44px', opacity: '1', paddingTop: '7px', paddingBottom: '7px' };
            const wrapper = {
                currentAnimation: null,
                get frame() { return this.currentAnimation?.frame ?? natural; },
                getBoundingClientRect() { return { height: parseFloat(this.frame.height) }; }
            };
            if (animate) {
                wrapper.animate = (frames, options) => {
                    let resolve;
                    let reject;
                    const animation = {
                        wrapper,
                        frames,
                        options,
                        frame: frames[0],
                        cancelled: false,
                        finished: new Promise((done, fail) => { resolve = done; reject = fail; }),
                        cancel() {
                            this.cancelled = true;
                            if (wrapper.currentAnimation === this) wrapper.currentAnimation = null;
                            reject(new Error('Animation cancelled'));
                        },
                        finish() { this.frame = frames[1]; resolve(); }
                    };
                    animations.push(animation);
                    wrapper.currentAnimation = animation;
                    return animation;
                };
            }
            return {
                wrapper,
                rowSpan: withVersion && index === 0 ? 2 : 1,
                querySelector: () => wrapper,
                getAttribute: name => name === 'data-download-url' ? 'https://example.com/installer' : null
            };
        });
        return {
            cells,
            style: { display: expanded ? '' : 'none' },
            classList: createClassList(expanded ? ['visible'] : []),
            querySelector: selector => selector === '.version-cell' && withVersion ? cells[0] : null,
            querySelectorAll: selector => selector === 'td' ? cells : cells.map(cell => cell.wrapper)
        };
    });
    const context = createContext({
        document: {
            querySelectorAll: () => rows,
            querySelector: () => button
        },
        window: { matchMedia: () => media },
        getComputedStyle: wrapper => wrapper.frame
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
    return { rows, button, animations, media, toggle: () => module.namespace.toggleSpoiler('test') };
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
    assert.ok(collapsing.every(animation => animation.frames[0].height === '19px'));
    collapsing.forEach(animation => {
        animation.frame = { height: '11px', opacity: '0.2', paddingTop: '2px', paddingBottom: '2px' };
    });

    fixture.toggle();
    const latest = fixture.animations.slice(expanding.length + collapsing.length);
    assert.ok(latest.every(animation => animation.frames[0].height === '11px'));
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
    assert.ok(fixture.animations.every(animation => animation.options.delay === undefined));
    fixture.animations.forEach(animation => animation.finish());
    await flushAnimations();
    assert.ok(fixture.rows.every(row => row.style.display === ''));
    assert.equal(fixture.rows[0].cells[0].rowSpan, 2);
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

test('browsers without animations can still expand and collapse', async () => {
    const fixture = await createSpoilerFixture({ animate: false });
    fixture.toggle();
    assert.ok(fixture.rows.every(row => row.style.display === ''));
    fixture.toggle();
    assert.ok(fixture.rows.every(row => row.style.display === 'none'));
    assert.equal(fixture.animations.length, 0);
});
