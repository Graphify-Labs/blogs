import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const file = path.join(process.cwd(), "posts", "2026-11-06-agents-took-over-your-sdlc.mdx");

/** Inline links, including destinations that escape parentheses. */
export function markdownLinks(text: string): { anchor: string; url: string }[] {
  const links: { anchor: string; url: string }[] = [];
  const pattern = /\[((?:\\.|[^\]])+)\]\(((?:\\.|[^)])+)\)/g;
  for (const match of text.matchAll(pattern)) {
    links.push({
      anchor: match[1].replace(/\\(.)/g, "$1"),
      url: match[2].replace(/\\(.)/g, "$1"),
    });
  }
  return links;
}

/** GFM tables as rows of cells. A separator row is only dashes, colons, and pipes. */
export function markdownTables(text: string): string[][][] {
  const tables: string[][][] = [];
  let rows: string[][] = [];
  const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const isRule = (line: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line.trim());
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) {
      if (rows.length) tables.push(rows);
      rows = [];
      continue;
    }
    rows.push(cells(line));
    if (isRule(line) && rows.length === 1) {
      // A rule cannot be the only row. Keep collecting.
    }
  }
  if (rows.length) tables.push(rows);
  return tables;
}

const original = [
  ["study of 2,135 open-source AI repositories", "https://www.alphaxiv.org/abs/2610.10064"],
  ["replaced Git", "https://www.anthropic.com/engineering/redesigning-source-control"],
  ["Margaret-Anne Storey", "https://www.alphaxiv.org/abs/2603.22106"],
  ["Microsoft Research", "https://www.alphaxiv.org/abs/2610.10610"],
  ["randomized trial at Anthropic", "https://www.alphaxiv.org/abs/2601.20245"],
  ["Google DeepMind experiment", "https://www.alphaxiv.org/abs/2610.01518"],
  ["History: The Agile Manifesto", "https://agilemanifesto.org/history.html"],
  ["Redesigning source control at Anthropic", "https://www.anthropic.com/engineering/redesigning-source-control"],
  ["Ironies of Automation", "https://doi.org/10.1016/0005-1098(83)90046-8"],
  ["Code Understanding is a Bottleneck for Coding Agents", "https://www.alphaxiv.org/abs/2610.10610"],
  ["Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity", "https://arxiv.org/abs/2507.09089"],
  ["Comprehension Audits to Mitigate Risks from Automated AI Research", "https://www.alphaxiv.org/abs/2610.10064"],
  ["Tracking Every Release", "https://www.etsy.com/codeascraft/track-every-release"],
  ["The WyCash Portfolio Management System", "https://doi.org/10.1145/157709.157715"],
  ["The State of Log Management 2026", "https://www.dynatrace.com/news/press-release/the-state-of-log-management-2026/"],
  ["Design and Code Inspections to Reduce Errors in Program Development", "https://doi.org/10.1147/sj.153.0182"],
  ["Announcing the 2025 DORA report", "https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report"],
  ["Metacognitive Scaffolds Create Productive Friction for AI-Assisted Knowledge Work", "https://arxiv.org/abs/2610.30945"],
  ["Measuring AI Ability to Complete Long Software Tasks", "https://arxiv.org/abs/2503.14499"],
  ["Designing Against Deskilling: Metacognitive Feedback Reduces Cognitive Offloading to LLM Assistants", "https://arxiv.org/abs/2609.20143"],
  ["Git at any scale", "https://cursor.com/blog/git-at-any-scale"],
  ["SCRUM Development Process", "https://www.cse.chalmers.se/~feldt/courses/agile/schwaber_1995_scrum_dev_process.pdf"],
  ["Human–AI Collaboration at Scale", "https://www.alphaxiv.org/abs/2608.human-ai-collaboration-at-scale"],
  ["Enabling independent research on how people use Claude", "https://www.anthropic.com/research/enabling-independent-research"],
  ["How AI Impacts Skill Formation", "https://www.alphaxiv.org/abs/2601.20245"],
  ["Cursor acquires AI code review startup Graphite", "https://siliconangle.com/2025/12/19/cursor-acquires-ai-code-review-startup-graphite/"],
  ["From Technical Debt to Cognitive and Intent Debt: Rethinking Software Health in the Age of AI", "https://www.alphaxiv.org/abs/2603.22106"],
  ["Who Thinks First? Designing Productive Friction with Engage-to-Unlock GenAI", "https://www.alphaxiv.org/abs/2610.01518"],
  ['Product Manager Practices for Delegating Work to Generative AI: "Accountability must not be delegated to non-human actors"', "https://arxiv.org/abs/2510.02504"],
  ["Attention Is All You Need", "https://arxiv.org/abs/1706.03762"],
  ["Does AI Make the Agile Manifesto Obsolete?", "https://www.infoq.com/news/2026/02/ai-agile-manifesto-debate"],
] as const;

describe("SDLC source links", () => {
  const raw = fs.readFileSync(file, "utf8");
  const body = raw.split("---").slice(2).join("---");
  const links = markdownLinks(body);

  it("keeps every original anchor and destination", () => {
    for (const [anchor, url] of original) {
      expect(links, anchor).toContainEqual({ anchor, url });
    }
  });

  it("keeps the Graphify glossary links", () => {
    expect(links).toEqual(expect.arrayContaining([
      { anchor: "code knowledge graph", url: "https://graphify.com/glossary/knowledge-graph" },
      { anchor: "MCP", url: "https://graphify.com/glossary/mcp-server" },
      { anchor: "Impact analysis", url: "https://graphify.com/glossary/blast-radius" },
    ]));
  });

  it("parses both tables with a plain separator and matching columns", () => {
    const tables = markdownTables(body);
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table.length).toBeGreaterThan(2);
      const width = table[0].length;
      expect(table[1].every((cell) => /^:?-{3,}:?$/.test(cell))).toBe(true);
      for (const row of table) expect(row).toHaveLength(width);
    }
    expect(tables[0][0]).toEqual(["Stage", "Built for people", "What's buckling", "Whose attention runs out"]);
    expect(tables[1][0][1]).toBe("Supervisor (v1)");
    expect(tables[1][0][2]).toBe("Collaborator (v2)");
    expect(body).not.toContain(":----");
  });
});
