document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const month = now.getMonth(); // 0 = Jan, 11 = Dec

    // show from december 1st to march 1st
    if (month === 11 || month === 0 || month === 1) {
        initSnow();
    }
});

function initSnow() {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';

    navContainer.appendChild(canvas);

    const navbar = navContainer.querySelector('.navbar');
    if (navbar) {
        navbar.style.position = 'relative';
        navbar.style.zIndex = '1';
    }

    const ctx = canvas.getContext('2d');
    let width = navContainer.offsetWidth;
    let height = navContainer.offsetHeight;

    canvas.width = width;
    canvas.height = height;

    const particles = [];
    const particleCount = 60; // number of snowflakes

    class Particle {
        constructor() {
            this.reset();
            this.y = Math.random() * height;
        }

        reset() {
            this.x = Math.random() * width;
            this.y = -10;
            this.vx = Math.random() * 1 - 0.5;
            this.vy = Math.random() * 1 + 0.5;
            this.size = Math.random() * 2 + 1;
            this.opacity = Math.random() * 0.5 + 0.2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.y > height) {
                this.reset();
            }
            if (this.x > width) {
                this.x = 0;
            } else if (this.x < 0) {
                this.x = width;
            }
        }

        draw() {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
        width = navContainer.offsetWidth;
        height = navContainer.offsetHeight;
        canvas.width = width;
        canvas.height = height;
    });
}
