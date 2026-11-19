// HTML templates: plain functions returning strings. No framework, no components.
// `html` is a tagged template that joins arrays, so you can map() inside ${}.
// Anything that isn't already HTML must go through esc().

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const html = (strings, ...values) =>
  strings.reduce((out, s, i) => out + s + (i < values.length ? [values[i]].flat().join("") : ""), "");

const date = (d) =>
  html`<time datetime="${d.toISOString()}">${d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</time>`;

const tags = (list, site) =>
  list.length ? html`<ul class="tags">${list.map((t) => html`<li><a href="${site.url(`tags/${t}/`)}">${esc(t)}</a></li>`)}</ul>` : "";

// ---------------------------------------------------------------------------

export function layout(site, { title, description, path, image, body, type = "website", active = "" }) {
  const c = site.config;
  const fullTitle = title ? `${title} · ${c.title}` : c.title;
  const canonical = site.abs(path);
  const nav = (href, label, key) => html`<a href="${site.url(href)}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`;

  return html`<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description ?? c.description)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${c.favicon}</text></svg>">
<link rel="alternate" type="application/rss+xml" title="${esc(c.title)}" href="${site.url("rss.xml")}">
<link rel="sitemap" href="${site.url("sitemap-index.xml")}">
<link rel="stylesheet" href="${site.url(`style.css?v=${site.version}`)}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(c.title)}">
<meta property="og:title" content="${esc(title ?? c.title)}">
<meta property="og:description" content="${esc(description ?? c.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${site.abs(`open-graph/${image ?? "main"}.png`)}">
<meta name="twitter:card" content="summary_large_image">
</head>
<body>
<header class="site-header">
  <a class="brand" href="${site.url("")}"><span aria-hidden="true">${c.favicon}</span> ${esc(c.title)}</a>
  <nav>${nav("", "Blog", "blog")} ${nav("about/", "About", "about")} ${nav("search/", "Search", "search")} <a href="${site.url("rss.xml")}">RSS</a></nav>
</header>
<main>
${body}
</main>
<footer class="site-footer">
  <p>© ${new Date().getFullYear()} ${esc(c.author)} · ${esc(c.license)}</p>
  <p>${c.links.map((l) => html`<a href="${l.href}">${esc(l.label)}</a>`).join(" · ")}</p>
</footer>
${site.dev ? '<script src="/__reload.js"></script>' : ""}
</body>
</html>
`;
}

// ---------------------------------------------------------------------------

export function postPage(site, post) {
  return layout(site, {
    title: post.title,
    description: post.description,
    path: post.path,
    image: post.id,
    type: "article",
    active: "blog",
    body: html`
<article class="post">
  <header>
    <p class="meta">${date(post.pubDate)}${post.updatedDate ? html` · updated ${date(post.updatedDate)}` : ""}</p>
    <h1>${esc(post.title)}</h1>
    ${tags(post.tags, site)}
  </header>
  <div class="prose" data-pagefind-body>
${post.html}
  </div>
</article>
${post.disableComments && post.disableLikes ? "" : html`
<section id="bluesky" class="bluesky"
  data-url="${site.abs(post.path)}"
  data-handle="${esc(site.config.bluesky.handle)}"
  data-uri="${esc(post.blueskyUri ?? "")}"
  ${post.disableLikes ? "data-no-likes" : ""} ${post.disableComments ? "data-no-comments" : ""}></section>
<script type="module" src="${site.url(`bluesky.js?v=${site.version}`)}"></script>`}`,
  });
}

export function postList(site, { title, heading, intro = "", posts, path, active }) {
  return layout(site, {
    title,
    path,
    active,
    body: html`
${heading ? html`<h1 class="list-heading">${heading}</h1>` : ""}
${intro}
<ol class="post-list">
${posts.map(
  (p) => html`
  <li>
    <p class="meta">${date(p.pubDate)}</p>
    <h2><a href="${site.url(p.path)}">${esc(p.title)}</a></h2>
    <p>${esc(p.description)}</p>
    ${tags(p.tags, site)}
  </li>`,
)}
</ol>`,
  });
}

export function simplePage(site, { title, path, content, active }) {
  return layout(site, { title, path, active, body: html`<article class="prose">${content}</article>` });
}

export function searchPage(site) {
  return layout(site, {
    title: "Search",
    path: "search/",
    active: "search",
    body: html`
<h1 class="list-heading">Search</h1>
<link rel="stylesheet" href="${site.url("pagefind/pagefind-ui.css")}">
<div id="search"></div>
<script src="${site.url("pagefind/pagefind-ui.js")}"></script>
<script>
  if (window.PagefindUI) new PagefindUI({ element: "#search", showSubResults: true, showImages: false, autofocus: true });
  else document.getElementById("search").textContent = "Search is built by \`npm run build\` (not available in the dev server).";
</script>`,
  });
}

export function redirectPage(site, to) {
  const url = site.url(to);
  return html`<!doctype html><meta charset="utf-8"><title>Redirecting…</title><meta http-equiv="refresh" content="0; url=${url}"><link rel="canonical" href="${site.abs(to)}"><a href="${url}">${url}</a>`;
}

export function notFoundPage(site) {
  return layout(site, {
    title: "Not found",
    path: "404.html",
    body: html`<h1 class="list-heading">Not found</h1><p>That page doesn’t exist. <a href="${site.url("")}">Back to the blog</a>.</p>`,
  });
}

// ---------------------------------------------------------------------------
// Feeds

export function rss(site, posts) {
  const c = site.config;
  return html`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(c.title)}</title>
<description>${esc(c.description)}</description>
<link>${site.abs("")}</link>
<atom:link href="${site.abs("rss.xml")}" rel="self" type="application/rss+xml"/>
<language>${c.lang}</language>
${posts.map(
  (p) => html`<item>
  <title>${esc(p.title)}</title>
  <link>${site.abs(p.path)}</link>
  <guid isPermaLink="true">${site.abs(p.path)}</guid>
  <description>${esc(p.description)}</description>
  <pubDate>${p.pubDate.toUTCString()}</pubDate>
${p.tags.map((t) => html`  <category>${esc(t)}</category>\n`)}</item>
`,
)}</channel>
</rss>
`;
}

export function sitemap(site, paths) {
  return html`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => html`<url><loc>${site.abs(p)}</loc></url>\n`)}</urlset>
`;
}

export function sitemapIndex(site) {
  return html`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${site.abs("sitemap-0.xml")}</loc></sitemap></sitemapindex>
`;
}
