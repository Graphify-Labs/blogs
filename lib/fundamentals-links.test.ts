import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function markdownLinks(text: string): { anchor: string; url: string }[] {
  const links: { anchor: string; url: string }[] = [];
  for (const match of text.matchAll(/\[((?:\\.|[^\]])+)\]\(((?:\\.|[^)])+)\)/g)) {
    links.push({
      anchor: match[1].replace(/\\(.)/g, "$1"),
      url: match[2].replace(/\\(.)/g, "$1"),
    });
  }
  return links;
}

const file = path.join(process.cwd(), "posts", "2026-11-06-fundamentals-matter.mdx");

const original = [
  ['"Critical thinking when agents do the work"', "https://x.com/addyosmani/status/2117512471930167377"],
  ["a paper published earlier this year", "https://papers.ssrn.com/abstract=6097646"],
  ["MIT's committee on AI in teaching", "https://bpb-us-e1.wpmucdn.com/sites.mit.edu/dist/d/2418/files/2026/09/AI-Committee-Final-Report-Aug-13.pdf"],
  ["At Maryland", "https://www.alphaxiv.org/abs/2607.26375"],
  ["the paradox of supervision", "https://www.anthropic.com/research/how-ai-is-transforming-work-at-anthropic"],
] as const;

describe("Fundamentals source links", () => {
  const raw = fs.readFileSync(file, "utf8");
  const matter = raw.split("---");
  const body = matter.slice(2).join("---");
  const links = markdownLinks(body);

  it("keeps the November 6 date", () => {
    expect(matter[1]).toContain('date: "2026-11-06"');
    expect(file).toContain("2026-11-06-fundamentals-matter.mdx");
  });

  it("keeps every original anchor and destination", () => {
    for (const [anchor, url] of original) {
      expect(links, anchor).toContainEqual({ anchor, url });
    }
  });

  it("keeps the Graphify glossary links and has no table", () => {
    expect(links).toEqual(expect.arrayContaining([
      { anchor: "knowledge graphs", url: "https://graphify.com/glossary/knowledge-graph" },
      { anchor: "set review depth by what a change touches", url: "https://graphify.com/glossary/blast-radius" },
    ]));
    expect(body.split("\n").some((line) => line.trim().startsWith("|"))).toBe(false);
  });
});
