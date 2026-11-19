// Machine-readable list of published posts, used by scripts/posse.mjs to
// syndicate new posts to Bluesky / Mastodon. Served at <site>/posse.json.
import { getBlogPosts } from "src/utils";
import { BASE, SITE, BLUESKY_IDENTIFIER, POSSE } from "../config.ts";

export async function GET() {
  const posts = await getBlogPosts(); // excludes drafts (published: false) and hidden posts
  const site = SITE.replace(/\/$/, "");
  const origin = new URL(SITE).origin;
  const abs = (path: string) => new URL(`${BASE}/${path}`.replace(/\/+/g, "/"), origin).toString();

  const body = {
    site,
    since: POSSE.SINCE,
    lang: POSSE.LANG,
    bluesky: POSSE.BLUESKY ? { handle: BLUESKY_IDENTIFIER } : undefined,
    mastodon: POSSE.MASTODON_INSTANCE ? { instance: POSSE.MASTODON_INSTANCE } : undefined,
    posts: posts.map((post) => ({
      id: post.id,
      // Must match the canonical URL exactly: the Bluesky comments component
      // finds the thread by looking for a post that embeds this URL.
      url: abs(`posts/${post.id}/`),
      title: post.data.title,
      description: post.data.description,
      shortDescription: post.data.shortDescription,
      tags: post.data.tags ?? [],
      pubDate: post.data.pubDate.toISOString(),
      image: abs(`open-graph/${post.id}.png`),
      syndicate: post.data.syndicate ?? true,
      text: post.data.posseText,
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
