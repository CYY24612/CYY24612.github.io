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
function head(cssHref, title) {
    const pageTitle = title || `${BLOG_TITLE} · ${BLOG_DESC}`;
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <meta name="description" content="${BLOG_DESC}">
    <link rel="canonical" href="${SITE_URL}/blog/">
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
            <a href="/">作品集</a>
        </nav>
    </header>
    <main class="container">`;
}

const footer = `
    </main>
    <footer class="site-footer">
        <a href="/blog/">博客首页</a>
        <span>·</span>
        <a href="/">返回作品集</a>
        <span>·</span>
        <a href="/blog/rss.xml">RSS</a>
    </footer>
</body>
</html>`;

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tagBadges(tags, base = '/blog/') {
    return tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
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
        <a class="post-item" href="/blog/${p.slug}/">
            <div class="post-item-main">
                <h2 class="post-item-title">${escapeHtml(p.title)}</h2>
                ${p.summary ? `<p class="post-item-summary">${escapeHtml(p.summary)}</p>` : ''}
            </div>
            <div class="post-item-side">
                <time datetime="${p.date}">${formatDate(p.date)}</time>
                ${tagBadges(p.tags)}
            </div>
        </a>`).join('\n');

    const body = `
        <section class="post-list">
            ${items || '<p class="empty">暂无文章,敬请期待。</p>'}
        </section>`;

    return head('/blog/blog.css') + body + footer;
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
    const hljsTheme = fs.readFileSync(
        path.join(ROOT, 'node_modules', 'highlight.js', 'styles', 'github-dark.css'), 'utf8');
    const custom = `
:root {
    --bg: #14161f;
    --bg-elevated: #1a1d2e;
    --text-primary: #f2f4fc;
    --text-secondary: #b8bfd4;
    --text-muted: #7a8299;
    --accent: #d4a017;
    --border: rgba(255,255,255,0.08);
    --code-bg: #0f1119;
}
@media (prefers-color-scheme: light) {
    :root {
        --bg: #f7f7f5;
        --bg-elevated: #ffffff;
        --text-primary: #23262f;
        --text-secondary: #4a4f5c;
        --text-muted: #8a8f9c;
        --accent: #b8860b;
        --border: rgba(0,0,0,0.1);
        --code-bg: #f2f3f6;
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
    max-width: 860px;
    margin: 0 auto;
    padding: 48px 24px 24px;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 16px;
}
.brand {
    font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
    font-weight: 800;
    font-size: 1.5rem;
    color: var(--text-primary);
}
.brand:hover { text-decoration: none; }
.brand-sub { color: var(--text-muted); font-size: 0.875rem; }
.site-nav { margin-left: auto; }

.container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
.site-footer {
    max-width: 860px;
    margin: 0 auto;
    padding: 48px 24px;
    color: var(--text-muted);
    font-size: 0.875rem;
    display: flex;
    gap: 8px;
}

/* ---- 列表页 ---- */
.post-list { display: flex; flex-direction: column; gap: 12px; padding-top: 12px; }
.post-item {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 8px;
    border-bottom: 1px solid var(--border);
    color: var(--text-primary);
}
.post-item:hover { background: var(--bg-elevated); text-decoration: none; border-radius: 8px; }
.post-item-main { min-width: 0; }
.post-item-title { font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif; font-size: 1.15rem; font-weight: 700; }
.post-item:hover .post-item-title { color: var(--accent); }
.post-item-summary { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
.post-item-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.post-item-side time { color: var(--text-muted); font-size: 0.85rem; white-space: nowrap; }
.empty { color: var(--text-muted); padding: 40px 0; text-align: center; }

/* ---- 标签 ---- */
.tag {
    display: inline-block;
    font-size: 0.75rem;
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 4px;
    padding: 1px 8px;
    line-height: 1.5;
}

/* ---- 文章页 ---- */
.post { padding: 12px 0 24px; }
.post-header { padding-bottom: 24px; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
.post-title {
    font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
    font-size: clamp(1.6rem, 4vw, 2.2rem);
    font-weight: 800;
    line-height: 1.3;
    margin-bottom: 12px;
}
.post-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: var(--text-muted); font-size: 0.875rem; }

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
    .post-item { flex-direction: column; gap: 6px; }
    .post-item-side { flex-direction: row; align-items: center; }
    .site-nav { margin-left: 0; width: 100%; }
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

    // 列表页 / JSON / RSS
    fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderIndex());
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
