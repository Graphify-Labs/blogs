import { describe, expect, it } from "vitest";
import { lintContent } from "../scripts/check-content.mjs";

const post = (body: string, extra = "") => `---
title: A note
description: A note.
date: "2026-10-02"
imgThumb: thumb.png
${extra}---

${body}
`;
const rules = (raw: string) => lintContent("2026-10-02-a-note.mdx", raw).map((f) => f.rule);

describe("content checks", () => {
  it("passes a clean post", () => {
    expect(rules(post("Plain text. Run `$graphify` in Codex or `/graphify` in Claude Code."))).toEqual([]);
  });
  it("flags mojibake and a BOM", () => {
    expect(rules(post("Star it â­"))).toContain("mojibake");
    expect(rules(post("bad \ufffd"))).toContain("mojibake");
    expect(rules("\ufeff" + post("ok"))).toContain("bom");
  });
  it("flags the cover repeated in the body", () => {
    expect(rules(post("![Cover](thumb.png)"))).toContain("cover-in-body");
    expect(rules(post("![Diagram](diagram.png)"))).toEqual([]);
  });
  it("flags a bold emoji button", () => {
    expect(rules(post("**[⭐ Star on GitHub](https://github.com/safishamsi/graphify)**"))).toContain("emoji-button");
    expect(rules(post("If it helps, [star it on GitHub](https://github.com/safishamsi/graphify)."))).toEqual([]);
  });
  it("flags /graphify for Codex without the $graphify note", () => {
    expect(rules(post("In Codex, type /graphify ."))).toContain("codex-command");
    expect(rules(post("See github.com/safishamsi/graphify for Codex."))).toEqual([]);
  });
  it("flags a canonical that is not graphify.com", () => {
    expect(rules(post("ok", "canonical: https://dev.to/x\n"))).toContain("canonical");
    expect(rules(post("ok", "canonical: https://graphify.com/blog/a-note\n"))).toEqual([]);
  });
});
