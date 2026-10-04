import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";

/*
 * Search checks for every post. An error is a mistake a reader would hit: a
 * second H1, a skipped heading level, an image with no description, a link to
 * graphify.net, or the wrong PyPI package. A warning is advice: the title and
 * description lengths search results show, the target phrase, links into
 * graphify.com, and a cover. In GitHub Actions each finding lands on its line
 * in the pull request.
 */

export const LIMITS = { title: 60, descriptionMin: 70, descriptionMax: 160, words: 300, siteLinks: 2, opening: 100 };

const STOP = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does", "for", "from", "how", "i", "in", "into",
  "is", "it", "its", "of", "on", "or", "the", "this", "to", "what", "when", "where", "which", "who", "why", "with",
  "you", "your",
]);
const WEAK_ANCHORS = new Set(["here", "click here", "this", "this link", "link", "read more", "more"]);
const WRONG_PACKAGE = /\b(?:pip3?|pipx|uv(?:\s+tool|\s+pip)?|poetry|pdm)\s+(?:install|add)\s+(?:-\S+\s+)*graphify(?![\w-])/i;
const FAKE_SITE = /https?:\/\/(?:www\.)?graphify\.net\b/i;
const SITE_LINK =
  /(?<!!)\[[^\]]*\]\(\s*<?(?:https?:\/\/(?:www\.)?graphify\.com(?:[/?#][^)\s>]*)?|\/(?!\/)[^)\s>]*)>?(?:\s+"[^"]*")?\s*\)/g;
const ANCHOR = /(?<!!)\[([^\]]+)\]\(/g;

export function words(text) {
  return text.toLowerCase().match(/[a-z0-9]+(?:[.'][a-z0-9]+)*/g) ?? [];
}

/** Reading text: link targets, images, and tags removed, link words kept. */
function plain(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/<[^>]+>/g, " ");
}

/** The words of the target phrase that a page has to carry. "How to give Cursor a graph" needs give, cursor, graph. */
export function keyTerms(keyword) {
  return [...new Set(words(keyword).filter((word) => !STOP.has(word)))];
}

function carries(text, terms) {
  const present = new Set(words(text));
  return terms.every((term) => present.has(term));
}

/** Index of the first body line: front matter ends at the second `---` line. */
function bodyStart(lines) {
  if (lines[0]?.trim() !== "---") return 0;
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  return end < 0 ? lines.length : end + 1;
}

export function lintPost(filename, raw) {
  const findings = [];
  const add = (level, line, message) => findings.push({ level, line, message });
  const { data } = matter(raw);
  const lines = raw.split(/\r?\n/);
  const start = bodyStart(lines);
  const field = (key) => {
    const at = lines.findIndex((line, i) => i < start && line.startsWith(`${key}:`));
    return at < 0 ? 1 : at + 1;
  };
  const slug = /^\d{4}-\d{2}-\d{2}-(.+)\.mdx$/.exec(filename)?.[1] ?? "";
  const title = typeof data.title === "string" ? data.title : "";
  const description = typeof data.description === "string" ? data.description : "";

  for (let i = 0; i < start; i++) {
    if (FAKE_SITE.test(lines[i])) add("error", i + 1, "graphify.net is not Graphify. Link graphify.com instead.");
  }

  const headings = [];
  const prose = [];
  let fenced = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const number = i + 1;
    if (WRONG_PACKAGE.test(line)) add("error", number, "The PyPI package is graphifyy, with two y's.");
    if (FAKE_SITE.test(line)) add("error", number, "graphify.net is not Graphify. Link graphify.com instead.");
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      headings.push({ level: heading[1].length, text: heading[2], line: number });
      continue;
    }
    prose.push({ text: line, line: number });
  }

  let previous = 1;
  for (const heading of headings) {
    if (heading.level === 1) {
      add("error", heading.line, "The title is the page's only H1. Start sections at ##.");
    } else if (heading.level > previous + 1) {
      add("error", heading.line, `This ${"#".repeat(heading.level)} skips a level. Go one step at a time: ## then ###.`);
    }
    previous = heading.level;
  }

  for (const { text, line } of prose) {
    if (/!\[\s*\]\(/.test(text)) add("error", line, "Describe the image for readers who cannot see it: ![what it shows](file.png).");
    for (const match of text.matchAll(ANCHOR)) {
      if (WEAK_ANCHORS.has(match[1].trim().toLowerCase())) {
        add("warning", line, `"${match[1].trim()}" does not say where the link goes. Use the name of the page.`);
      }
    }
  }

  const titleLength = [...title].length;
  if (titleLength > LIMITS.title) {
    add("warning", field("title"), `The title is ${titleLength} characters. Search results cut titles near ${LIMITS.title}, and the site adds " · Graphify".`);
  }
  const descriptionLength = [...description].length;
  if (descriptionLength < LIMITS.descriptionMin || descriptionLength > LIMITS.descriptionMax) {
    add(
      "warning",
      field("description"),
      `The description is ${descriptionLength} characters. Search results show it best between ${LIMITS.descriptionMin} and ${LIMITS.descriptionMax}.`,
    );
  }

  const markdown = prose.map((item) => item.text).join("\n");
  const reading = plain(markdown);
  const count = words([reading, ...headings.map((heading) => heading.text)].join(" ")).length;
  if (count < LIMITS.words) {
    add("warning", start + 1, `The post has ${count} words. Answer the question fully, then say what a reader can do next.`);
  }

  const siteLinks = [...markdown.matchAll(SITE_LINK)].length;
  if (siteLinks < LIMITS.siteLinks) {
    add(
      "warning",
      start + 1,
      `The post links ${siteLinks} graphify.com page${siteLinks === 1 ? "" : "s"}. Link at least ${LIMITS.siteLinks}: an integration page, a glossary term, docs, or a related post.`,
    );
  }

  if (!data.imgThumb && !data.imgSocial) {
    add("warning", field("title"), "There is no cover. A shared link will show the site card instead of this post.");
  }

  const keyword = typeof data.keyword === "string" ? data.keyword.trim() : "";
  if (!keyword) {
    add("warning", field("title"), "Add keyword: the phrase a reader would type to find this post.");
  } else {
    const terms = keyTerms(keyword);
    const opening = words(reading).slice(0, LIMITS.opening).join(" ");
    const missing = [
      carries(title, terms) ? "" : "the title",
      carries(description, terms) ? "" : "the description",
      carries(opening, terms) ? "" : `the first ${LIMITS.opening} words`,
      carries(slug.replace(/-/g, " "), terms) ? "" : "the URL",
      headings.some((heading) => words(heading.text).some((word) => terms.includes(word))) ? "" : "every heading",
    ].filter(Boolean);
    if (missing.length > 0) add("warning", field("keyword"), `"${keyword}" is missing from ${missing.join(", ")}.`);
  }

  return findings.sort((a, b) => a.line - b.line);
}

const escapeData = (value) => value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");

function main() {
  const dir = path.join(process.cwd(), "posts");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith(".mdx")).sort() : [];
  const actions = process.env.GITHUB_ACTIONS === "true";
  let errors = 0;
  let warnings = 0;
  for (const name of files) {
    const file = `posts/${name}`;
    for (const finding of lintPost(name, fs.readFileSync(path.join(dir, name), "utf8"))) {
      if (finding.level === "error") errors++;
      else warnings++;
      console.log(
        actions
          ? `::${finding.level} file=${file},line=${finding.line},title=Search::${escapeData(finding.message)}`
          : `${file}:${finding.line} ${finding.level}: ${finding.message}`,
      );
    }
  }
  console.log(`search: ${files.length} posts, ${errors} errors, ${warnings} warnings`);
  if (errors > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
