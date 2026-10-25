export function initStickyTableHeader() {
    const table = document.getElementById('versionsTable');
    const heading = document.getElementById('columnHeadingTable');
    const shell = document.getElementById('tableHeading');
    const sentinel = document.getElementById('tableHeadingStart');
    const scroller = document.querySelector('.table-scroll');
    const headingScroller = shell?.querySelector('.table-heading-scroll');
    const backdrop = document.getElementById('headerMorphBackdrop');
    const navigation = document.querySelector('.nav-container');
    const title = document.querySelector('header');
    const toolbar = document.querySelector('.versions-toolbar');
    const contextTitle = document.getElementById('tableContextTitle');
    const hero = document.getElementById('heroTitle');
    const heroOrigin = document.getElementById('heroTitleOrigin');
    if (!table || !heading || !shell || !sentinel || !scroller || !headingScroller || !backdrop || !navigation || !title || !toolbar || !contextTitle || !hero || !heroOrigin) return;

    const cells = Array.from(table.tHead.rows[0].cells);
    const columns = Array.from(heading.querySelectorAll('col'));
    let pendingFrame = null;
    let pendingMorphFrame = null;
    let visible = false;
    let navigationHeight = 64;
    let headingHeight = 0;
    let contextHeight = 0;
    let heroActive = false;
    let heroMetrics;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    heroOrigin.textContent = hero.textContent;

    function smooth(from, to, value) {
        const progress = Math.max(0, Math.min(1, (value - from) / (to - from)));
        return progress * progress * (3 - 2 * progress);
    }

    function setStyle(element, property, value) {
        if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
    }

    function fade(element, amount, shift, blur) {
        setStyle(element, '--intro-opacity', String(1 - amount));
        setStyle(element, '--intro-shift', `${-shift * amount}px`);
        setStyle(element, '--intro-blur', `${blur * amount}px`);
        setStyle(element, 'will-change', amount > 0 && amount < 1 ? 'opacity, transform' : 'auto');
    }

    function activateHero(active) {
        if (heroActive === active) return;
        if (active) {
            const rect = hero.getBoundingClientRect();
            setStyle(hero, 'width', `${rect.width}px`);
            setStyle(hero, 'transform', `translate3d(${rect.left}px, ${rect.top}px, 0)`);
            heroOrigin.hidden = false;
            hero.classList.add('morphing-title');
        } else {
            hero.classList.remove('morphing-title');
            ['width', 'font-size', 'transform', 'will-change'].forEach(property => hero.style.removeProperty(property));
            heroOrigin.hidden = true;
        }
        heroActive = active;
    }

    function updateHero(blend, reduced) {
        if (!heroActive || !heroMetrics) return;
        const scale = 1 + (heroMetrics.targetScale - 1) * blend;
        const targetLeft = (document.documentElement.clientWidth - heroMetrics.width * heroMetrics.targetScale) / 2;
        const targetTop = (contextHeight - heroMetrics.height * heroMetrics.targetScale) / 2;
        const left = heroMetrics.left + (targetLeft - heroMetrics.left) * blend;
        const top = reduced && !blend ? heroMetrics.top - window.scrollY : heroMetrics.top + (targetTop - heroMetrics.top) * blend;
        // Render the final font size directly to keep settled text sharp
        const settled = blend === 1;
        setStyle(hero, 'font-size', `${settled ? heroMetrics.targetFont : heroMetrics.font}px`);
        setStyle(hero, 'width', `${heroMetrics.width * (settled ? heroMetrics.targetScale : 1)}px`);
        setStyle(hero, 'transform', `translate3d(${left}px, ${top}px, 0) scale(${settled ? 1 : scale})`);
        setStyle(hero, 'will-change', blend > 0 && blend < 1 ? 'transform' : 'auto');
    }

    function updateMorph() {
        pendingMorphFrame = null;
        backdrop.hidden = !visible;
        const distance = Math.max(1, sentinel.getBoundingClientRect().top + window.scrollY - contextHeight);
        const progress = visible ? Math.max(0, Math.min(1, window.scrollY / distance)) : 0;
        const reduced = motion.matches;
        const blend = reduced ? Number(progress >= 1) : smooth(0, 1, progress);
        const navigationFade = reduced ? 0 : smooth(0, 0.24, progress);
        const toolbarFade = reduced ? 0 : smooth(0.1, 0.65, progress);
        fade(navigation, navigationFade, 0, 0);
        updateHero(blend, reduced);
        fade(toolbar, toolbarFade, 8, 0.8);
        navigation.inert = navigationFade > 0.98;
        toolbar.inert = toolbarFade > 0.98;

        const barHeight = navigationHeight + (headingHeight - navigationHeight) * blend;
        setStyle(backdrop, '--morph-bar-height', `${barHeight}px`);
        const remainingIntro = Math.max(0, distance + headingHeight - window.scrollY - barHeight);
        setStyle(backdrop, '--morph-scrim-height', `${reduced ? 0 : remainingIntro * smooth(0, 0.45, progress)}px`);
        shell.classList.toggle('is-pinned', visible && progress >= 1);
    }

    function scheduleMorph() {
        if (pendingMorphFrame === null) pendingMorphFrame = requestAnimationFrame(updateMorph);
    }

    function syncScroll(source, target) {
        if (source.scrollLeft !== target.scrollLeft) target.scrollLeft = source.scrollLeft;
    }

    function updateColumns() {
        pendingFrame = null;
        const width = table.getBoundingClientRect().width;
        visible = width > 0;
        activateHero(visible);
        if (width) {
            heading.style.width = `${width}px`;
            cells.forEach((cell, index) => {
                columns[index].style.width = `${cell.getBoundingClientRect().width}px`;
            });
            syncScroll(scroller, headingScroller);
        } else {
            shell.classList.remove('is-pinned');
        }
        if (visible) {
            const origin = heroOrigin.getBoundingClientRect();
            const font = parseFloat(getComputedStyle(heroOrigin).fontSize);
            const targetFont = parseFloat(getComputedStyle(contextTitle).fontSize);
            const targetScale = Math.min(1, targetFont / font);
            contextHeight = Math.ceil(origin.height * targetScale + 12);
            heroMetrics = { left: origin.left, top: origin.top + window.scrollY, width: origin.width, height: origin.height, font, targetFont, targetScale };
            document.documentElement.style.setProperty('--table-context-height', `${contextHeight}px`);
        } else {
            contextHeight = 0;
        }
        headingHeight = shell.getBoundingClientRect().height + contextHeight;
        navigationHeight = navigation.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--table-heading-height', `${headingHeight}px`);
        scheduleMorph();
    }

    function scheduleUpdate() {
        if (pendingFrame === null) pendingFrame = requestAnimationFrame(updateColumns);
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    [table, heading, navigation, title, toolbar, contextTitle, heroOrigin, ...cells].forEach(element => resizeObserver.observe(element));
    scroller.addEventListener('scroll', () => syncScroll(scroller, headingScroller), { passive: true });
    headingScroller.addEventListener('scroll', () => syncScroll(headingScroller, scroller), { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleMorph, { passive: true });
    motion.addEventListener('change', scheduleMorph);
    scheduleUpdate();
}
