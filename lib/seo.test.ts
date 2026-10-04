import { describe, expect, it } from "vitest";
import { keyTerms, lintPost } from "../scripts/check-seo.mjs";

const filler = Array.from({ length: 320 }, (_, i) => `word${i}`).join(" ");

const post = (body: string, extra = "") => `---
title: How to give Cursor a code knowledge graph
description: Four commands give Cursor a code knowledge graph of your codebase, so it queries structure instead of grepping.
date: "2026-10-02"
keyword: cursor code knowledge graph
imgThumb: thumb.png
authors:
  - fahad
categories:
  - guides
${extra}---

Cursor answers questions about a code knowledge graph instead of grepping. ${filler}

See the [Cursor integration](https://graphify.com/integrations/cursor) and the [glossary](/glossary/knowledge-graph).

${body}
`;

const file = "2026-10-02-how-to-give-cursor-a-code-knowledge-graph.mdx";
const messages = (raw: string, level: "error" | "warning") =>
  lintPost(file, raw)
    .filter((finding: { level: string }) => finding.level === level)
    .map((finding: { message: string }) => finding.message);

describe("search checks", () => {
  it("passes a post that follows the guide", () => {
    expect(lintPost(file, post("## How the Cursor graph answers\n\nText.\n\n### Install\n\nMore."))).toEqual([]);
  });

  it("keeps the title as the only H1 and the headings in order", () => {
    expect(messages(post("# Another title\n\nText."), "error")).toEqual(["The title is the page's only H1. Start sections at ##."]);
    expect(messages(post("## Cursor setup\n\n#### Too deep"), "error")).toEqual([
      "This #### skips a level. Go one step at a time: ## then ###.",
    ]);
  });

  it("ignores lines inside code blocks", () => {
    expect(messages(post("## Cursor setup\n\n```bash\n# not a heading\n![](x.png)\n```"), "error")).toEqual([]);
  });

  it("needs words for every image", () => {
    expect(messages(post("## Cursor setup\n\n![](graph.png)"), "error")).toEqual([
      "Describe the image for readers who cannot see it: ![what it shows](file.png).",
    ]);
  });

  it("rejects the look-alike site and the wrong package, even in code", () => {
    const errors = messages(post("## Cursor setup\n\n[site](https://graphify.net)\n\n```bash\npip install graphify\n```"), "error");
    expect(errors).toEqual(["graphify.net is not Graphify. Link graphify.com instead.", "The PyPI package is graphifyy, with two y's."]);
    expect(messages(post("## Cursor setup\n\n```bash\nuv tool install graphifyy\npip install graphify-extra\n```"), "error")).toEqual([]);
  });

  it("warns on length, links, cover, and a missing phrase", () => {
    const raw = `---
title: A title that keeps going well past the point where a search result would cut it off
description: Too short.
date: "2026-10-02"
authors:
  - fahad
categories:
  - guides
---

## Notes

Read [here](https://example.com).
`;
    const warnings = messages(raw, "warning").join("\n");
    expect(warnings).toMatch(/title is 83 characters/);
    expect(warnings).toMatch(/description is 10 characters/);
    expect(warnings).toMatch(/has \d+ words/);
    expect(warnings).toMatch(/links 0 graphify.com pages/);
    expect(warnings).toMatch(/no cover/);
    expect(warnings).toMatch(/Add keyword/);
    expect(warnings).toMatch(/"here" does not say where the link goes/);
  });

  it("names every place the phrase is missing", () => {
    const raw = post("## Setup\n\nText.").replace("keyword: cursor code knowledge graph", "keyword: windsurf memory");
    expect(messages(raw, "warning")).toEqual([
      '"windsurf memory" is missing from the title, the description, the first 100 words, the URL, every heading.',
    ]);
  });

  it("reads the phrase as its meaningful words", () => {
    expect(keyTerms("How to give Cursor a code knowledge graph")).toEqual(["give", "cursor", "code", "knowledge", "graph"]);
  });
});
