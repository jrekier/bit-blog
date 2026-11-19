// Markdown -> HTML. Each line of the pipeline below is one transformation;
// to change how posts render, this is the place.

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeMathjax from "rehype-mathjax/svg";
import rehypeStringify from "rehype-stringify";
import GithubSlugger from "github-slugger";
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";
import { rehypeCitations } from "./citations.mjs";

/** id="..." on headings, so you can link to #a-section. */
function rehypeHeadingIds() {
  return (tree) => {
    const slugger = new GithubSlugger();
    visit(tree, "element", (node) => {
      if (/^h[1-6]$/.test(node.tagName) && !node.properties.id)
        node.properties.id = slugger.slug(toString(node));
    });
  };
}

/**
 * Images: hands every local <img src> to `resolveImage`, which copies/optimizes
 * the file and returns its public URL (plus size, to avoid layout shift).
 */
function rehypeImages({ resolveImage }) {
  return async (tree, file) => {
    const imgs = [];
    visit(tree, "element", (node) => {
      if (node.tagName === "img" && !/^(https?:|data:)/.test(node.properties.src ?? "")) imgs.push(node);
    });
    for (const img of imgs) {
      const res = await resolveImage(img.properties.src, file.path);
      if (!res) {
        file.message(`image not found: ${img.properties.src}`);
        continue;
      }
      img.properties.src = res.url;
      if (res.width) Object.assign(img.properties, { width: res.width, height: res.height });
      img.properties.loading = "lazy";
      img.properties.decoding = "async";
    }
  };
}

export function createRenderer({ root, config, resolveImage }) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSmartypants) // "quotes" -> “quotes”, -- -> –
    .use(remarkMath) // $...$ and $$...$$
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw) // keep inline HTML written in posts
    .use(rehypeHeadingIds)
    .use(rehypeImages, { resolveImage })
    .use(rehypeCitations, { root, ...config.citations })
    .use(rehypeMathjax, config.mathjax)
    .use(rehypeStringify);

  return async function render(markdown, { path, frontmatter }) {
    const file = await processor.process({ value: markdown, path, data: { frontmatter } });
    for (const m of file.messages) console.warn(`  ! ${path}: ${m.reason}`);
    return String(file);
  };
}
