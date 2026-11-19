# bit-blog

Source of [jrekier.github.io/bit-blog](https://jrekier.github.io/bit-blog/). Markdown in, static HTML out,
built by a small engine in [`engine/`](engine/README.md) and deployed to GitHub Pages on every push to `main`.

```sh
npm ci           # install exactly what package-lock.json lists (once, and after dependency updates)
npm run dev      # preview at http://localhost:4321/bit-blog/ with live reload
npm run build    # full build into _site/
```

## Writing

Posts are `src/content/blog/YYYY-MM-DD-slug.md`; the file name, lowercased, becomes the URL.
Files starting with `_` are ignored (see `_citation-example.md`). Images go in `src/assets/posts/`
and are referenced relatively: `![alt](../../assets/posts/figure.png)`.

```yaml
---
title: "…"
description: "…"            # shown in lists, link cards and the Bluesky post
pubDate: "November 19 2026"
tags: ['physics']
# optional:
updatedDate: "…"
published: false             # draft: not built
hidden: true                 # built, but not listed anywhere (share the link privately)
syndicate: false             # never post this to Bluesky/Mastodon
posseText: "…"               # custom text for the Bluesky/Mastodon post
csl: chicago                 # citation style for this post only
noCite: ["@key"]             # in the bibliography without being cited
disableComments: true
disableLikes: true
---
```

Math is LaTeX between `$…$` / `$$…$$`, rendered by MathJax at build time (`\label`/`\eqref` work).
Settings for the whole site are in [`engine/config.mjs`](engine/config.mjs).

## Citations from Zotero

**Setup, once:** install [Better BibTeX](https://retorque.re/zotero-better-bibtex/) in Zotero, then right-click your
library (or a "Blog" collection) → *Export…* → **Better BibTeX**, tick **Keep updated**, and save it over
`src/references.bib`. Zotero then rewrites that file whenever you add or edit a reference; commit it with your posts.
(A **Better CSL JSON** export to `src/references.json` also works.)

**In a post:**

| You write | You get (APA) |
|---|---|
| `[@kepler1609]` | (Kepler, 1609) |
| `[@misner1973, chap. 8]` | (Misner et al., 1973, Chapter 8) |
| `[@a; @b]` | both, in one parenthesis |
| `@misner1973 showed` | Misner et al. (1973) showed |
| `[-@misner1973]` | (1973) |

Keys are the ones Better BibTeX shows in Zotero. The bibliography goes at the end, or where you put `[^ref]` on its own line.
Unknown keys produce a build warning. Style: `citations.style` in `engine/config.mjs` (`apa`, `chicago`, `vancouver`, `harvard1`, `mla`,
or the path/URL of any `.csl` file from the [CSL styles repository](https://github.com/citation-style-language/styles)).

## POSSE: sharing posts on Bluesky

After each deploy, the `syndicate` job runs [`scripts/posse.mjs`](scripts/posse.mjs), which:

1. reads `/posse.json` from the live site (every published, non-hidden post);
2. keeps posts dated on or after `posse.since` in `engine/config.mjs` without `syndicate: false`;
3. skips any article already linked from your recent Bluesky posts (so it never double-posts);
4. posts the rest with a link card (title, description, preview image).

Comments and likes under each article come from that Bluesky thread, loaded live in the reader's browser.

**Setup, once:** Bluesky → Settings → Privacy and security → **App passwords** → create one, then add it as a
repository secret named `BLUESKY_APP_PASSWORD` (GitHub → Settings → Secrets and variables → Actions).
For Mastodon, set `posse.mastodonInstance` in `engine/config.mjs` and add a `MASTODON_TOKEN` secret
(an app token with `read:accounts write:statuses`). Without secrets, the job reports "not configured" and passes.

```sh
npm run posse:dry                                   # what would be posted
npm run build && node scripts/posse.mjs --local --dry-run
BLUESKY_APP_PASSWORD=… npm run posse -- --only <post-id>   # post one by hand
```

## Dependencies

17 direct packages, all listed in `package.json` with exact versions. `.npmrc` turns off install scripts, and
Dependabot (`.github/dependabot.yml`) proposes updates weekly, ignoring releases less than a week old.
Check with `npm audit`. The remaining low-severity KaTeX advisory concerns code this site never runs.

Originally based on [flo-bit/blog-template](https://github.com/flo-bit/blog-template) (MIT).
