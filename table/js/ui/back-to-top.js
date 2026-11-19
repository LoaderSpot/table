export function initBackToTop() {
    const title = document.getElementById('heroTitle');
    const button = document.querySelector('.back-to-top');
    const tableStart = document.getElementById('tableHeadingStart');
    const markdown = document.getElementById('markdownContainer');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function updateVisibility() {
        const boundary = tableStart.getClientRects()[0] ?? markdown.querySelector('h1')?.getClientRects()[0];
        button.toggleAttribute('inert', !boundary || boundary.bottom >= 0);
    }

    const layout = new ResizeObserver(updateVisibility);
    layout.observe(document.querySelector('header'));
    layout.observe(document.querySelector('.versions-toolbar'));
    layout.observe(markdown);
    window.addEventListener('scroll', updateVisibility, { passive: true });
    markdown.addEventListener('animationend', event => {
        if (event.target.tagName === 'H1') updateVisibility();
    });

    button.addEventListener('click', () => {
        if (button.classList.contains('is-returning')) return;
        button.classList.add('is-returning');

        const startY = window.scrollY;
        const duration = 140 + 80 * Math.min(1, startY / window.innerHeight);
        const startedAt = performance.now();
        const controller = new AbortController();

        function stop() {
            controller.abort();
            button.classList.remove('is-returning');
        }

        for (const event of ['wheel', 'pointerdown', 'keydown']) {
            window.addEventListener(event, stop, { passive: true, signal: controller.signal });
        }

        function scrollFrame() {
            if (controller.signal.aborted) return;
            const progress = reducedMotion.matches ? 1 : Math.min(1, (performance.now() - startedAt) / duration);
            const easedProgress = progress * progress * (3 - 2 * progress);
            window.scrollTo({ top: startY * (1 - easedProgress), behavior: 'instant' });

            if (progress < 1) {
                requestAnimationFrame(scrollFrame);
            } else {
                stop();
                title.focus({ preventScroll: true });
            }
        }

        scrollFrame();
    });
}
