#!/usr/bin/env node
// The blog engine. Reads Markdown, writes a static site to _site/.
//
//   node engine/build.mjs              full build (with search index)
//   node engine/build.mjs --offline    don't ask Bluesky which posts were shared
//   node engine/dev.mjs                local preview with live reload
//
// Reading order: main() at the bottom, then the helpers it calls.

import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import yaml from "js-yaml";
import { slug } from "github-slugger";
import sharp from "sharp";
import config from "./config.mjs";
import { createRenderer } from "./markdown.mjs";
import * as T from "./templates.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const DEV = args.includes("--dev");
const OFFLINE = args.includes("--offline") || DEV;
const SEARCH = !DEV && !args.includes("--no-search");

const P = Object.fromEntries(Object.entries(config.paths).map(([k, v]) => [k, join(root, v)]));
const base = config.base.replace(/\/$/, "");

/** Helpers every template gets: site.url("posts/x/") -> "/bit-blog/posts/x/", site.abs(...) -> full URL. */
const site = {
  config,
  dev: DEV,
  version: Date.now().toString(36), // cache-buster for CSS/JS
  url: (p = "") => `${base}/${p}`.replace(/\/{2,}/g, "/"),
  abs: (p = "") => config.origin + site.url(p),
};

const write = async (path, content) => {
  const file = join(P.out, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
};

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

const FIELDS = {
  title: "required", description: "required", pubDate: "required",
  updatedDate: "", tags: "", shortDescription: "", author: "", category: "",
  published: "false = draft, not built",
  hidden: "true = built but not listed",
  syndicate: "false = never post to Bluesky/Mastodon",
  posseText: "custom text for the Bluesky/Mastodon post",
  csl: "citation style for this post", noCite: "uncited bibliography entries",
  disableComments: "", disableLikes: "",
};

function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return m ? { data: yaml.load(m[1]) ?? {}, body: src.slice(m[0].length) } : { data: {}, body: src };
}

async function loadPosts() {
  const files = (await readdir(P.posts)).filter((f) => /\.mdx?$/.test(f) && !f.startsWith("_")).sort();
  const posts = [];
  const errors = [];

  for (const name of files) {
    const path = join(P.posts, name);
    const { data, body } = parseFrontmatter(await readFile(path, "utf8"));

    for (const [k, rule] of Object.entries(FIELDS))
      if (rule === "required" && data[k] == null) errors.push(`${name}: missing "${k}"`);
    for (const k of Object.keys(data))
      if (!(k in FIELDS)) console.warn(`  ! ${name}: unknown frontmatter field "${k}" (typo?)`);

    const pubDate = new Date(data.pubDate);
    if (data.pubDate != null && isNaN(pubDate)) errors.push(`${name}: can't read pubDate "${data.pubDate}"`);
    if (data.published === false) continue;

    const id = slug(name.replace(/\.mdx?$/, ""));
    posts.push({
      ...data,
      id,
      file: path,
      body,
      frontmatter: data,
      path: `posts/${id}/`,
      pubDate,
      updatedDate: data.updatedDate ? new Date(data.updatedDate) : undefined,
      tags: (data.tags ?? []).map(String),
    });
  }
  if (errors.length) throw new Error("Frontmatter problems:\n  " + errors.join("\n  "));
  return posts.sort((a, b) => b.pubDate - a.pubDate);
}

// ---------------------------------------------------------------------------
// Images: copied to _site/assets/, PNG/JPEG converted to WebP (cached in .cache/)
// ---------------------------------------------------------------------------

const imageMemo = new Map();

function resolveImage(src, fromFile) {
  const file = resolve(dirname(fromFile), decodeURI(src.split(/[?#]/)[0]));
  if (!imageMemo.has(file)) imageMemo.set(file, processImage(file));
  return imageMemo.get(file);
}

async function processImage(file) {
  if (!existsSync(file)) return null;
  let rel = relative(P.images, file);
  if (rel.startsWith("..")) rel = join("other", relative(root, file));
  const ext = extname(file).toLowerCase();

  if ([".png", ".jpg", ".jpeg"].includes(ext)) {
    const { mtimeMs, size } = await stat(file);
    const { maxWidth, quality } = config.images;
    const key = createHash("sha1").update(`${rel}|${mtimeMs}|${size}|${maxWidth}|${quality}`).digest("hex").slice(0, 16);
    const cached = join(P.cache, "images", `${key}.webp`);
    const meta = cached + ".json";
    if (!existsSync(meta)) {
      await mkdir(dirname(cached), { recursive: true });
      const info = await sharp(file).resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality }).toFile(cached);
      await writeFile(meta, JSON.stringify({ width: info.width, height: info.height }));
    }
    const outRel = join("assets", rel.replace(/\.(png|jpe?g)$/i, ".webp"));
    await mkdir(dirname(join(P.out, outRel)), { recursive: true });
    await copyFile(cached, join(P.out, outRel));
    return { url: site.url(outRel), ...JSON.parse(await readFile(meta, "utf8")) };
  }

  const outRel = join("assets", rel);
  await mkdir(dirname(join(P.out, outRel)), { recursive: true });
  await copyFile(file, join(P.out, outRel));
  const dims = ext === ".gif" ? await sharp(file).metadata().catch(() => ({})) : {};
  return { url: site.url(outRel), width: dims.width, height: dims.pageHeight ?? dims.height };
}

// ---------------------------------------------------------------------------
// Bluesky: which post on Bluesky links to which article (for comments/likes)
// ---------------------------------------------------------------------------

async function blueskyThreads() {
  const map = new Map();
  if (OFFLINE || !config.bluesky?.handle) return map;
  try {
    let cursor;
    for (let i = 0; i < 5; i++) {
      const q = new URLSearchParams({ actor: config.bluesky.handle, limit: "100", filter: "posts_no_replies", ...(cursor && { cursor }) });
      const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?${q}`);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      for (const { post } of data.feed) {
        const uri = post.record?.embed?.external?.uri ?? post.embed?.external?.uri;
        if (uri && !map.has(uri)) map.set(uri, post.uri);
      }
      if (!(cursor = data.cursor)) break;
    }
  } catch (e) {
    console.warn(`  ! couldn't read Bluesky feed (${e.message}); pages will look up threads in the browser`);
  }
  return map;
}

// ---------------------------------------------------------------------------

function posseFeed(listed) {
  return {
    site: site.abs("").replace(/\/$/, ""),
    since: config.posse.since,
    lang: config.lang,
    bluesky: config.posse.bluesky ? { handle: config.bluesky.handle } : undefined,
    mastodon: config.posse.mastodonInstance ? { instance: config.posse.mastodonInstance } : undefined,
    posts: listed.map((p) => ({
      id: p.id,
      url: site.abs(p.path),
      title: p.title,
      description: p.description,
      shortDescription: p.shortDescription,
      tags: p.tags,
      pubDate: p.pubDate.toISOString(),
      image: site.abs(`open-graph/${p.id}.png`),
      syndicate: p.syndicate ?? true,
      text: p.posseText,
    })),
  };
}

async function buildOgImages(posts) {
  const { ogPng } = await import("./og.mjs"); // loaded only here: resvg is a native binary
  const font = join(root, "src/assets/fonts/InterVariable.ttf");
  await write("open-graph/main.png", ogPng({ title: config.title, description: config.description, siteTitle: "" }, font));
  for (const p of posts)
    await write(`open-graph/${p.id}.png`, ogPng({ title: p.title, description: p.shortDescription ?? p.description, siteTitle: config.title }, font));
}

async function buildSearchIndex() {
  const pagefind = await import("pagefind");
  const { index } = await pagefind.createIndex({});
  await index.addDirectory({ path: P.out });
  await index.writeFiles({ outputPath: join(P.out, "pagefind") });
  await pagefind.close();
}

// ---------------------------------------------------------------------------

async function main() {
  const t0 = performance.now();
  await rm(P.out, { recursive: true, force: true });
  await mkdir(P.out, { recursive: true });

  const render = createRenderer({ root, config, resolveImage });
  const [posts, threads] = await Promise.all([loadPosts(), blueskyThreads()]);
  const listed = posts.filter((p) => !p.hidden);

  // posts (one at a time: MathJax isn't safe to run concurrently)
  for (const post of posts) {
    post.html = await render(post.body, { path: post.file, frontmatter: post.frontmatter });
    post.blueskyUri = threads.get(site.abs(post.path));
    await write(`${post.path}index.html`, T.postPage(site, post));
  }

  // lists
  await write("index.html", T.postList(site, { posts: listed, path: "", active: "blog" }));
  const tags = [...new Set(listed.flatMap((p) => p.tags))].sort();
  for (const tag of tags) {
    const tagged = listed.filter((p) => p.tags.includes(tag));
    await write(`tags/${tag}/index.html`, T.postList(site, { title: `#${tag}`, heading: `Posts tagged “${T.esc(tag)}”`, posts: tagged, path: `tags/${tag}/` }));
    // the old template paginated tags as /tags/<tag>/<n>/; keep those links working
    for (let n = 1; n <= Math.ceil(tagged.length / 8); n++) await write(`tags/${tag}/${n}/index.html`, T.redirectPage(site, `tags/${tag}/`));
  }
  for (let n = 1; n <= Math.ceil(listed.length / 8); n++) await write(`pages/${n}/index.html`, T.redirectPage(site, ""));

  // standalone pages
  for (const name of existsSync(P.pages) ? await readdir(P.pages) : []) {
    if (!/\.mdx?$/.test(name) || name.startsWith("_")) continue;
    const file = join(P.pages, name);
    const { data, body } = parseFrontmatter(await readFile(file, "utf8"));
    const id = slug(name.replace(/\.mdx?$/, ""));
    const content = await render(body, { path: file, frontmatter: data });
    await write(`${id}/index.html`, T.simplePage(site, { title: data.title ?? id[0].toUpperCase() + id.slice(1), path: `${id}/`, content, active: id }));
  }
  if (config.about) await write("about/index.html", T.redirectPage(site, config.about));
  await write("search/index.html", T.searchPage(site));
  await write("404.html", T.notFoundPage(site));

  // feeds
  await write("rss.xml", T.rss(site, listed));
  await write("sitemap-0.xml", T.sitemap(site, ["", ...listed.map((p) => p.path), ...tags.map((t) => `tags/${t}/`)]));
  await write("sitemap-index.xml", T.sitemapIndex(site));
  await write("posse.json", JSON.stringify(posseFeed(listed), null, 2));

  // social preview images (skipped in the dev server: only link cards use them)
  if (!DEV) await buildOgImages(posts);

  // static assets
  for (const f of ["style.css", "bluesky.js"]) await copyFile(join(root, "engine/assets", f), join(P.out, f));

  if (SEARCH) await buildSearchIndex();

  console.log(`Built ${posts.length} posts (${listed.length} listed, ${tags.length} tags) in ${Math.round(performance.now() - t0)} ms → ${relative(root, P.out)}/`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
