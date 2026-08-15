/**
 * CYY Portfolio - Main JavaScript (v2)
 * 模块化组织: 主题切换 / 滚动进度与导航高亮 / 移动端菜单 / 博客卡片 / 微信弹窗
 */

// ============================================
// 1. 主题切换
// ============================================
function initThemeSwitcher() {
    const root = document.documentElement;
    const toggleBtn = document.getElementById('theme-toggle');

    function updateIcon(theme) {
        // 亮色显示月亮, 暗色显示太阳
        root.classList.toggle('icon-light', theme === 'light');
    }

    function toggleTheme() {
        const isLight = root.classList.toggle('light-theme');
        const theme = isLight ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
        updateIcon(theme);
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
// 1.5 强调色切换 (金 / 青蓝 / 翡翠绿)
// ============================================
function initAccentSwitcher() {
    const root = document.documentElement;
    const ACCENTS = ['gold', 'cyan', 'green'];
    const buttons = document.querySelectorAll('[data-accent-btn]');
    const wrap = document.querySelector('.accent-wrap');
    const toggle = document.getElementById('accentToggle');

    function apply(accent) {
        if (accent && accent !== 'gold') {
            root.setAttribute('data-accent', accent);
        } else {
            root.removeAttribute('data-accent');
        }
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.accentBtn === accent);
        });
    }

    function setOpen(open) {
        if (!wrap) return;
        wrap.classList.toggle('is-open', open);
        if (toggle) toggle.setAttribute('aria-expanded', String(open));
    }

    // 页面加载时恢复记忆的选择
    const saved = localStorage.getItem('accent') || 'gold';
    apply(saved);

    // 调色盘展开/收起
    if (toggle && wrap) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            setOpen(!wrap.classList.contains('is-open'));
        });
        document.addEventListener('click', (e) => {
            if (wrap.classList.contains('is-open') && !wrap.contains(e.target)) {
                setOpen(false);
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && wrap.classList.contains('is-open')) {
                setOpen(false);
            }
        });
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const accent = btn.dataset.accentBtn;
            localStorage.setItem('accent', accent);
            apply(accent);
            setOpen(false);
        });
    });
}

// ============================================
// 2. 顶部滚动进度条 + 导航滚动高亮
// ============================================
function initScrollSpy() {
    const progressBar = document.getElementById('progressBar');
    const sections = ['latest', 'intro', 'experience', 'projects', 'skills', 'highlights', 'contact'];

    // 页面滚动进度
    function updateProgress() {
        if (!progressBar) return;
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = progress + '%';
    }

    // 当前区块高亮(仅锚点链接: 主导航为页面链接, 本页目录为锚点)
    const spyTargets = document.querySelectorAll('.nav-links .nav-link, .section-nav a');
    const spyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                spyTargets.forEach(link => {
                    const href = link.getAttribute('href');
                    if (!href || href.charAt(0) !== '#') return;
                    link.classList.toggle('active', href === '#' + id);
                });
            }
        });
    }, {
        threshold: 0.25,
        rootMargin: '-40% 0px -55% 0px'
    });

    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) spyObserver.observe(section);
    });

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
}

// ============================================
// 3. 加载入场动画
// ============================================
function initSplash() {
    const splash = document.getElementById('siteSplash');
    if (!splash) {
        document.body.classList.add('is-loaded');
        return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
        splash.style.display = 'none';
        document.body.classList.add('is-loaded');
        return;
    }
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            splash.classList.add('is-animating');
            setTimeout(() => {
                splash.classList.add('is-done');
                document.body.classList.add('is-loaded');
                document.body.style.overflow = '';
            }, 850);
        });
    });
}

// ============================================
// 3.5 全屏氛围光(鼠标跟随, 无界)
// ============================================
function initNavScroll() {
    const nav = document.getElementById('siteNav');
    if (!nav) return;
    let ticking = false;
    const update = () => {
        nav.classList.toggle('is-scrolled', window.scrollY > 24);
        ticking = false;
    };
    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }, { passive: true });
    update();
}

// ============================================
// 3.5 全屏氛围光(鼠标跟随, 无界)
// ============================================
function initHeroGlow() {
    const glow = document.getElementById('pageGlow');
    if (!glow) return;
    if (window.matchMedia('(pointer: coarse)').matches) return; // 触屏不跟随

    let tx = 0.5, ty = 0.5, cx = 0.5, cy = 0.5, raf = null;

    const tick = () => {
        cx += (tx - cx) * 0.06;
        cy += (ty - cy) * 0.06;
        glow.style.transform = 'translate(calc(-50% + ' + ((cx - 0.5) * 36) + 'vw), calc(-50% + ' + ((cy - 0.5) * 36) + 'vh))';
        raf = null;
    };

    document.addEventListener('mousemove', (e) => {
        tx = e.clientX / window.innerWidth;
        ty = e.clientY / window.innerHeight;
        if (!raf) raf = requestAnimationFrame(tick);
    });
}

// ============================================
// 3.6 数字滚动动画
// ============================================
function initCountUp() {
    const els = document.querySelectorAll('[data-count]');
    if (!els.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        els.forEach(el => { el.textContent = el.dataset.count; });
        return;
    }

    const animate = (el) => {
        const target = parseInt(el.dataset.count, 10) || 0;
        const dur = 1200;
        const start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased);
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
        });
    }, { threshold: 0.5 });

    els.forEach(el => io.observe(el));
}

// ============================================
// 4. 移动端汉堡菜单
// ============================================
function initNavBurger() {
    const burger = document.getElementById('navBurger');
    const nav = document.getElementById('siteNav');
    if (!burger || !nav) return;

    burger.addEventListener('click', () => {
        const open = nav.classList.toggle('nav-open');
        burger.setAttribute('aria-expanded', String(open));
    });

    // 点击链接后自动收起菜单
    nav.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('nav-open');
            burger.setAttribute('aria-expanded', 'false');
        });
    });

    // 点击导航外区域收起
    document.addEventListener('click', (e) => {
        if (nav.classList.contains('nav-open') && !nav.contains(e.target)) {
            nav.classList.remove('nav-open');
            burger.setAttribute('aria-expanded', 'false');
        }
    });
}

// ============================================
// 4. 内容区渐入动画
// ============================================
function initAnimations() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sections = document.querySelectorAll('.content-section');

    if (prefersReducedMotion) {
        sections.forEach(s => s.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
    });

    sections.forEach(s => observer.observe(s));
}

// ============================================
// 4.1 卡片 spotlight hover(鼠标跟随光晕)
// ============================================
function initCardSpotlight() {
    const cards = document.querySelectorAll('.blog-card, .project-card, .timeline-card, .highlight-item, .post-item, .related-item');
    if (!cards.length) return;
    if (window.matchMedia('(pointer: coarse)').matches) return; // 触屏不做
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--spot-x', (e.clientX - rect.left) + 'px');
            card.style.setProperty('--spot-y', (e.clientY - rect.top) + 'px');
        });
    });
}

// ============================================
// 5. 首页博客卡片(fetch blog/index.json)
// ============================================
function initBlogPreview() {
    const container = document.getElementById('latestPosts');
    if (!container) return;

    fetch('blog/index.json')
        .then(res => {
            if (!res.ok) throw new Error('blog index not found');
            return res.json();
        })
        .then(data => {
            const all = data.posts || [];
            // 精选(护城河)文章优先, 按日期倒序; 不足 3 篇时用最新文章补齐
            const featured = all.filter(p => p.featured).slice(0, 3);
            const backup = all.filter(p => !p.featured);
            const posts = featured.length >= 3 ? featured : featured.concat(backup).slice(0, 3);
            if (!posts.length) throw new Error('no posts');
            // 渐变封面: 按顺序取一组预置渐变
            const COVERS = [
                'linear-gradient(135deg, oklch(28% 0.06 250) 0%, oklch(40% 0.12 235) 100%)',
                'linear-gradient(135deg, oklch(28% 0.05 165) 0%, oklch(40% 0.13 165) 100%)',
                'linear-gradient(135deg, oklch(30% 0.05 45) 0%, oklch(42% 0.11 85) 100%)'
            ];
            container.innerHTML = posts.map((post, i) => {
                const cover = COVERS[i % COVERS.length];
                const tag = (post.tags || [])[0] || 'TECH';
                return `
                <article class="blog-card">
                    <a class="blog-cover" href="${post.url}" aria-hidden="true" tabindex="-1" style="background:${cover}">
                        <span class="blog-cover-tag">${escapeHtml(tag)}</span>
                    </a>
                    <div class="blog-card-body">
                        <div class="blog-meta">
                            <time class="blog-date" datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time>
                            <span class="blog-tags">${(post.tags || []).slice(0, 3).map(t => `<a class="blog-tag" href="/blog/tags/#tag-${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('')}</span>
                        </div>
                        <h3 class="blog-title"><a href="${post.url}">${escapeHtml(post.title)}</a></h3>
                        ${post.summary ? `<p class="blog-summary">${escapeHtml(post.summary)}</p>` : ''}
                    </div>
                </article>`;
            }).join('');
        })
        .catch(() => {
            container.innerHTML = '<p class="blog-loading">博客内容加载失败，<a href="/blog/" style="color:var(--accent)">点此直接访问 →</a></p>';
        });

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
}

// ============================================
// 6. 微信二维码弹窗
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
// 7. 页脚年份
// ============================================
function initFooterYear() {
    const el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
}

// ============================================
// 主初始化
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initThemeSwitcher();
    initAccentSwitcher();
    initScrollSpy();
    initSplash();
    initNavScroll();
    initHeroGlow();
    initCountUp();
    initNavBurger();
    initAnimations();
    initCardSpotlight();
    initBlogPreview();
    initWechatModal();
    initFooterYear();
});
