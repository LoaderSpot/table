const SNOW_MONTHS = new Set([11, 0, 1]);
const PARTICLE_COUNT = 60;
const MAX_DEVICE_PIXEL_RATIO = 2;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

let activeScene = null;

function onReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
        return;
    }

    callback();
}

function isSnowSeason(date = new Date()) {
    return SNOW_MONTHS.has(date.getMonth());
}

function getReducedMotionQuery() {
    return typeof window.matchMedia === 'function'
        ? window.matchMedia(REDUCED_MOTION_QUERY)
        : null;
}

class SnowParticle {
    constructor(width, height) {
        this.reset(width, height);
        this.y = Math.random() * height;
    }

    reset(width, height) {
        this.x = Math.random() * width;
        this.y = -10;
        this.vx = Math.random() - 0.5;
        this.vy = Math.random() + 0.5;
        this.size = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.5 + 0.2;
    }

    update(width, height) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.y > height) {
            this.reset(width, height);
        }

        if (this.x > width) {
            this.x = 0;
        } else if (this.x < 0) {
            this.x = width;
        }
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function createSnowScene(navContainer) {
    if (!navContainer || navContainer.querySelector('.snow-canvas')) return null;

    const canvas = document.createElement('canvas');
    canvas.className = 'snow-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    navContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        canvas.remove();
        return null;
    }

    let width = 1;
    let height = 1;
    let animationFrameId = 0;
    const particles = [];

    function resize() {
        const rect = navContainer.getBoundingClientRect();
        width = Math.max(1, Math.round(rect.width));
        height = Math.max(1, Math.round(rect.height));

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(particle => {
            particle.update(width, height);
            particle.draw(ctx);
        });

        animationFrameId = window.requestAnimationFrame(animate);
    }

    function ensureParticles() {
        while (particles.length < PARTICLE_COUNT) {
            particles.push(new SnowParticle(width, height));
        }
    }

    const resizeObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver(resize)
        : null;

    function start() {
        resize();
        ensureParticles();

        if (resizeObserver) {
            resizeObserver.observe(navContainer);
        } else {
            window.addEventListener('resize', resize);
        }

        if (!animationFrameId) {
            animationFrameId = window.requestAnimationFrame(animate);
        }
    }

    function destroy() {
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
            animationFrameId = 0;
        }

        if (resizeObserver) {
            resizeObserver.disconnect();
        } else {
            window.removeEventListener('resize', resize);
        }

        canvas.remove();
    }

    return { start, destroy };
}

export function initSeasonalSnow() {
    const reducedMotionQuery = getReducedMotionQuery();

    function syncSnowState() {
        const shouldRun = isSnowSeason() && !reducedMotionQuery?.matches;

        if (!shouldRun) {
            activeScene?.destroy();
            activeScene = null;
            return;
        }

        if (!activeScene) {
            activeScene = createSnowScene(document.querySelector('.nav-container'));
            activeScene?.start();
        }
    }

    if (typeof reducedMotionQuery?.addEventListener === 'function') {
        reducedMotionQuery.addEventListener('change', syncSnowState);
    }

    syncSnowState();
}

onReady(initSeasonalSnow);
