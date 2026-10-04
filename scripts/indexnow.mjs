import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";

/*
 * After graphify.com rebuilds, tell IndexNow (Bing, Yandex, and the engines
 * that share its index) which post URLs are new or refreshed, so they are
 * crawled in hours instead of whenever a crawler comes back. A push sends
 * posts it added, and posts it changed whose `date` or `updated` is today.
 * The daily run sends posts whose `date` or `updated` is today, which covers
 * posts scheduled for a later date. Nothing is sent until the live sitemap
 * lists the URL with the expected lastmod, so a crawler never finds the
 * old build.
 */

const HOST = "graphify.com";
// graphify.com serves this key at /<key>.txt from Graphifydesign's public/ folder; both must change together.
const KEY = "1569ab0a97ec0cead86f3e05006d039a";
const POST = /^posts\/(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/;
const ZERO = /^0+$/;

/** Rows of `git diff --name-status -M`: added, renamed, or changed post files. Deleted posts are skipped. */
export function changedPosts(nameStatus) {
  const rows = [];
  for (const line of nameStatus.split(/\r?\n/)) {
    const [status = "", ...paths] = line.split("\t");
    const file = paths.at(-1);
    if (!file || !POST.test(file) || status.startsWith("D")) continue;
    rows.push({ file, added: status.startsWith("A") || status.startsWith("R") });
  }
  return rows;
}

export function selectPosts({ rows, read, today, push }) {
  const picked = [];
  for (const { file, added } of rows) {
    const match = POST.exec(file);
    if (!match) continue;
    const [, date, slug] = match;
    const { updated } = read(file);
    const refreshed = typeof updated === "string" && updated === today;
    if (date > today) continue;
    if (push ? added || refreshed || date === today : refreshed || date === today) {
      picked.push({ slug, url: `https://${HOST}/blog/${slug}`, lastmod: typeof updated === "string" ? updated : date });
    }
  }
  return picked;
}

export function sitemapEntries(xml) {
  const entries = new Map();
  for (const match of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g)) {
    entries.set(match[1].trim(), (match[2] ?? "").trim());
  }
  return entries;
}

export function isLive(post, entries) {
  return entries.has(post.url) && entries.get(post.url).startsWith(post.lastmod);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const event = process.env.EVENT ?? "workflow_dispatch";
  const before = process.env.BEFORE ?? "";
  const after = process.env.AFTER ?? "HEAD";
  const today = new Date().toISOString().slice(0, 10);
  const push = event === "push" && before !== "" && !ZERO.test(before);
  const read = (file) => matter(fs.readFileSync(path.join(process.cwd(), file), "utf8")).data;

  const rows = push
    ? changedPosts(execFileSync("git", ["diff", "--name-status", "-M", before, after, "--", "posts/"], { encoding: "utf8" }))
    : fs.readdirSync(path.join(process.cwd(), "posts")).filter((name) => name.endsWith(".mdx")).map((name) => ({ file: `posts/${name}`, added: false }));
  const posts = selectPosts({ rows, read, today, push });
  if (posts.length === 0) {
    console.log("indexnow: no new or refreshed posts to send");
    return;
  }

  const deadline = Date.now() + Number(process.env.WAIT_MINUTES ?? 20) * 60_000;
  let waiting = posts;
  while (waiting.length > 0 && Date.now() < deadline) {
    const res = await fetch(`https://${HOST}/sitemap.xml`, { headers: { "Cache-Control": "no-cache" } });
    const entries = res.ok ? sitemapEntries(await res.text()) : new Map();
    waiting = waiting.filter((post) => !isLive(post, entries));
    if (waiting.length > 0) await sleep(30_000);
  }
  for (const post of waiting) console.log(`::warning::${post.url} was not live with lastmod ${post.lastmod} in time; not sent`);
  const live = posts.filter((post) => !waiting.includes(post));
  if (live.length === 0) return;

  const urlList = [...live.map((post) => post.url), `https://${HOST}/blog`];
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
  });
  if (res.status === 200 || res.status === 202) {
    console.log(`indexnow: sent ${urlList.length} URLs (${res.status})\n${urlList.join("\n")}`);
  } else {
    console.log(`::warning::IndexNow answered ${res.status} ${res.statusText}: ${await res.text()}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
