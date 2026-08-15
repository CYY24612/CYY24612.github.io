/**
 * CYY Portfolio - Blog 静态生成器
 * 读取 blog/posts/*.md(frontmatter + Markdown),生成:
 *   - blog/<slug>/index.html  文章页
 *   - blog/index.html         文章列表页
 *   - blog/index.json         文章元数据(首页"最新文章"fetch 用)
 *   - blog/rss.xml            RSS 订阅
 *   - blog/blog.css           博客样式(hljs 主题 + 自定义样式)
 *
 * 用法: npm run build:blog
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const markdownit = require('markdown-it');
const hljs = require('highlight.js');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'blog', 'posts');
const OUT_DIR = path.join(ROOT, 'blog');
const SITE_URL = 'https://cyy24612.github.io';
const BLOG_TITLE = "CYY's Blog";
const BLOG_DESC = '嵌入式软件工程师的技术笔记:总线协议、调试方法论与工程架构思考';

/* ---------- Markdown 渲染 ---------- */
const md = markdownit({
    html: false,
    linkify: true,
    typographer: false,
    highlight(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
            } catch (e) { /* fallthrough */ }
        }
        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    }
});

/* ---------- frontmatter 解析 ---------- */
function parseList(value) {
    return value.replace(/^\[|\]$/g, '').split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
}

function parseFrontmatter(raw) {
    const fm = { title: '', date: '', tags: [], summary: '', featured: false, related: [] };
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { fm, body: raw };
    const [, header, body] = m;
    header.split(/\r?\n/).forEach(line => {
        const kv = line.match(/^([\w-]+):\s*(.*)$/);
        if (!kv) return;
        const [, key, value] = kv;
        if (key === 'tags' || key === 'related') {
            fm[key] = parseList(value);
        } else if (key === 'featured') {
            fm.featured = value.trim() === 'true';
        } else {
            fm[key] = value.trim();
        }
    });
    return { fm, body: body.trim() };
}

/* ---------- 读取文章 ---------- */
const posts = fs.existsSync(POSTS_DIR)
    ? fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).map(f => {
          const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
          const { fm, body } = parseFrontmatter(raw);
          return {
              slug: f.replace(/\.md$/, ''),
              title: fm.title || f.replace(/\.md$/, ''),
              date: fm.date || '',
              tags: fm.tags || [],
              summary: fm.summary || '',
              featured: !!fm.featured,
              related: fm.related || [],
              project: fm.project || '',
              body
          };
      }).sort((a, b) => b.date.localeCompare(a.date))
    : [];

/* ---------- 页面骨架 ---------- */
function head(cssHref, title, canonicalPath = '/blog/') {
    const pageTitle = title || `${BLOG_TITLE} · ${BLOG_DESC}`;
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <meta name="description" content="${BLOG_DESC}">
    <meta name="theme-color" content="#0e1117">
    <link rel="canonical" href="${SITE_URL}${canonicalPath}">
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/main.min.css">
    <link rel="stylesheet" href="${cssHref}">
    <script src="/assets/js/main.min.js" defer></script>
</head>
<body>
<a href="#main-content" class="skip-link">跳转到主内容</a>

<!-- 全屏科技网格(无界) -->
<div class="page-grid" aria-hidden="true"></div>

<!-- 右上角静态光斑 -->
<div class="page-orb" aria-hidden="true"></div>

<!-- 顶部滚动进度条 -->
<div class="scroll-progress" aria-hidden="true"><div class="scroll-progress-bar" id="progressBar"></div></div>

<!-- 顶部导航 -->
<header class="site-nav" id="siteNav">
    <a class="brand" href="/">CYY<span class="brand-dot">.</span></a>
    <nav class="nav-links" id="navLinks" aria-label="页面导航">
        <a class="nav-link active" href="/blog/">博客</a>
        <a class="nav-link" href="/about/">关于我</a>
        <a class="nav-link" href="/">主页</a>
    </nav>
    <div class="nav-actions">
        <a class="nav-icon" href="https://github.com/CYY24612" aria-label="GitHub" target="_blank" rel="noopener noreferrer">
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
        </a>
        <div class="accent-wrap">
            <button class="accent-toggle" id="accentToggle" aria-label="切换强调色" aria-expanded="false" aria-controls="accentMenu">
                <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 22a10 10 0 1 1 10-10c0 1.66-1.34 3-3 3h-2.5a2.5 2.5 0 0 0-2.5 2.5c0 .83-.67 1.5-1.5 1.5H12z"/><circle cx="7.5" cy="10.5" r="1.5"/><circle cx="12" cy="7.5" r="1.5"/><circle cx="16.5" cy="10.5" r="1.5"/></svg>
            </button>
            <div class="accent-menu" id="accentMenu" role="group" aria-label="切换强调色">
                <button class="accent-dot accent-gold active" data-accent-btn="gold" aria-label="金色" title="金色"></button>
                <button class="accent-dot accent-cyan" data-accent-btn="cyan" aria-label="青蓝" title="青蓝"></button>
                <button class="accent-dot accent-green" data-accent-btn="green" aria-label="翡翠绿" title="翡翠绿"></button>
            </div>
        </div>
        <button class="theme-toggle" id="theme-toggle" aria-label="切换亮暗主题">
            <svg class="icon-svg icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg class="icon-svg icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <button class="nav-burger" id="navBurger" aria-label="展开菜单" aria-expanded="false" aria-controls="navLinks">
            <svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
    </div>
</header>

<main class="container" id="main-content" role="main" aria-label="主要内容">`;
}

const footer = `
    </main>
    <footer class="site-footer">
        <p>© <span id="year">2026</span> CYY · 嵌入式软件工程师</p>
        <nav class="footer-nav" aria-label="页脚导航">
            <a href="/blog/">博客</a>
            <a href="/blog/tags/">标签</a>
            <a href="/about/">关于我</a>
            <a href="/">主页</a>
            <a href="/blog/rss.xml">RSS</a>
        </nav>
    </footer>
    <script async src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
    <script>
    window.addEventListener('load', function () {
        var show = function () {
            var v = document.getElementById('busuanzi_value_page_pv');
            var c = document.getElementById('busuanzi_container_page_pv');
            if (v && c && parseInt(v.textContent, 10) > 0) { c.style.display = ''; }
        };
        setTimeout(show, 1000);
        setTimeout(show, 3000);
    });
    </script>
</body>
</html>`;

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tagBadges(tags) {
    return tags.map(t => `<a class="tag" href="/blog/tags/#tag-${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('');
}

function formatDate(date) {
    return date || '';
}

/* ---------- 文章页 ---------- */
function renderPost(post, prev, next) {
    const html = md.render(post.body);
    const pageTitle = `${post.title} | ${BLOG_TITLE}`;    const pager = [];
    if (prev) pager.push(`<a class="pager-link pager-prev" href="/blog/${prev.slug}/">← ${escapeHtml(prev.title)}</a>`);
    if (next) pager.push(`<a class="pager-link pager-next" href="/blog/${next.slug}/">${escapeHtml(next.title)} →</a>`);

    // 相关阅读: 由 frontmatter related 指定的文章
    const relatedPosts = (post.related || [])
        .map(slug => posts.find(p => p.slug === slug))
        .filter(Boolean);
    const relatedBlock = relatedPosts.length ? `
        <section class="related">
            <h2 class="related-title">相关阅读</h2>
            <div class="related-list">
                ${relatedPosts.map(p => `
                <a class="related-item" href="/blog/${p.slug}/">
                    <span class="related-item-title">${escapeHtml(p.title)}</span>
                    <time class="related-item-date" datetime="${p.date}">${formatDate(p.date)}</time>
                </a>`).join('')}
            </div>
        </section>` : '';

    // 关联项目: 由 frontmatter project 指定, 链接到关于我页对应项目
    const projectBlock = post.project ? `
        <aside class="post-project">
            <span class="post-project-label">相关项目</span>
            <a class="post-project-link" href="/about/#projects">${escapeHtml(post.project)}</a>
        </aside>` : '';

    const body = `
        <article class="post">
            <header class="post-header">
                <h1 class="post-title">${escapeHtml(post.title)}</h1>
                <div class="post-meta">
                    <time datetime="${post.date}">${formatDate(post.date)}</time>
                    ${tagBadges(post.tags)}
                    <span id="busuanzi_container_page_pv" class="post-pv" style="display:none">阅读 <span id="busuanzi_value_page_pv"></span> 次</span>
                </div>
            </header>
            <div class="post-body">
${html}
            </div>
            ${projectBlock}
        </article>
        ${relatedBlock}
        <nav class="pager">${pager.join('')}</nav>`;

    return head('/blog/blog.css', pageTitle) + body + footer;
}

/* ---------- 标签统计与云 ---------- */
function buildTagMap() {
    const tagMap = {};
    posts.forEach(p => p.tags.forEach(t => {
        (tagMap[t] = tagMap[t] || []).push(p);
    }));
    return tagMap;
}

function tagCloud(tagMap, basePath) {
    const tagNames = Object.keys(tagMap).sort((a, b) => tagMap[b].length - tagMap[a].length);
    return tagNames.map(t => `
        <a class="tag tag-cloud-item" href="${basePath}#tag-${encodeURIComponent(t)}">${escapeHtml(t)} <span class="tag-count">${tagMap[t].length}</span></a>`).join('\n');
}

/* ---------- 列表页 ---------- */
function renderIndex() {
    const items = posts.map(p => `
        <article class="post-item">
            <div class="post-item-main">
                <h2 class="post-item-title"><a href="/blog/${p.slug}/">${p.featured ? '<span class="featured-badge">精选</span> ' : ''}${escapeHtml(p.title)}</a></h2>
                ${p.summary ? `<p class="post-item-summary">${escapeHtml(p.summary)}</p>` : ''}
            </div>
            <div class="post-item-side">
                <time datetime="${p.date}">${formatDate(p.date)}</time>
                ${tagBadges(p.tags)}
            </div>
        </article>`).join('\n');

    const body = `
        <div class="tag-cloud" aria-label="按标签浏览">
            ${tagCloud(buildTagMap(), '/blog/tags/')}
        </div>
        <section class="post-list">
            ${items || '<p class="empty">暂无文章,敬请期待。</p>'}
        </section>`;

    return head('/blog/blog.css') + body + footer;
}

/* ---------- 标签归档页 ---------- */
function renderTags() {
    const tagMap = buildTagMap();
    const tagNames = Object.keys(tagMap).sort((a, b) => tagMap[b].length - tagMap[a].length);

    const sections = tagNames.map(t => `
        <section class="tag-section" id="tag-${encodeURIComponent(t)}">
            <h2 class="tag-section-title">${escapeHtml(t)} <span class="tag-count">${tagMap[t].length} 篇</span></h2>
            <div class="post-list">
                ${tagMap[t].map(p => `
                <article class="post-item">
                    <div class="post-item-main">
                        <h3 class="post-item-title"><a href="/blog/${p.slug}/">${escapeHtml(p.title)}</a></h3>
                        ${p.summary ? `<p class="post-item-summary">${escapeHtml(p.summary)}</p>` : ''}
                    </div>
                    <div class="post-item-side">
                        <time datetime="${p.date}">${formatDate(p.date)}</time>
                        ${tagBadges(p.tags)}
                    </div>
                </article>`).join('\n')}
            </div>
        </section>`).join('\n');

    const body = `
        <div class="tag-cloud" aria-label="按标签浏览">
            ${tagCloud(tagMap, '')}
        </div>
        ${sections}`;

    return head('/blog/blog.css', `${BLOG_TITLE} · 标签归档`, '/blog/tags/') + body + footer;
}

/* ---------- RSS ---------- */
function renderRss() {
    const items = posts.map(p => `
    <entry>
        <title>${escapeHtml(p.title)}</title>
        <link href="${SITE_URL}/blog/${p.slug}/"/>
        <id>${SITE_URL}/blog/${p.slug}/</id>
        <updated>${p.date}T00:00:00Z</updated>
        <summary>${escapeHtml(p.summary)}</summary>
    </entry>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${BLOG_TITLE}</title>
  <subtitle>${BLOG_DESC}</subtitle>
  <link href="${SITE_URL}/blog/"/>
  <link rel="self" href="${SITE_URL}/blog/rss.xml"/>
  <updated>${posts.length ? posts[0].date + 'T00:00:00Z' : ''}</updated>
  <id>${SITE_URL}/blog/</id>
${items}
</feed>
`;
}

/* ---------- 样式(hljs 主题 + 自定义) ---------- */
// 把 css 中每个规则的选择器都加上 scope 前缀(处理逗号分隔),用于让亮色主题跟随 .light-theme
function scopeCss(css, scope) {
    return css.replace(/([^{}]+)\{/g, (match, selectors) => {
        const scoped = selectors.split(',').map(s => {
            const t = s.trim();
            if (!t) return s;
            return `${scope} ${t}`;
        }).join(', ');
        return `${scoped} {`;
    });
}

function renderCss() {
    // 深色主题为默认;浅色主题 scoped 到 .light-theme,跟随主站手动主题切换
    const darkTheme = fs.readFileSync(
        path.join(ROOT, 'node_modules', 'highlight.js', 'styles', 'github-dark.css'), 'utf8');
    const lightTheme = scopeCss(fs.readFileSync(
        path.join(ROOT, 'node_modules', 'highlight.js', 'styles', 'github.css'), 'utf8'), ':root.light-theme');
    const hljsTheme = `${darkTheme}\n${lightTheme}`;
    const custom = `
/* 代码块底色(跟随主站主题) */
:root { --code-bg: oklch(13% 0.015 250); }
:root.light-theme { --code-bg: oklch(94% 0.006 250); }

.container { max-width: 860px; margin: 0 auto; padding: 40px 24px 64px; }
a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-strong); text-decoration: underline; }

/* ---- 列表页 ---- */
.post-list { display: flex; flex-direction: column; gap: 12px; }
.post-item {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 22px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: color-mix(in oklab, var(--bg-card) 68%, transparent);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    backdrop-filter: blur(16px) saturate(150%);
    color: var(--text-1);
    transition: border-color var(--dur) var(--ease), transform var(--dur-slow) var(--ease);
}
.post-item:hover {
    border-color: var(--accent-border);
    transform: translateY(-2px);
    text-decoration: none;
    background: color-mix(in oklab, var(--bg-card) 80%, transparent);
}
.post-item-main { min-width: 0; }
.post-item-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; }
.featured-badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    font-weight: 500;
    color: var(--bg);
    background: var(--accent);
    border-radius: 5px;
    padding: 1px 6px;
    vertical-align: 2px;
    margin-right: 4px;
}
.post-item-title a { color: inherit; text-decoration: none; }
.post-item:hover .post-item-title a { color: var(--accent); }
.post-item-summary { color: var(--text-2); font-size: 0.9rem; margin-top: 4px; }
.post-item-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.post-item-side time { color: var(--text-3); font-size: 0.85rem; white-space: nowrap; font-family: var(--font-mono); }
.empty { color: var(--text-3); padding: 40px 0; text-align: center; }

/* ---- 标签 ---- */
.tag {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--accent-dim);
    border: 1px solid var(--accent-border);
    border-radius: 6px;
    padding: 1px 8px;
    line-height: 1.5;
}
a.tag:hover {
    color: var(--accent);
    background: var(--accent-bg);
    text-decoration: none;
}

/* ---- 标签归档页 ---- */
.tag-cloud { display: flex; flex-wrap: wrap; gap: 10px; padding: 8px 0; }
.tag-cloud-item { padding: 4px 12px; font-size: 0.8rem; border-radius: 999px; }
.tag-count { opacity: 0.7; }
.tag-section { padding: 40px 0 8px; }
.tag-section-title {
    font-family: var(--font-display);
    font-size: 1.35rem;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--accent);
    display: inline-block;
}
.tag-section .post-list { padding-top: 0; }

/* ---- 文章阅读量 ---- */
.post-pv { font-size: 0.8rem; }

/* ---- 文章页 ---- */
.post { padding: 24px 0; }
.post-header { padding-bottom: 24px; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
.post-title {
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    font-weight: 800;
    line-height: 1.3;
    margin-bottom: 12px;
}
.post-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: var(--text-3); font-size: 0.875rem; }
.post-meta time { font-family: var(--font-mono); font-size: 0.8rem; }

.post-body { max-width: 720px; font-size: 1rem; }
.post-body h1, .post-body h2, .post-body h3, .post-body h4 {
    font-family: var(--font-display);
    margin: 2em 0 0.8em;
    line-height: 1.35;
}
.post-body h2 { font-size: 1.45rem; padding-bottom: 8px; border-bottom: 2px solid var(--accent); display: inline-block; }
.post-body h3 { font-size: 1.2rem; }
.post-body p { margin: 1em 0; }
.post-body ul, .post-body ol { margin: 1em 0; padding-left: 1.6em; }
.post-body li { margin: 0.4em 0; }
.post-body blockquote {
    border-left: 3px solid var(--accent);
    background: var(--bg-card);
    margin: 1.2em 0;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    color: var(--text-2);
}
.post-body table { border-collapse: collapse; margin: 1.2em 0; width: 100%; font-size: 0.9rem; }
.post-body th, .post-body td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
.post-body th { background: var(--bg-card); font-weight: 600; }
.post-body code { font-family: var(--font-mono); font-size: 0.875em; }
.post-body :not(pre) > code {
    background: var(--code-bg);
    color: var(--accent);
    padding: 2px 6px;
    border-radius: 4px;
}
.post-body pre {
    background: var(--code-bg);
    border-radius: 8px;
    padding: 16px;
    margin: 1.2em 0;
    overflow-x: auto;
    border: 1px solid var(--border);
}
.post-body pre code { background: none; padding: 0; color: inherit; }
.post-body img { max-width: 100%; border-radius: 8px; }
.post-body hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }

/* hljs 微调:配合站点底色 */
.hljs { background: transparent; padding: 0; }

/* ---- 相关项目 ---- */
.post-project {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    margin-top: 32px; padding: 14px 18px;
    background: var(--accent-bg);
    border: 1px solid var(--accent-border);
    border-radius: 10px;
}
.post-project-label {
    font-family: var(--font-mono);
    font-size: 0.72rem; color: var(--accent);
    letter-spacing: 0.06em;
}
.post-project-link { font-size: 0.9rem; font-weight: 600; }
.post-project-link:hover { text-decoration: underline; }

/* ---- 相关阅读 ---- */
.related { margin-top: 40px; }
.related-title {
    font-family: var(--font-display);
    font-size: 1.05rem; font-weight: 700;
    margin-bottom: 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--accent);
    display: inline-block;
}
.related-list { display: flex; flex-direction: column; gap: 8px; }
.related-item {
    display: flex; justify-content: space-between; align-items: baseline; gap: 16px;
    padding: 12px 16px;
    background: color-mix(in oklab, var(--bg-card) 68%, transparent);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    backdrop-filter: blur(16px) saturate(150%);
    border: 1px solid var(--border);
    border-radius: 10px;
    transition: border-color var(--dur) var(--ease), transform var(--dur-slow) var(--ease);
}
.related-item:hover {
    border-color: var(--accent-border);
    transform: translateY(-2px);
    text-decoration: none;
    background: color-mix(in oklab, var(--bg-card) 80%, transparent);
}
.related-item-title { color: var(--text-1); font-size: 0.9rem; }
.related-item:hover .related-item-title { color: var(--accent); }
.related-item-date { color: var(--text-3); font-size: 0.8rem; font-family: var(--font-mono); white-space: nowrap; }

.pager {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    font-size: 0.9rem;
}

@media (max-width: 640px) {
    .container { padding: 24px 16px 48px; }
    .post-item { flex-direction: column; gap: 6px; }
    .post-item-side { flex-direction: row; align-items: center; }
    .tag-cloud { padding: 4px 0; }
}

/* 亮色主题下: 玻璃更实, 保证对比度 */
:root.light-theme .post-item,
:root.light-theme .related-item {
    background: color-mix(in oklab, var(--bg-card) 82%, transparent);
    box-shadow: 0 1px 2px oklch(50% 0.02 250 / 0.06), 0 4px 12px oklch(50% 0.02 250 / 0.05);
}`;
    return `${hljsTheme}\n${custom}`;
}

/* ---------- 主流程 ---------- */
function build() {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    // 文章页
    posts.forEach((post, i) => {
        const dir = path.join(OUT_DIR, post.slug);
        fs.mkdirSync(dir, { recursive: true });
        const prev = posts[i - 1] || null; // 日期更新的上一篇
        const next = posts[i + 1] || null;
        fs.writeFileSync(path.join(dir, 'index.html'), renderPost(post, prev, next));
    });

    // 列表页 / 标签页 / JSON / RSS
    fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderIndex());
    fs.mkdirSync(path.join(OUT_DIR, 'tags'), { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'tags', 'index.html'), renderTags());
    fs.writeFileSync(path.join(OUT_DIR, 'index.json'),
        JSON.stringify({ posts: posts.map(p => ({
            slug: p.slug, title: p.title, date: p.date,
            tags: p.tags, summary: p.summary, url: `/blog/${p.slug}/`,
            featured: p.featured
        })) }, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'rss.xml'), renderRss());

    // 样式(minify)
    const css = renderCss();
    const minified = esbuild.transformSync(css, { loader: 'css', minify: true });
    fs.writeFileSync(path.join(OUT_DIR, 'blog.css'), minified.code);

    console.log(`  ✓ Blog: ${posts.length} posts -> ${(minified.code.length / 1024).toFixed(1)}KB css`);
}

try {
    build();
    console.log('✅ Blog build complete!');
} catch (e) {
    console.error('❌ Blog build failed:', e.message);
    process.exit(1);
}
