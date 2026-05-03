/**
 * CYY Portfolio - Main JavaScript
 * 模块化组织，提高可维护性
 */

// ============================================
// 1. 粒子效果初始化
// ============================================
function initParticles() {
    particlesJS("particles-js", {
        "particles": {
            "number": {
                "value": 60,
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#d4a017"
            },
            "shape": {
                "type": "circle"
            },
            "opacity": {
                "value": 0.3,
                "random": true,
                "anim": {
                    "enable": true,
                    "speed": 1,
                    "opacity_min": 0.08
                }
            },
            "size": {
                "value": 2,
                "random": true
            },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#e6b82e",
                "opacity": 0.2,
                "width": 1
            },
            "move": {
                "enable": true,
                "speed": 1,
                "direction": "none",
                "random": true,
                "out_mode": "out"
            }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {
                    "enable": true,
                    "mode": "grab"
                },
                "onclick": {
                    "enable": true,
                    "mode": "push"
                },
                "resize": true
            },
            "modes": {
                "grab": {
                    "distance": 150,
                    "line_linked": {
                        "opacity": 0.4
                    }
                },
                "push": {
                    "particles_nb": 3
                }
            }
        },
        "retina_detect": true
    });
}

// ============================================
// 2. 动画和滚动效果
// ============================================
function initAnimations() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.add('is-loaded');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        // 内容区域渐入动画
        const sections = document.querySelectorAll('.content-section');
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    sectionObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        sections.forEach(s => sectionObserver.observe(s));

        // 时间轴项目动画
        const timelineItems = document.querySelectorAll('.timeline-item');
        const timelineObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const items = Array.from(timelineItems);
                    setTimeout(() => entry.target.classList.add('is-visible'),
                             items.indexOf(entry.target) * 150);
                    timelineObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -30px 0px'
        });

        timelineItems.forEach(item => timelineObserver.observe(item));
    } else {
        // 如果用户偏好减少动画，直接显示所有元素
        document.querySelectorAll('.content-section, .timeline-item')
            .forEach(el => el.classList.add('is-visible'));
    }
}

// ============================================
// 3. 进度指示器和导航
// ============================================
function initScrollSpy() {
    const progressBar = document.getElementById('progressBar');
    const navDots = document.querySelectorAll('.progress-nav-dot');
    const sections = ['about', 'experience', 'projects', 'skills', 'contact'];

    // 更新进度条高度
    function updateProgress() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

        if (progressBar) {
            progressBar.style.height = Math.max(20, progress) + '%';
        }
    }

    // 导航点高亮
    const spyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navDots.forEach(dot => {
                    dot.classList.toggle('active',
                        dot.getAttribute('data-section') === id);
                });
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-80px 0px -60% 0px'
    });

    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) spyObserver.observe(section);
    });

    // 点击导航点滚动
    navDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const sectionId = dot.getAttribute('data-section');
            const target = document.getElementById(sectionId);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    if (progressBar) {
        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
    }
}

// ============================================
// 4. 时间轴进度条
// ============================================
function initTimelineProgress() {
    const tlProgressBar = document.getElementById('timelineProgress');
    const timelineWrapper = document.querySelector('.timeline-wrapper');

    if (tlProgressBar && timelineWrapper) {
        function updateTimelineProgress() {
            const rect = timelineWrapper.getBoundingClientRect();
            const timelineHeight = timelineWrapper.offsetHeight;
            const windowHeight = window.innerHeight;
            let progress = 0;

            if (rect.top < windowHeight && rect.bottom > 0) {
                const scrolled = windowHeight - rect.top;
                progress = Math.min(Math.max(scrolled / (timelineHeight + windowHeight * 0.5) * 100, 0), 100);
            }

            tlProgressBar.style.height = progress + '%';
        }

        window.addEventListener('scroll', updateTimelineProgress, { passive: true });
        updateTimelineProgress();
    }
}

// ============================================
// 5. 主题切换功能
// ============================================
function initThemeSwitcher() {
    const root = document.documentElement;
    const toggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    function updateIcon(theme) {
        themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    function toggleTheme() {
        document.body.classList.add('theme-transitioning');
        const isLight = root.classList.toggle('light-theme');
        const theme = isLight ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
        updateIcon(theme);
        setTimeout(() => document.body.classList.remove('theme-transitioning'), 350);
    }

    function initTheme() {
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || (!saved && window.matchMedia('(prefers-color-scheme: light)').matches)) {
            root.classList.add('light-theme');
            updateIcon('light');
        }
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
    }

    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                root.classList.add('light-theme');
                updateIcon('light');
            } else {
                root.classList.remove('light-theme');
                updateIcon('dark');
            }
        }
    });

    initTheme();
}

// ============================================
// 6. 鼠标跟随效果
// ============================================
function initMouseFollow() {
    const root = document.documentElement;
    const EASING = 0.08;
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let tx = cx;
    let ty = cy;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.addEventListener('mousemove', (e) => {
        tx = e.clientX;
        ty = e.clientY;
    });

    function animate() {
        cx += (tx - cx) * EASING;
        cy += (ty - cy) * EASING;
        root.style.setProperty('--mouse-x', cx + 'px');
        root.style.setProperty('--mouse-y', cy + 'px');
        requestAnimationFrame(animate);
    }

    animate();
}

// ============================================
// 7. 微信二维码弹窗
// ============================================
function initWechatModal() {
    const trigger = document.getElementById('wechatContact');
    const modal = document.getElementById('wechatModal');
    const closeBtn = document.getElementById('modalClose');

    if (!trigger || !modal) return;

    function openModal() {
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
        trigger.focus();
    }

    trigger.addEventListener('click', openModal);
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal();
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });
}

// ============================================
// 主初始化函数
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 CYY Portfolio Initializing...');

    // 按顺序初始化各模块
    initParticles();
    initAnimations();
    initScrollSpy();
    initTimelineProgress();
    initThemeSwitcher();
    initMouseFollow();
    initWechatModal();

    console.log('✅ Portfolio initialized successfully');
});