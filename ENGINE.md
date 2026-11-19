# How this blog works

A map of the engine, so you know what every part does and where to change it.
This blog started as [flo-bit/blog-template](https://github.com/flo-bit/blog-template); this file covers what it is now.

## The big picture

```
 src/content/blog/*.md ──► Astro build ──► dist/ (static HTML) ──► GitHub Pages
        │                     │                                       │
  frontmatter checked    remark/rehype plugins:                  after deploy:
  by content.config.ts   math, citations, mathjax               scripts/posse.mjs
                              │                                  posts new articles
  src/references.bib ─────────┘                                 to Bluesky/Mastodon
  (Zotero auto-export)                                                │
                                                                       ▼
            Bluesky replies/likes ◄── fetched at build time ◄── Bluesky thread
```

Everything is static. Nothing runs on a server: GitHub Actions builds the site on every push
**and every 12 hours** (that's how new Bluesky comments show up without you pushing).

## Where things live

| What | File |
|---|---|
| Site settings (title, URLs, POSSE, citations) | `src/config.ts` |
| Allowed frontmatter fields | `src/content.config.ts` |
| Markdown pipeline (math, citations, code highlighting) | `astro.config.ts` |
| Citation plugin wrapper | `src/lib/citations.ts` |
| Your bibliography (from Zotero) | `src/references.bib` |
| Post page template | `src/pages/posts/[...slug].astro` |
| Global CSS (code blocks, MathJax, bibliography) | `src/layouts/BaseLayout.astro` |
| `<head>` tags: canonical URL, OpenGraph | `src/components/BaseHead.astro` |
| Social preview images (auto-generated) | `src/pages/open-graph/[...route].ts` |
| Bluesky comments and likes | `src/components/bluesky/` |
| Feed of posts for syndication | `src/pages/posse.json.ts` → `/posse.json` |
| Syndication script | `scripts/posse.mjs` |
| Build + deploy + syndicate pipeline | `.github/workflows/deploy.yml` |
| RSS | `src/pages/rss.xml.js` |

## Writing a post

Create `src/content/blog/YYYY-MM-DD-slug.md`. The file name (lowercased) becomes the URL.
Files starting with `_` are ignored, which is handy for drafts and templates (see `_citation-example.md`).

```yaml
---
title: "…"
description: "…"            # shown in lists, link cards, and the Bluesky post
pubDate: "November 19 2026"
tags: ['physics']
# optional:
published: false             # draft: not built at all
hidden: true                 # built, but not listed (share the link privately)
syndicate: false             # never post this to Bluesky/Mastodon
posseText: "Custom text for the Bluesky post"
csl: chicago                 # citation style for this post only
noCite: ["@key"]             # in the bibliography without being cited
---
```

`npm run dev` previews at http://localhost:4321/bit-blog/. Search only works after `npm run build && npm run preview`.

## Citations from Zotero

**One-time setup**

1. Install the [Better BibTeX](https://retorque.re/zotero-better-bibtex/) add-on for Zotero.
2. In Zotero, right-click your library or a "Blog" collection → *Export…* → format **Better BibTeX**,
   tick **Keep updated**, and save it as `bit-blog/src/references.bib` (replace the placeholder).
   Zotero now rewrites that file whenever you add or edit a reference. Commit it with your post.
   (A **Better CSL JSON** export to `src/references.json` works too.)
3. Citation keys are the ones Better BibTeX shows in Zotero's middle pane (e.g. `rekier2022`).
   You can pin or customize them in Better BibTeX's preferences.

**In a post**

| You write | You get (APA) |
|---|---|
| `[@kepler1609]` | (Kepler, 1609) |
| `[@misner1973, chap. 8]` | (Misner et al., 1973, Chapter 8) |
| `[@a; @b]` | (A, …; B, …) |
| `@misner1973 showed` | Misner et al. (1973) showed |
| `[-@misner1973]` | (1973) |

Citations link to the bibliography and show the full reference on hover. The bibliography goes at
the end, or wherever you put `[^ref]` on its own line. If a key isn't in your export, the build prints a
`[citations] … not found` warning and leaves the text as typed.

Style: `CITATIONS.STYLE` in `src/config.ts` (`apa`, `chicago`, `vancouver`, `harvard1`, `mla`), or the
path/URL to any `.csl` file from the [CSL style repository](https://github.com/citation-style-language/styles),
e.g. a physics style like `american-physics-society`.

## POSSE: publishing to Bluesky (and elsewhere)

After each deploy, the `syndicate` job in `.github/workflows/deploy.yml` runs `scripts/posse.mjs`. It:

1. downloads `https://jrekier.github.io/bit-blog/posse.json` (every published, non-hidden post);
2. keeps posts with `pubDate` on or after `POSSE.SINCE` and without `syndicate: false`;
3. reads your recent Bluesky posts and skips any article already linked there;
4. waits until the article's page is live, then posts it with a link card (title, description, OG image).

Because the Bluesky post embeds the article's canonical URL, the comments and likes under each
article pick up that thread automatically (on the next build, within 12 hours, or push to trigger one).

It's idempotent, so running it twice never double-posts, and a failed run is caught up by the next.

**One-time setup**

1. Bluesky → Settings → Privacy and security → **App passwords** → create one.
2. GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**:
   `BLUESKY_APP_PASSWORD`.
3. Optionally for Mastodon: set `POSSE.MASTODON_INSTANCE` in `src/config.ts` (e.g. `https://mathstodon.xyz`),
   create an app under Preferences → Development with `read:accounts write:statuses`,
   and add its token as the `MASTODON_TOKEN` secret.

Without the secrets, the job just reports "not configured" and passes.

**Locally**

```sh
npm run posse:dry                 # what would be posted (reads your public Bluesky feed)
npm run build && node scripts/posse.mjs --local --dry-run   # same, from your local build
BLUESKY_APP_PASSWORD=… npm run posse -- --only 2026-11-20-my-post   # post one by hand
```

**Adding another network** — in `scripts/posse.mjs`, add an object with `enabled`, `init`,
`alreadyShared` and `publish` next to `bluesky` and `mastodon`, and add it to `TARGETS`.

## Things worth knowing

- `SITE`/`BASE` in `src/config.ts` define every absolute URL. Change them only together with a domain move,
  and then old Bluesky threads will no longer match their articles.
- `npm run build` = `astro check` (type-checks, fails on errors) + `astro build` + `pagefind` (search index).
- If posts suddenly render empty after a failed build, clear Astro's cache: `rm -rf node_modules/.astro`.
- The `posts` collection in `content.config.ts` is your Bluesky feed, loaded at build time; it is what the
  comments component searches.
