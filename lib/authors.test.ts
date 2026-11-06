import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseRemovals, removedAuthorIds } from "./author-removals.mjs";
import { authorAvatarUrl, loadAuthors, parsePost } from "./posts";

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

  it("keeps a custom portrait and rejects a bad one", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "authors-"));
    const file = path.join(dir, "authors.json");
    fs.writeFileSync(file, JSON.stringify({
      ada: { name: "Ada", github: "ada", author_image_url: "https://example.com/ada.png" },
    }));
    const ada = loadAuthors(file).ada!;
    expect(ada.author_image_url).toBe("https://example.com/ada.png");
    expect(authorAvatarUrl(ada)).toBe("https://example.com/ada.png");

    const bad = (url: string) => {
      fs.writeFileSync(file, JSON.stringify({ ada: { name: "Ada", author_image_url: url } }));
      expect(() => loadAuthors(file)).toThrow(/author_image_url/);
    };
    bad("http://example.com/ada.png");
    bad("https://graphify.net/ada.png");
    bad("/images/ada.png");
    bad("/authors/../secret.png");
  });

  it("accepts the Bruce portrait file without adding him to the registry", () => {
    const bytes = fs.readFileSync(path.join(process.cwd(), "public", "authors", "bruce.png"));
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16)).toBe(500);
    expect(bytes.readUInt32BE(20)).toBe(500);
    expect(loadAuthors().bruce).toBeUndefined();

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "authors-"));
    const file = path.join(dir, "authors.json");
    fs.writeFileSync(file, JSON.stringify({
      bruce: { name: "Bruce Wang", github: "batmany13", author_image_url: "/authors/bruce.png" },
    }));
    const bruce = loadAuthors(file).bruce!;
    expect(bruce.author_image_url).toBe("/authors/bruce.png");
    expect(authorAvatarUrl(bruce)).toBe("/authors/bruce.png");
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
