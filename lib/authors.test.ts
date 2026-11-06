import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseRemovals, removedAuthorIds } from "./author-removals.mjs";
import { authorAvatarUrl, authorImageRepoFile, loadAuthors, parsePost } from "./posts";

const head = (authors: string) => `---
title: A note
description: What the note is about.
date: "2026-10-02"
authors:
${authors}
categories:
  - guides
---

Body.
`;

describe("author references", () => {
  const registry = { safi: { name: "Safi Shamsi" } };

  it("rejects a missing author list and an unknown id", () => {
    const noList = head("  - safi").replace("authors:\n  - safi\n", "");
    expect(() => parsePost("2026-10-02-a-note.mdx", noList, registry)).toThrow(/authors/);
    expect(() => parsePost("2026-10-02-a-note.mdx", head("  - nobody"), registry)).toThrow(/unknown author/);
  });
});

describe("author_image_url", () => {
  it("falls back to the GitHub avatar when the portrait is omitted", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "authors-"));
    const file = path.join(dir, "authors.json");
    fs.writeFileSync(file, JSON.stringify({ ada: { name: "Ada", github: "ada" } }));
    const ada = loadAuthors(file).ada;
    expect(ada?.author_image_url).toBeUndefined();
    expect(authorAvatarUrl(ada!)).toBe("https://avatars.githubusercontent.com/ada");
    expect(authorAvatarUrl({ name: "No picture" })).toBeUndefined();
  });

  it("keeps a graphify.com portrait and rejects anything else", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "authors-"));
    const file = path.join(dir, "authors.json");
    const portrait = "/images/blog/authors/bruce.png";
    const repoFile = path.join(process.cwd(), "public", "images", "authors", "bruce.png");
    fs.writeFileSync(file, JSON.stringify({
      ada: { name: "Ada", github: "ada", author_image_url: portrait },
    }));
    const ada = loadAuthors(file).ada!;
    expect(ada.author_image_url).toBe(portrait);
    expect(authorAvatarUrl(ada)).toBe(portrait);
    expect(authorImageRepoFile(portrait)).toBe(repoFile);
    expect(authorImageRepoFile("https://graphify.com/images/blog/authors/bruce.png")).toBe(repoFile);
    expect(authorImageRepoFile("https://www.graphify.com/images/blog/authors/bruce.png")).toBe(repoFile);

    const httpsPortrait = "https://www.graphify.com/images/blog/authors/bruce.png";
    fs.writeFileSync(file, JSON.stringify({ ada: { name: "Ada", github: "ada", author_image_url: httpsPortrait } }));
    expect(authorAvatarUrl(loadAuthors(file).ada!)).toBe(httpsPortrait);

    const bad = (url: string) => {
      fs.writeFileSync(file, JSON.stringify({ ada: { name: "Ada", author_image_url: url } }));
      expect(() => loadAuthors(file)).toThrow(/author_image_url/);
    };
    bad("https://example.com/ada.png");
    bad("http://graphify.com/images/blog/authors/bruce.png");
    bad("https://graphify.net/images/blog/authors/bruce.png");
    bad("/authors/bruce.png");
    bad("/images/blog/../secret.png");
    bad("https://graphify.com/images/blog/authors/missing.png");
  });

  it("uses the supplied Bruce portrait at the published blog path", () => {
    const bytes = fs.readFileSync(path.join(process.cwd(), "public", "images", "authors", "bruce.png"));
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16)).toBe(500);
    expect(bytes.readUInt32BE(20)).toBe(500);
    const bruce = loadAuthors().bruce;
    expect(bruce?.name).toBe("Bruce Wang");
    expect(bruce?.author_image_url).toBe("/images/blog/authors/bruce.png");
    expect(authorAvatarUrl(bruce!)).toBe("/images/blog/authors/bruce.png");
  });
});

describe("existing authors", () => {
  const before = { safi: { name: "Safi" }, fahad: { name: "Fahad" } };

  it("allows edits and new ids, and blocks a deletion unless it is listed", () => {
    expect(removedAuthorIds(before, { safi: { name: "Safi Shamsi" }, fahad: { name: "Fahad" }, ada: { name: "Ada" } }, [])).toEqual([]);
    expect(removedAuthorIds(before, { fahad: { name: "Fahad" } }, [])).toEqual(["safi"]);
    expect(removedAuthorIds(before, { fahad: { name: "Fahad" } }, parseRemovals("# on purpose\nsafi\n"))).toEqual([]);
    expect(() => parseRemovals("Safi\n")).toThrow(/author id/);
  });
});
