import { describe, expect, it } from "vitest";
import { changedPosts, isLive, selectPosts, sitemapEntries } from "../scripts/indexnow.mjs";

const today = "2026-10-04";
const frontMatter: Record<string, { updated?: string }> = {
  "posts/2026-10-04-new-post.mdx": {},
  "posts/2026-07-13-old-post.mdx": {},
  "posts/2026-07-07-refreshed.mdx": { updated: "2026-10-04" },
  "posts/2026-10-20-scheduled.mdx": {},
  "posts/2026-07-01-renamed.mdx": {},
};
const read = (file: string) => frontMatter[file] ?? {};

describe("indexnow", () => {
  it("reads added, renamed, and changed posts, and skips deleted ones and other files", () => {
    const rows = changedPosts(
      [
        "A\tposts/2026-10-04-new-post.mdx",
        "M\tposts/2026-07-13-old-post.mdx",
        "R087\tposts/2026-07-01-before.mdx\tposts/2026-07-01-renamed.mdx",
        "D\tposts/2026-06-01-gone.mdx",
        "M\tCONTRIBUTING.md",
      ].join("\n"),
    );
    expect(rows).toEqual([
      { file: "posts/2026-10-04-new-post.mdx", added: true },
      { file: "posts/2026-07-13-old-post.mdx", added: false },
      { file: "posts/2026-07-01-renamed.mdx", added: true },
    ]);
  });

  it("sends new posts and refreshed posts on a push, not typo fixes or posts dated later", () => {
    const rows = [
      { file: "posts/2026-10-04-new-post.mdx", added: true },
      { file: "posts/2026-07-13-old-post.mdx", added: false },
      { file: "posts/2026-07-07-refreshed.mdx", added: false },
      { file: "posts/2026-10-20-scheduled.mdx", added: true },
    ];
    expect(selectPosts({ rows, read, today, push: true })).toEqual([
      { slug: "new-post", url: "https://graphify.com/blog/new-post", lastmod: "2026-10-04" },
      { slug: "refreshed", url: "https://graphify.com/blog/refreshed", lastmod: "2026-10-04" },
    ]);
  });

  it("sends only posts dated or refreshed today on the daily run", () => {
    const rows = Object.keys(frontMatter).map((file) => ({ file, added: false }));
    expect(selectPosts({ rows, read, today, push: false }).map((post: { slug: string }) => post.slug)).toEqual([
      "new-post",
      "refreshed",
    ]);
  });

  it("waits for the sitemap to show the new build", () => {
    const xml = `<urlset><url>
<loc>https://graphify.com/blog/new-post</loc>
<lastmod>2026-10-04T00:00:00.000Z</lastmod>
</url><url>
<loc>https://graphify.com/blog/refreshed</loc>
<lastmod>2026-07-07T00:00:00.000Z</lastmod>
</url></urlset>`;
    const entries = sitemapEntries(xml);
    expect(isLive({ url: "https://graphify.com/blog/new-post", lastmod: "2026-10-04" }, entries)).toBe(true);
    expect(isLive({ url: "https://graphify.com/blog/refreshed", lastmod: "2026-10-04" }, entries)).toBe(false);
    expect(isLive({ url: "https://graphify.com/blog/missing", lastmod: "2026-10-04" }, entries)).toBe(false);
  });
});
