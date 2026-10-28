import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";

/*
 * Content checks for every post: the slips that reach readers after a launch.
 * Errors: garbled characters (mojibake) or a byte-order mark, the cover
 * repeated in the body, a bold emoji "button" link that markdown renders as a
 * plain underlined link, a /graphify instruction for Codex without the
 * $graphify note, and a canonical URL that is not graphify.com.
 * The wrong PyPI package, graphify.net links, and the keyword in the title are
 * already checked by check-seo.mjs, so they are not repeated here.
 *
 * ALLOW lists findings that are correct on purpose: "<file>:<rule>".
 */

export const ALLOW = new Set([]);

const MOJIBAKE = /[\u00e2\u00c3\ufffd]|\u00ef\u00bb\u00bf/;
const EMOJI = /\p{Extended_Pictographic}/u;
const SLASH_COMMAND = /(?<![\w.\/$-])\/graphify\b/;

function bodyStart(lines) {
  if (lines[0]?.replace(/^\ufeff/, "").trim() !== "---") return 0;
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  return end < 0 ? lines.length : end + 1;
}

/** A line that is only a link, bold, with an emoji in its text: a fake button. */
export function isEmojiButton(line) {
  const t = line.trim();
  const bold = /^(\*\*|__)\s*\[([^\]]+)\]\([^)]+\)\s*(\*\*|__)$/.exec(t) ?? /^\[(\*\*|__)([^\]]+)(\*\*|__)\]\([^)]+\)$/.exec(t);
  return Boolean(bold && EMOJI.test(bold[2]));
}

export function lintContent(filename, raw) {
  const findings = [];
  const add = (rule, level, line, message) => {
    if (!ALLOW.has(`${filename}:${rule}`)) findings.push({ rule, level, line, message });
  };
  if (raw.charCodeAt(0) === 0xfeff) add("bom", "error", 1, "The file starts with a byte-order mark. Save it as UTF-8 without BOM.");
  const lines = raw.replace(/^\ufeff/, "").split(/\r?\n/);
  const start = bodyStart(lines);
  let data = {};
  try {
    data = matter(raw.replace(/^\ufeff/, "")).data;
  } catch {
    data = {};
  }

  lines.forEach((line, i) => {
    if (MOJIBAKE.test(line)) {
      add("mojibake", "error", i + 1, "Garbled characters (â, Ã, ï»¿ or �). Re-save as UTF-8 and retype the symbol.");
    }
  });

  const canonical = data.canonical ?? data.canonicalUrl ?? data.canonical_url;
  if (canonical !== undefined && !/^https:\/\/graphify\.com\//.test(String(canonical))) {
    add("canonical", "error", 1, "The canonical URL must be https://graphify.com/blog/<slug>. Copies elsewhere point here, not the other way.");
  }

  const covers = [data.imgThumb, data.imgSocial].filter((v) => typeof v === "string" && v);
  let fenced = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const number = i + 1;
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
    }
    for (const match of line.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)) {
      const file = match[1].split("/").pop();
      if (covers.includes(file)) {
        add("cover-in-body", "error", number, `${file} is already the cover. The page shows it at the top; remove it from the body.`);
      }
    }
    if (!fenced && isEmojiButton(line)) {
      add("emoji-button", "error", number, "Markdown has no buttons: this renders as an underlined link. Put the link in a plain sentence.");
    }
    if (/\bcodex\b/i.test(line) && SLASH_COMMAND.test(line) && !line.includes("$graphify")) {
      add("codex-command", "error", number, "Codex runs Graphify as $graphify, not /graphify. Say so on this line.");
    }
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
    for (const finding of lintContent(name, fs.readFileSync(path.join(dir, name), "utf8"))) {
      if (finding.level === "error") errors++;
      else warnings++;
      console.log(
        actions
          ? `::${finding.level} file=${file},line=${finding.line},title=Content::${escapeData(finding.message)}`
          : `${file}:${finding.line} ${finding.level} [${finding.rule}]: ${finding.message}`,
      );
    }
  }
  console.log(`content: ${files.length} posts, ${errors} errors, ${warnings} warnings`);
  if (errors > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
