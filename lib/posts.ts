import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { isCategory, type Category } from "./categories";

export type Author = {
  name: string;
  role?: string;
  github?: string;
  x?: string;
  linkedin?: string;
};

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  keyword?: string;
  authors: string[];
  categories: Category[];
  tags: string[];
  imgSocial?: string;
  imgThumb?: string;
  /** Pins the post as the blog lead, whatever its date. At most one post sets it. */
  featured?: boolean;
  /** Question and answer pairs; the site emits them as FAQPage structured data. */
  faq?: Faq[];
  body: string;
};

export type Faq = { question: string; answer: string };

/** Today's date in India (UTC+5:30), the day graphify.com publishes on. */
export function todayIST(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/** A post is public from its date (IST). Until then it stays off every list, route, feed and sitemap. */
export function isPublished(post: Pick<Post, "date">, today = todayIST()): boolean {
  return post.date <= today;
}

function optionalFaq(value: unknown, label: string): Faq[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must be a list of { question, answer }`);
  return value.map((item, i) => {
    const q = (item as { question?: unknown })?.question;
    const a = (item as { answer?: unknown })?.answer;
    if (typeof q !== "string" || q.trim() === "" || typeof a !== "string" || a.trim() === "") {
      throw new Error(`${label} item ${i + 1} needs a question and an answer`);
    }
    return { question: q.trim(), answer: a.trim() };
  });
}

const RESERVED = new Set(["categories", "authors", "tags", "feed.xml"]);
const TAG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILENAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/;

export function loadAuthors(file = path.join(process.cwd(), "authors.json")): Record<string, Author> {
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("authors.json must be an object of id to { name, role }");
  }
  const authors: Record<string, Author> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`authors.json: ${id} must be an object`);
    }
    const name = (value as { name?: unknown }).name;
    const role = (value as { role?: unknown }).role;
    const github = (value as { github?: unknown }).github;
    const x = (value as { x?: unknown }).x;
    const linkedin = (value as { linkedin?: unknown }).linkedin;
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`authors.json: ${id} needs a name`);
    }
    if (role !== undefined && typeof role !== "string") {
      throw new Error(`authors.json: ${id} role must be a string`);
    }
    // graphify.com shows that handle's own GitHub picture, so no image lives here.
    if (github !== undefined && !/^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/.test(String(github))) {
      throw new Error(`authors.json: ${id} github must be a GitHub username`);
    }
    if (x !== undefined && !/^[A-Za-z0-9_]{1,15}$/.test(String(x))) {
      throw new Error(`authors.json: ${id} x must be an X handle`);
    }
    if (linkedin !== undefined && !/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){2,99}$/.test(String(linkedin))) {
      throw new Error(`authors.json: ${id} linkedin must be the slug after /in/`);
    }
    authors[id] = { name };
    if (role) authors[id].role = role;
    if (typeof github === "string") authors[id].github = github;
    if (typeof x === "string") authors[id].x = x;
    if (typeof linkedin === "string") authors[id].linkedin = linkedin;
  }
  return authors;
}

function asStringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error(`${label} must be a non-empty list of strings`);
  }
  return value;
}

function assertSafeBody(filename: string, body: string) {
  if (/^\s*(import|export)\s/m.test(body) || /<script[\s>]/i.test(body)) {
    throw new Error(`${filename}: posts are markdown only, with no imports or scripts`);
  }
}

function optionalDay(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  const day = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : undefined;
  if (!day || Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a quoted date, such as "2026-10-04"`);
  }
  return value as string;
}

function optionalText(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a phrase, such as "cursor code knowledge graph"`);
  return value.trim();
}

function optionalFile(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "" || value.startsWith("/") || value.includes("..")) {
    throw new Error(`${label} must be a relative file name, such as thumb.png`);
  }
  return value;
}

export function parsePost(filename: string, raw: string, authors: Record<string, Author>): Post {
  const match = FILENAME.exec(filename);
  if (!match) {
    throw new Error(`${filename}: name posts YYYY-MM-DD-slug.mdx`);
  }
  const [, fileDate, slug] = match;
  if (RESERVED.has(slug)) {
    throw new Error(`${filename}: "${slug}" is reserved`);
  }

  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const title = data.title;
  const description = data.description;
  const date = data.date;
  if (typeof title !== "string" || title.trim() === "") throw new Error(`${filename}: title is required`);
  if (typeof description !== "string" || description.trim() === "") {
    throw new Error(`${filename}: description is required`);
  }
  if (typeof date !== "string" || date !== fileDate) {
    throw new Error(`${filename}: date must be ${fileDate}`);
  }
  const updated = optionalDay(data.updated, `${filename}: updated`);
  if (updated && updated < date) throw new Error(`${filename}: updated must be on or after ${date}`);

  const authorIds = asStringList(data.authors, `${filename}: authors`);
  if (authorIds.length > 3) throw new Error(`${filename}: a post has at most three authors`);
  for (const id of authorIds) {
    if (!authors[id]) throw new Error(`${filename}: unknown author "${id}"`);
  }

  const categories = asStringList(data.categories, `${filename}: categories`);
  for (const category of categories) {
    if (!isCategory(category)) throw new Error(`${filename}: unknown category "${category}"`);
  }

  const tags = data.tags === undefined || (Array.isArray(data.tags) && data.tags.length === 0)
    ? []
    : asStringList(data.tags, `${filename}: tags`);
  const seenTags = new Set<string>();
  for (const tag of tags) {
    if (!TAG.test(tag)) throw new Error(`${filename}: tag "${tag}" must be a lowercase slug, such as mcp`);
    if (seenTags.has(tag)) throw new Error(`${filename}: duplicate tag "${tag}"`);
    seenTags.add(tag);
  }
  assertSafeBody(filename, parsed.content);
  if (data.featured !== undefined && typeof data.featured !== "boolean") {
    throw new Error(`${filename}: featured must be true or false`);
  }

  return {
    slug,
    title,
    description,
    date,
    updated,
    keyword: optionalText(data.keyword, `${filename}: keyword`),
    authors: authorIds,
    categories: categories as Category[],
    tags,
    imgSocial: optionalFile(data.imgSocial, `${filename}: imgSocial`),
    imgThumb: optionalFile(data.imgThumb, `${filename}: imgThumb`),
    ...(data.featured === true ? { featured: true } : {}),
    ...(data.faq !== undefined ? { faq: optionalFaq(data.faq, `${filename}: faq`) } : {}),
    body: parsed.content.trim(),
  };
}

export function getPosts(dir = path.join(process.cwd(), "posts")): Post[] {
  const authors = loadAuthors();
  if (!fs.existsSync(dir)) return [];
  const posts = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".mdx"))
    .map((filename) => {
      const post = parsePost(filename, fs.readFileSync(path.join(dir, filename), "utf8"), authors);
      for (const file of [post.imgSocial, post.imgThumb]) {
        if (!file) continue;
        const image = path.join(process.cwd(), "public", "images", post.slug, file);
        if (!fs.existsSync(image)) throw new Error(`${filename}: missing public/images/${post.slug}/${file}`);
      }
      return post;
    });
  const seen = new Set<string>();
  for (const post of posts) {
    if (seen.has(post.slug)) throw new Error(`Duplicate slug: ${post.slug}`);
    seen.add(post.slug);
  }
  const featured = posts.filter((post) => post.featured);
  if (featured.length > 1) throw new Error(`Only one post can be featured: ${featured.map((p) => p.slug).join(", ")}`);
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
}
