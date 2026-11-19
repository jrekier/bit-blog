// Social preview images (1200×630 PNG) for link cards on Bluesky, Mastodon, etc.
// The design is the SVG below; edit it like any SVG. resvg turns it into a PNG.

import { Resvg } from "@resvg/resvg-js";
import { esc } from "./templates.mjs";

/** Greedy word wrap. Inter averages ~0.53em per character. */
function wrap(text, fontSize, width, maxLines) {
  const perLine = Math.floor(width / (fontSize * 0.53));
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line + " " + word).trim().length > perLine && line) {
      lines.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return lines;
}

export function ogSvg({ title, description, siteTitle }) {
  const pad = 80;
  const t = wrap(title, 72, 1200 - 2 * pad, 3);
  const d = wrap(description ?? "", 34, 1200 - 2 * pad, 4);
  const tY = 170;
  const dY = tY + t.length * 86 + 30;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0a0a"/>
      <stop offset="0.6" stop-color="#0a0a0a"/>
      <stop offset="1" stop-color="#083344"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="8" fill="#0891b2"/>
  <g font-family="Inter" font-weight="600" font-size="72" fill="#06b6d4">
    ${t.map((l, i) => `<text x="${pad}" y="${tY + i * 86}">${esc(l)}</text>`).join("\n    ")}
  </g>
  <g font-family="Inter" font-size="34" fill="#e5e5e5">
    ${d.map((l, i) => `<text x="${pad}" y="${dY + i * 48}">${esc(l)}</text>`).join("\n    ")}
  </g>
  <text x="${pad}" y="${630 - pad + 20}" font-family="Inter" font-size="28" fill="#a3a3a3">${esc(siteTitle)}</text>
</svg>`;
}

export function ogPng(data, fontFile) {
  return new Resvg(ogSvg(data), {
    font: { fontFiles: [fontFile], loadSystemFonts: false, defaultFontFamily: "Inter" },
  })
    .render()
    .asPng();
}
