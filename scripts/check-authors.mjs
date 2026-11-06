import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseRemovals, removedAuthorIds } from "../lib/author-removals.mjs";

const root = process.cwd();
const authorsPath = path.join(root, "authors.json");
const removalsPath = path.join(root, "authors.removals");

function gitShow(rev) {
  try {
    return execFileSync("git", ["show", `${rev}:authors.json`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

/** The authors.json this branch started from. Missing base is an error in CI. */
export function baseAuthorsJson() {
  const ref = process.env.AUTHORS_BASE_REF || process.env.GITHUB_BASE_REF;
  if (ref) {
    const shown = gitShow(`origin/${ref}`) || gitShow(ref);
    if (shown) return shown;
  }
  if (process.env.GITHUB_EVENT_NAME === "push") {
    const parent = gitShow("HEAD~1");
    if (parent) return parent;
  }
  const main = gitShow("origin/main") || gitShow("main");
  if (main && process.env.GITHUB_EVENT_NAME !== "push") return main;
  if (process.env.GITHUB_ACTIONS === "true") {
    throw new Error("authors: could not read the base authors.json");
  }
  return null;
}

function main() {
  const current = JSON.parse(fs.readFileSync(authorsPath, "utf8"));
  const removals = fs.existsSync(removalsPath) ? parseRemovals(fs.readFileSync(removalsPath, "utf8")) : [];
  let beforeText;
  try {
    beforeText = baseAuthorsJson();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (beforeText === null) {
    console.log("authors: no base branch, skipping the removal check");
    return;
  }
  const before = JSON.parse(beforeText);
  const gone = removedAuthorIds(before, current, removals);
  if (gone.length > 0) {
    console.error(`authors: these ids are on the base branch and missing here: ${gone.join(", ")}`);
    console.error("Editing a role, a link, or a picture is fine. A maintainer lists an id in authors.removals to remove that person on purpose.");
    process.exit(1);
  }
  console.log("authors ok");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
