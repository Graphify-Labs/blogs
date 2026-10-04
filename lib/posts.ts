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
  authors: string[];
  categories: Category[];
  tags: string[];
  imgSocial?: string;
  imgThumb?: string;
  body: string;
};

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

  return {
    slug,
    title,
    description,
    date,
    authors: authorIds,
    categories: categories as Category[],
    tags,
    imgSocial: optionalFile(data.imgSocial, `${filename}: imgSocial`),
    imgThumb: optionalFile(data.imgThumb, `${filename}: imgThumb`),
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
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
}
