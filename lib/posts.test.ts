import { describe, expect, it } from "vitest";
import { getPosts, loadAuthors, parsePost } from "./posts";
import type { Author } from "./posts";

const authors: Record<string, Author> = {
  safi: { name: "Safi Shamsi", role: "Founder" },
};

const raw = `---
title: A note
description: What the note is about.
date: "2026-10-02"
authors:
  - safi
categories:
  - guides
  - concepts
tags:
  - graph
imgThumb: thumb.png
---

The body of the note.
`;

describe("authors.json", () => {
  it("loads the registry", () => {
    const registry = loadAuthors();
    expect(registry.safi?.name).toBe("Safi Shamsi");
  });

  it("keeps every x handle usable as a handle", () => {
    for (const [id, person] of Object.entries(loadAuthors())) {
      if (person.x) expect(person.x, id).toMatch(/^[A-Za-z0-9_]{1,15}$/);
    }
    expect(loadAuthors().fahad?.x).toBe("fahad_developer");
    expect(loadAuthors().fahad?.linkedin).toBe("syedfahads");
  });

  it("keeps every github handle usable as a handle", () => {
    for (const [id, person] of Object.entries(loadAuthors())) {
      if (person.github) expect(person.github, id).toMatch(/^[\w-]+$/);
    }
  });
});

describe("posts/", () => {
  it("every file parses", () => {
    expect(() => getPosts()).not.toThrow();
  });
});

describe("parsePost", () => {
  it("strips the date prefix to make the slug", () => {
    const post = parsePost("2026-10-02-a-note.mdx", raw, authors);
    expect(post.slug).toBe("a-note");
    expect(post.date).toBe("2026-10-02");
    expect(post.categories).toEqual(["guides", "concepts"]);
    expect(post.authors).toEqual(["safi"]);
    expect(post.imgThumb).toBe("thumb.png");
    expect(post.body).toBe("The body of the note.");
  });

  it("rejects a date that does not match the filename", () => {
    expect(() => parsePost("2026-01-01-a-note.mdx", raw, authors)).toThrow(/date must be 2026-01-01/);
  });

  it("rejects an unknown author", () => {
    const unknown = raw.replace("safi", "nobody");
    expect(() => parsePost("2026-10-02-a-note.mdx", unknown, authors)).toThrow(/unknown author/);
  });

  it("rejects a tag that is not a lowercase slug", () => {
    const shouted = raw.replace("  - graph", "  - Cursor");
    expect(() => parsePost("2026-10-02-a-note.mdx", shouted, authors)).toThrow(/lowercase slug/);
    expect(() => parsePost("2026-10-02-tags.mdx", raw, authors)).toThrow(/reserved/);
  });

  it("allows three authors and rejects a fourth", () => {
    const roster: Record<string, Author> = {
      safi: { name: "Safi Shamsi" },
      b: { name: "B" },
      c: { name: "C" },
      d: { name: "D" },
    };
    const three = raw.replace("  - safi", "  - safi\n  - b\n  - c");
    expect(parsePost("2026-10-02-a-note.mdx", three, roster).authors).toEqual(["safi", "b", "c"]);
    const four = three.replace("  - c", "  - c\n  - d");
    expect(() => parsePost("2026-10-02-a-note.mdx", four, roster)).toThrow(/at most three/);
  });

  it("rejects an import or script in the body", () => {
    const withImport = raw.replace("The body of the note.", "import x from 'y';\n\nThe body of the note.");
    expect(() => parsePost("2026-10-02-a-note.mdx", withImport, authors)).toThrow(/markdown only/);
    const withScript = raw.replace("The body of the note.", "<script>alert(1)</script>\n\nThe body of the note.");
    expect(() => parsePost("2026-10-02-a-note.mdx", withScript, authors)).toThrow(/markdown only/);
  });

  it("rejects a path in an image field", () => {
    const nested = raw.replace("thumb.png", "../secret.png");
    expect(() => parsePost("2026-10-02-a-note.mdx", nested, authors)).toThrow(/relative file name/);
  });

  it("rejects an unknown category and a reserved slug", () => {
    const badCategory = raw.replace("guides", "news");
    expect(() => parsePost("2026-10-02-a-note.mdx", badCategory, authors)).toThrow(/unknown category/);
    expect(() => parsePost("2026-10-02-categories.mdx", raw, authors)).toThrow(/reserved/);
  });
});
