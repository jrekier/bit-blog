# The engine

About 900 lines of plain JavaScript (plus 120 of CSS) that turn `src/content/blog/*.md` into the static site in `_site/`.
No framework, no build step for the engine itself.

```sh
npm run dev      # preview at http://localhost:4321/bit-blog/, rebuilds + reloads on save
npm run build    # full build into _site/, including preview images and the search index
```

| File | What it does |
|---|---|
| `config.mjs` | Every setting: URLs, title, links, POSSE, citations, MathJax |
| `build.mjs` | Reads posts, checks frontmatter, writes every page, feed and image. Start reading at `main()` |
| `markdown.mjs` | The Markdown → HTML pipeline, one plugin per line |
| `citations.mjs` | `[@key]` citations from your Zotero export |
| `templates.mjs` | All HTML, as functions returning strings |
| `assets/style.css` | All styling (light/dark follows the reader's system) |
| `assets/bluesky.js` | Likes and replies, loaded live in the reader's browser |
| `og.mjs` | Social preview images: an SVG template rendered to PNG |
| `dev.mjs` | The preview server |

**Common changes**

- *Change the look:* `assets/style.css`. Colors are the variables at the top.
- *Change a page's structure:* the matching function in `templates.mjs`.
- *Add a frontmatter field:* add it to `FIELDS` in `build.mjs` (unknown fields produce a "typo?" warning), then use `post.yourField` in a template.
- *Add a Markdown feature:* one `.use(...)` line in `markdown.mjs`.
- *Add a page:* drop `something.md` into `src/content/info/` → `/something/`.

## Compared to the Astro version it replaced

Same URLs (checked file by file), same rendered math (equation counts match in every post), same images, RSS IDs, sitemap, `posse.json`, social preview images and search.

Different on purpose:

- **Dependencies:** about a dozen direct ones (unified + plugins, MathJax, sharp, resvg, Pagefind) instead of Astro, Svelte, Tailwind and the template's embed system: 160-odd installed packages instead of 478. Output is 9 MB instead of 27 MB.
- **Comments and likes load live** in the browser, so new replies show up without a rebuild. The build still looks up which Bluesky post belongs to each article to save the reader a request, and the browser searches for the post itself if that lookup is missing.
- **One list of posts** instead of pages of 8. Old `/pages/N/` and `/tags/<tag>/N/` URLs redirect.
- **No dark-mode toggle:** the site follows the reader's system setting.
- **Dropped because no post used them:** YouTube, link-card and Excalidraw embeds, hero images, code highlighting and the copy button. Each is a small addition if you need it later.
- Fixed: the RSS channel link pointed to `/bit-blog/bit-blog/`.
