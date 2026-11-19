// Likes and replies from the Bluesky thread that links to this post.
// Runs in the reader's browser against Bluesky's public API, so new comments
// appear immediately, without rebuilding the site.

const API = "https://public.api.bsky.app/xrpc";
const el = document.getElementById("bluesky");
const { url, handle } = el.dataset;
const showLikes = !("noLikes" in el.dataset);
const showComments = !("noComments" in el.dataset);

const get = async (method, params) => {
  const res = await fetch(`${API}/${method}?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`${method}: ${res.status}`);
  return res.json();
};

const esc = (s = "") => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Only ever link to http(s): replies are written by strangers.
const safeHref = (u) => { try { return ["http:", "https:"].includes(new URL(u).protocol) ? u : null; } catch { return null; } };

const webUrl = (atUri) => {
  const [, , did, , rkey] = atUri.split("/");
  return `https://bsky.app/profile/${did}/post/${rkey}`;
};

const ago = (iso) => {
  const s = (new Date(iso) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, n] of [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]])
    if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), unit);
  return "just now";
};

/** Post text with links and mentions, using the post's facets (byte offsets). */
function richText(record) {
  const bytes = new TextEncoder().encode(record.text ?? "");
  const dec = new TextDecoder();
  const facets = [...(record.facets ?? [])].sort((a, b) => a.index.byteStart - b.index.byteStart);
  let out = "", pos = 0;
  for (const f of facets) {
    const { byteStart, byteEnd } = f.index;
    if (byteStart < pos) continue;
    out += esc(dec.decode(bytes.slice(pos, byteStart)));
    const text = esc(dec.decode(bytes.slice(byteStart, byteEnd)));
    const feat = f.features?.[0] ?? {};
    const href = feat.uri ?? (feat.did && `https://bsky.app/profile/${feat.did}`) ?? (feat.tag && `https://bsky.app/hashtag/${encodeURIComponent(feat.tag)}`);
    out += safeHref(href) ? `<a href="${esc(href)}" rel="nofollow noopener">${text}</a>` : text;
    pos = byteEnd;
  }
  return (out + esc(dec.decode(bytes.slice(pos)))).replace(/\n/g, "<br>");
}

/** The Bluesky post that embeds this article's URL (found at build time, or searched for now). */
async function findPost() {
  if (el.dataset.uri) return el.dataset.uri;
  let cursor;
  for (let i = 0; i < 3; i++) {
    const data = await get("app.bsky.feed.getAuthorFeed", { actor: handle, limit: 100, filter: "posts_no_replies", ...(cursor && { cursor }) });
    const hit = data.feed.find(({ post }) => (post.record?.embed?.external?.uri ?? post.embed?.external?.uri) === url);
    if (hit) return hit.post.uri;
    if (!(cursor = data.cursor)) break;
  }
}

const avatar = (a, size = 32) =>
  safeHref(a.avatar)
    ? `<img class="avatar" src="${esc(a.avatar)}" alt="" width="${size}" height="${size}" loading="lazy">`
    : `<span class="avatar"></span>`;

function reply(node, depth = 0) {
  if (!node?.post || node.blocked || node.notFound) return "";
  const { post } = node;
  const a = post.author;
  const children = depth < 5 ? (node.replies ?? []).sort(byDate).map((r) => reply(r, depth + 1)).join("") : "";
  return `<li>
    <div class="who">${avatar(a)}<a href="https://bsky.app/profile/${esc(a.handle)}">${esc(a.displayName || a.handle)}</a>
      <a class="when" href="${webUrl(post.uri)}">${ago(post.record.createdAt)}</a></div>
    <div class="text">${richText(post.record)}</div>
    ${children ? `<ul>${children}</ul>` : ""}
  </li>`;
}
const byDate = (a, b) => new Date(a.post?.record?.createdAt ?? 0) - new Date(b.post?.record?.createdAt ?? 0);

async function main() {
  const uri = await findPost();
  if (!uri) return; // not shared on Bluesky (yet)

  const [{ thread }, likes] = await Promise.all([
    get("app.bsky.feed.getPostThread", { uri, depth: 6 }),
    showLikes ? get("app.bsky.feed.getLikes", { uri, limit: 50 }) : { likes: [] },
  ]);
  const root = thread.post;
  const replies = (thread.replies ?? []).sort(byDate);

  el.innerHTML = `
    <h2>Discussion</h2>
    <p class="summary">
      ${showLikes ? `${root.likeCount ?? 0} like${root.likeCount === 1 ? "" : "s"}` : ""}
      ${showLikes && showComments ? " · " : ""}
      ${showComments ? `${root.replyCount ?? 0} repl${root.replyCount === 1 ? "y" : "ies"}` : ""}
      · <a href="${webUrl(uri)}">${showComments ? "Reply" : "Like"} on Bluesky</a>
    </p>
    ${showLikes && likes.likes.length ? `<div class="likes">${likes.likes.map((l) => `<a href="https://bsky.app/profile/${esc(l.actor.handle)}" title="${esc(l.actor.displayName || l.actor.handle)}">${avatar(l.actor, 28)}</a>`).join("")}</div>` : ""}
    ${showComments && replies.length ? `<ul class="replies">${replies.map((r) => reply(r)).join("")}</ul>` : ""}`;
}

main().catch((e) => console.warn("[bluesky]", e));
