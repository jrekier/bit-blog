import type { AccentColor, BaseColor } from "./colors";

// IMPORTANT SET THOSE TWO VARIABLES:
// NUMBER ONE:
// if deployed to github pages, set to https://<your-github-username>.github.io/
export const SITE = "https://jrekier.github.io/bit-blog";

// NUMBER TWO:
// if repo name is <your-github-username>.github.io set to '/'
// otherwise set to '/<your-repo-name>'
export const BASE = "/bit-blog";

// MORE SETTINGS:

// will be used for the the title and meta tags and in the header (if SITE_NAME is left blank)
export const SITE_TITLE = "Jerem's blog";

// will be used in the meta tags (and for example shown in search results)
export const SITE_DESCRIPTION = "Trying something.";

// will be used as the icon in the header and the favicon
export const SITE_FAVICON = "🐰";

// will be used in the footer as the name of the author (c) <YEAR> <NAME> - LICENSE
export const NAME = "bit-blog";

// will be used in the footer as the license of the content (e.g. "All right reserved" or "CC-BY-SA 4.0")
export const LICENSE = "MIT licensed.";

// will be used to identify your bluesky account, so that likes and comments can be shown on your posts
export const BLUESKY_IDENTIFIER = "jrekier.bsky.social";

export const SOURCE_LINK = 'https://github.com/flo-bit/blog-template';

// will be used to set the base color of the blog
export const BASE_COLOR: BaseColor = "neutral";

// will be used to set the accent color of the blog
export const ACCENT_COLOR: AccentColor = "cyan";

// will show all icons that are not empty in the footer as links
export const SOCIAL_LINKS: {
  FACEBOOK_URL?: string;
  TWITTER_URL?: string;
  GITHUB_URL?: string;
  INSTAGRAM_URL?: string;
  LINKEDIN_URL?: string;
  YOUTUBE_URL?: string;
  SUBSTACK_URL?: string;
  EMAIL?: string;
  BLUESKY_URL?: string;
  SHOW_RSS?: boolean;
} = {
  SHOW_RSS: true,
  BLUESKY_URL: "https://bsky.app/profile/jrekier.bsky.social",
  GITHUB_URL: "https://github.com/jrekier",
  EMAIL: "jrekier@gmail.com",
};


// POSSE: syndicate new posts to other networks after each deploy
// (see scripts/posse.mjs and ENGINE.md). Credentials are GitHub secrets, not here.
export const POSSE = {
  // only posts published on or after this date are syndicated automatically,
  // so old posts don't all get shared at once
  SINCE: "2026-11-19",
  // post to Bluesky as BLUESKY_IDENTIFIER (needs the BLUESKY_APP_PASSWORD secret)
  BLUESKY: true,
  // e.g. "https://mathstodon.xyz"; leave empty to skip Mastodon (needs the MASTODON_TOKEN secret)
  MASTODON_INSTANCE: "",
  LANG: "en",
};

// CITATIONS: [@key] citations formatted from your Zotero export (see src/lib/citations.ts)
export const CITATIONS = {
  // files Zotero/Better BibTeX keeps updated; missing files are ignored
  BIBLIOGRAPHY: ["src/references.bib", "src/references.json"],
  // apa | vancouver | harvard1 | chicago | mla, or a path/URL to any .csl file
  STYLE: "apa",
  HEADING: "References",
};

// EVEN MORE SETTINGS:

// if true, will show theme toggle in header (otherwise theme is automatically detected and can't be changed by the readers)
export const MANUAL_DARK_MODE = true;

// if true, will enable the search functionality
export const SEARCH_ENABLED = true;

// if true, will show images in the posts
export const SHOW_IMAGES = true;

// will be used to set the number of posts per page
export const POSTS_PER_PAGE = 8;

// will be shown in the header, if left blank will instead show the SITE_TITLE
export const SITE_NAME = "";

// if true, will show the SITE_FAVICON in the header
export const SHOW_FAVICON_IN_HEADER = true;
