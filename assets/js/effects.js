/* ==========================================================
   716QX NEXUS OS 4.0 — Visual Effects Layer
   ========================================================== */
(function () {
    'use strict';

    const canvas = document.getElementById('grid-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, cols, rows;
    const CELL = 60;
    let mouse = { x: -9999, y: -9999 };
    let particles = [];
    const PARTICLE_COUNT = 30;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        cols = Math.ceil(W / CELL);
        rows = Math.ceil(H / CELL);
        initParticles();
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 0.8,
                c: ['#00F0FF', '#B14EFF', '#FF2EA6'][Math.floor(Math.random() * 3)],
                life: Math.random() * 100 + 50
            });
        }
    }

    function drawGrid() {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= cols; x++) {
            ctx.moveTo(x * CELL, 0);
            ctx.lineTo(x * CELL, H);
        }
        for (let y = 0; y <= rows; y++) {
            ctx.moveTo(0, y * CELL);
            ctx.lineTo(W, y * CELL);
        }
        ctx.stroke();

        // نقاط intersections قريبة من الماوس
        for (let x = 0; x <= cols; x++) {
            for (let y = 0; y <= rows; y++) {
                const px = x * CELL;
                const py = y * CELL;
                const d = Math.hypot(px - mouse.x, py - mouse.y);
                if (d < 180) {
                    const alpha = (1 - d / 180) * 0.9;
                    ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(px, py, 2 + (1 - d / 180) * 3, 0, Math.PI * 2);
                    ctx.fill();

                    // خطوط نحو الماوس
                    if (d < 100) {
                        ctx.strokeStyle = `rgba(177, 78, 255, ${alpha * 0.5})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    function drawParticles() {
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.3;

            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;

            // تفاعل الماوس
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 130 && dist > 0.1) {
                const force = (130 - dist) / 130;
                p.x += (dx / dist) * force * 1.8;
                p.y += (dy / dist) * force * 1.8;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.c;
            ctx.shadowColor = p.c;
            ctx.shadowBlur = 15;
            ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        });
    }

    function loop() {
        ctx.clearRect(0, 0, W, H);
        drawGrid();
        drawParticles();
        requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
    window.addEventListener('touchmove', e => {
        if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
    }, { passive: true });
    window.addEventListener('touchend', () => { mouse.x = -9999; mouse.y = -9999; });

    // HUD Clock
    function tickHUD() {
        const hudClock = document.getElementById('hud-clock');
        if (hudClock) {
            const now = new Date();
            hudClock.textContent = now.toLocaleTimeString('en-GB');
        }
    }
    setInterval(tickHUD, 1000);
    tickHUD();

    // Feed text cycling
    const feedMessages = [
        'CORE.MODULES.READY',
        'CONNECTION.STABLE',
        'SESSIONS.MONITORED',
        'DATA.SYNCED',
        'NEXUS.ONLINE'
    ];
    let feedIdx = 0;
    setInterval(() => {
        const feed = document.getElementById('feed-text');
        if (feed) {
            feedIdx = (feedIdx + 1) % feedMessages.length;
            feed.textContent = feedMessages[feedIdx];
        }
    }, 3000);

    // Core load simulation
    setInterval(() => {
        const loadEl = document.getElementById('core-load');
        const fill = document.getElementById('load-bar-fill');
        if (loadEl && fill) {
            const v = Math.floor(Math.random() * 30) + 8;
            loadEl.textContent = v + '%';
            fill.style.width = v + '%';
        }
    }, 2500);

    resize();
    loop();
})();
