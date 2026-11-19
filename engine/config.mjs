// Everything about the site that isn't a post lives here.

export default {
  // Public address. Every absolute URL is built from these two:
  //   https://jrekier.github.io + /bit-blog + /posts/<slug>/
  origin: "https://jrekier.github.io",
  base: "/bit-blog", // "" if the site lives at the root of the domain

  title: "Jerem's blog",
  description: "Trying something.",
  author: "jerem.", // footer: © <year> <author>

  favicon: "🐰",
  lang: "en",
  license: "MIT licensed.",

  // shown in the footer
  links: [
    { label: "Bluesky", href: "https://bsky.app/profile/jrekier.bsky.social" },
    { label: "GitHub", href: "https://github.com/jrekier" },
    { label: "Email", href: "mailto:jrekier@gmail.com" },
  ],

  // folders, relative to the repository root
  paths: {
    posts: "src/content/blog", // *.md; files starting with _ are ignored
    pages: "src/content/info", // about.md(x) -> /about/
    images: "src/assets", // copied (and converted to WebP) on build
    out: "_site",
    cache: ".cache", // optimized images, safe to delete
  },

  // comments and likes are read from the Bluesky thread that links to a post
  bluesky: { handle: "jrekier.bsky.social" },

  // POSSE: see scripts/posse.mjs
  posse: {
    since: "2026-11-19", // only posts published on/after this are syndicated
    bluesky: true,
    mastodonInstance: "", // e.g. "https://mathstodon.xyz"
  },

  // citations: see engine/citations.mjs
  citations: {
    files: ["src/references.bib", "src/references.json"], // missing files are ignored
    style: "apa", // apa | vancouver | harvard1 | chicago | mla | path/URL to a .csl file
    heading: "References",
  },

  // MathJax (server-side, rendered to SVG)
  mathjax: {
    tex: { tags: "ams", packages: { "[+]": ["ams", "bussproofs"] } },
  },

  images: { maxWidth: 1600, quality: 80 },
};
