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
function parseFrontmatter(raw) {
    const fm = { title: '', date: '', tags: [], summary: '' };
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { fm, body: raw };
    const [, header, body] = m;
    let tagList = [];
    header.split(/\r?\n/).forEach(line => {
        const kv = line.match(/^([\w-]+):\s*(.*)$/);
        if (!kv) return;
        const [, key, value] = kv;
        if (key === 'tags') {
            tagList = value.replace(/^\[|\]$/g, '').split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
        } else {
            fm[key] = value.trim();
        }
    });
    fm.tags = tagList;
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
    <link rel="canonical" href="${SITE_URL}${canonicalPath}">
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${cssHref}">
</head>
<body>
    <header class="site-header">
        <a class="brand" href="/blog/">${BLOG_TITLE}</a>
        <span class="brand-sub">${BLOG_DESC}</span>
        <nav class="site-nav">
            <a href="/blog/tags/">标签</a>
            <a href="/">主页</a>
            <a href="/about/">关于我</a>
        </nav>
    </header>
    <main class="container">`;
}

const footer = `
    </main>
    <footer class="site-footer">
        <a href="/blog/">博客首页</a>
        <span>·</span>
        <a href="/blog/tags/">标签</a>
        <span>·</span>
        <a href="/">主页</a>
        <span>·</span>
        <a href="/about/">关于我</a>
        <span>·</span>
        <a href="/blog/rss.xml">RSS</a>
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
        </article>
        <nav class="pager">${pager.join('')}</nav>`;

    return head('/blog/blog.css', pageTitle) + body + footer;
}

/* ---------- 列表页 ---------- */
function renderIndex() {
    const items = posts.map(p => `
        <article class="post-item">
            <div class="post-item-main">
                <h2 class="post-item-title"><a href="/blog/${p.slug}/">${escapeHtml(p.title)}</a></h2>
                ${p.summary ? `<p class="post-item-summary">${escapeHtml(p.summary)}</p>` : ''}
            </div>
            <div class="post-item-side">
                <time datetime="${p.date}">${formatDate(p.date)}</time>
                ${tagBadges(p.tags)}
            </div>
        </article>`).join('\n');

    const body = `
        <section class="post-list">
            ${items || '<p class="empty">暂无文章,敬请期待。</p>'}
        </section>`;

    return head('/blog/blog.css') + body + footer;
}

/* ---------- 标签归档页 ---------- */
function renderTags() {
    const tagMap = {};
    posts.forEach(p => p.tags.forEach(t => {
        (tagMap[t] = tagMap[t] || []).push(p);
    }));

    const tagNames = Object.keys(tagMap).sort((a, b) => tagMap[b].length - tagMap[a].length);

    const cloud = tagNames.map(t => `
        <a class="tag tag-cloud-item" href="#tag-${encodeURIComponent(t)}">${escapeHtml(t)} <span class="tag-count">${tagMap[t].length}</span></a>`).join('\n');

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
        <div class="tag-cloud">
            ${cloud || '<p class="empty">暂无标签。</p>'}
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
function renderCss() {
    // 深色主题为默认;浅色主题包在 prefers-color-scheme 媒体查询里,跟随系统明暗模式
    const darkTheme = fs.readFileSync(
        path.join(ROOT, 'node_modules', 'highlight.js', 'styles', 'github-dark.css'), 'utf8');
    const lightTheme = fs.readFileSync(
        path.join(ROOT, 'node_modules', 'highlight.js', 'styles', 'github.css'), 'utf8');
    const hljsTheme = `${darkTheme}\n@media (prefers-color-scheme: light) {\n${lightTheme}\n}`;
    const custom = `
:root {
    --bg: oklch(17% 0.02 250);
    --bg-elevated: oklch(21% 0.022 250);
    --bg-hover: oklch(24.5% 0.024 250);
    --text-primary: oklch(95% 0.008 250);
    --text-secondary: oklch(75% 0.02 250);
    --text-muted: oklch(58% 0.02 250);
    --accent: oklch(80% 0.13 85);
    --accent-soft: color-mix(in oklab, oklch(80% 0.13 85) 60%, transparent);
    --accent-border: color-mix(in oklab, oklch(80% 0.13 85) 35%, transparent);
    --border: oklch(90% 0.02 250 / 0.08);
    --border-strong: oklch(90% 0.02 250 / 0.15);
    --code-bg: oklch(13% 0.015 250);
}
@media (prefers-color-scheme: light) {
    :root {
        --bg: oklch(98.2% 0.004 250);
        --bg-elevated: oklch(100% 0 0);
        --bg-hover: oklch(95.5% 0.007 250);
        --text-primary: oklch(26% 0.03 250);
        --text-secondary: oklch(45% 0.025 250);
        --text-muted: oklch(62% 0.02 250);
        --accent: oklch(52% 0.115 80);
        --accent-soft: color-mix(in oklab, oklch(52% 0.115 80) 60%, transparent);
        --accent-border: color-mix(in oklab, oklch(52% 0.115 80) 32%, transparent);
        --border: oklch(50% 0.02 250 / 0.12);
        --border-strong: oklch(50% 0.02 250 / 0.22);
        --code-bg: oklch(94% 0.006 250);
    }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background: var(--bg);
    color: var(--text-primary);
    font-family: 'Instrument Sans', 'Segoe UI', 'Microsoft YaHei', system-ui, sans-serif;
    line-height: 1.8;
    -webkit-font-smoothing: antialiased;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.site-header {
    position: sticky;
    top: 0;
    z-index: 100;
    max-width: 860px;
    margin: 0 auto;
    padding: 0 24px;
    height: 60px;
    display: flex;
    align-items: center;
    gap: 16px;
    background: color-mix(in oklab, var(--bg) 82%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
}
.brand {
    font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
    font-weight: 800;
    font-size: 1.25rem;
    color: var(--text-primary);
    letter-spacing: -0.02em;
}
.brand::after { content: '.'; color: var(--accent); }
.brand:hover { text-decoration: none; }
.brand-sub { color: var(--text-muted); font-size: 0.8rem; }
.site-nav { margin-left: auto; }
.site-nav a { color: var(--text-secondary); font-size: 0.9rem; transition: color 200ms; }
.site-nav a:hover { color: var(--accent); text-decoration: none; }

.container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
.site-footer {
    max-width: 860px;
    margin: 0 auto;
    padding: 40px 24px;
    color: var(--text-muted);
    font-size: 0.875rem;
    display: flex;
    gap: 8px;
}

/* ---- 列表页 ---- */
.post-list { display: flex; flex-direction: column; gap: 12px; padding-top: 24px; }
.post-item {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 22px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    transition: border-color 200ms, transform 350ms;
}
.post-item:hover {
    border-color: var(--accent-border);
    transform: translateY(-2px);
    background: var(--bg-elevated);
    text-decoration: none;
}
.post-item-main { min-width: 0; }
.post-item-title { font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif; font-size: 1.1rem; font-weight: 700; }
.post-item-title a { color: inherit; text-decoration: none; }
.post-item-title a:hover { color: var(--accent); text-decoration: none; }
.post-item:hover .post-item-title a { color: var(--accent); }
.post-item-summary { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
.post-item-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.post-item-side time { color: var(--text-muted); font-size: 0.85rem; white-space: nowrap; font-family: 'Cascadia Code', Consolas, monospace; }
.empty { color: var(--text-muted); padding: 40px 0; text-align: center; }

/* ---- 标签 ---- */
.tag {
    display: inline-block;
    font-family: 'Cascadia Code', Consolas, monospace;
    font-size: 0.72rem;
    color: var(--accent-soft);
    border: 1px solid var(--accent-border);
    border-radius: 6px;
    padding: 1px 8px;
    line-height: 1.5;
}
a.tag:hover {
    color: var(--accent);
    background: var(--accent-border);
    text-decoration: none;
}

/* ---- 标签归档页 ---- */
.tag-cloud { display: flex; flex-wrap: wrap; gap: 10px; padding: 32px 0 8px; }
.tag-cloud-item { padding: 4px 12px; font-size: 0.8rem; border-radius: 999px; }
.tag-count { opacity: 0.7; }
.tag-section { padding: 40px 0 8px; }
.tag-section-title {
    font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
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
    font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    font-weight: 800;
    line-height: 1.3;
    margin-bottom: 12px;
}
.post-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: var(--text-muted); font-size: 0.875rem; }
.post-meta time { font-family: 'Cascadia Code', Consolas, monospace; font-size: 0.8rem; }

.post-body { max-width: 720px; font-size: 1rem; }
.post-body h1, .post-body h2, .post-body h3, .post-body h4 {
    font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
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
    background: var(--bg-elevated);
    margin: 1.2em 0;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    color: var(--text-secondary);
}
.post-body table { border-collapse: collapse; margin: 1.2em 0; width: 100%; font-size: 0.9rem; }
.post-body th, .post-body td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
.post-body th { background: var(--bg-elevated); font-weight: 600; }
.post-body code { font-family: 'Cascadia Code', Consolas, monospace; font-size: 0.875em; }
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
    .site-header { padding: 0 16px; gap: 8px; }
    .brand-sub { display: none; }
    .post-item { flex-direction: column; gap: 6px; }
    .post-item-side { flex-direction: row; align-items: center; }
    .site-nav { margin-left: auto; width: auto; }
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
            tags: p.tags, summary: p.summary, url: `/blog/${p.slug}/`
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
