// Citations from your Zotero library.
//
// How it works:
//   1. Zotero (with the Better BibTeX add-on) auto-exports your library, or a
//      collection, to src/references.bib (or src/references.json for CSL-JSON).
//   2. In a post you write Pandoc-style citations:
//        [@einstein1905]             -> (Einstein, 1905)
//        [@einstein1905, p. 3]       -> (Einstein, 1905, p. 3)
//        [@a2020; @b2021]            -> several at once
//        @einstein1905 showed that   -> Einstein (1905) showed that
//        [-@einstein1905]            -> (1905), author suppressed
//   3. At build time, rehype-citation formats them with a CSL style and appends
//      a bibliography. Put [^ref] on its own line to choose where it goes.
//
// Per-post frontmatter overrides:
//   csl: chicago            # apa | vancouver | harvard1 | chicago | mla, or a path/URL to a .csl file
//   noCite: ["@key1"]       # list in the bibliography without citing in text ("@*" = everything)

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import rehypeCitation from "rehype-citation";
import { visit } from "unist-util-visit";
import { CITATIONS } from "../config.ts";

type Options = {
  style?: string;
};

/** Bibliography files that actually exist, so the build works before Zotero is set up. */
function findBibliographies(): string[] {
  return CITATIONS.BIBLIOGRAPHY.filter((p) => existsSync(resolve(p)));
}

/**
 * Wraps rehype-citation so that:
 *  - the default style comes from config.ts but a post's `csl:` frontmatter wins
 *  - citation keys that aren't in your library produce a build warning instead
 *    of silently staying as "[@key]" text
 *  - the bibliography gets a "References" heading
 */
export function rehypeCitations(opts: Options = {}) {
  return async function transformer(tree: any, file: any) {
    const bibliography = findBibliographies();
    if (bibliography.length === 0) return;

    const fm = file.data?.astro?.frontmatter ?? {};
    const run = (rehypeCitation as any)({
      bibliography, // relative to `path`
      path: process.cwd(),
      csl: fm.csl ?? opts.style ?? CITATIONS.STYLE,
      linkCitations: true,
      showTooltips: true,
    });
    await run(tree, file);

    // Warn about citations that weren't resolved.
    visit(tree, "text", (node: any, _i, parent: any) => {
      if (parent?.tagName === "code" || parent?.tagName === "pre") return;
      const missing = node.value.match(/\[-?@[\w:./-]+[^\]]*\]/g);
      if (missing) {
        console.warn(
          `[citations] ${file.path ?? "unknown file"}: not found in your Zotero export: ${missing.join(", ")}`,
        );
      }
    });

    // rehype-citation double-escapes entities in tooltips ("&#38;" shows up literally).
    visit(tree, "element", (node: any) => {
      const t = node.properties?.title;
      if (typeof t === "string" && t.includes("&#"))
        node.properties.title = t.replace(/&#(\d+);/g, (_, n) =>
          String.fromCharCode(Number(n)),
        );
    });

    // Add a heading above the bibliography.
    visit(tree, "element", (node: any, index, parent: any) => {
      if (node.properties?.id !== "refs" || !parent || index === undefined)
        return;
      const prev = parent.children
        .slice(0, index)
        .reverse()
        .find((n: any) => n.type === "element");
      if (prev && /^h[1-6]$/.test(prev.tagName)) return;
      parent.children.splice(index, 0, {
        type: "element",
        tagName: "h2",
        properties: { id: "references" },
        children: [{ type: "text", value: CITATIONS.HEADING }],
      });
      return index + 2;
    });
  };
}
