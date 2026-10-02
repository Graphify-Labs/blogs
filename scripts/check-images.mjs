import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "public", "images");
const postsDir = path.join(process.cwd(), "posts");
const maxBytes = 1_500_000;
const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const filename = /^(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/;

const slugs = new Set();
if (fs.existsSync(postsDir)) {
  for (const name of fs.readdirSync(postsDir)) {
    const match = filename.exec(name);
    if (match) slugs.add(match[2]);
  }
}

function walk(dir, slug) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === ".gitkeep") continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (slug) {
        console.error(`${full}: images live in public/images/<slug>/, not nested further`);
        process.exitCode = 1;
        continue;
      }
      if (!slugs.has(name)) {
        console.error(`${full}: no posts/*-${name}.mdx`);
        process.exitCode = 1;
      }
      walk(full, name);
      continue;
    }
    if (!slug) {
      console.error(`${full}: put images in public/images/<slug>/`);
      process.exitCode = 1;
      continue;
    }
    const ext = path.extname(name).toLowerCase();
    if (!allowed.has(ext)) {
      console.error(`${full}: use png, jpg, webp, or gif`);
      process.exitCode = 1;
      continue;
    }
    if (stat.size > maxBytes) {
      console.error(`${full}: ${stat.size} bytes is over 1.5 MB`);
      process.exitCode = 1;
    }
  }
}

walk(root);
if (process.exitCode) process.exit(process.exitCode);
console.log("images ok");
