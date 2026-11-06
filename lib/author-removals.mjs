/** Ids a maintainer has named for removal. Blank lines and # comments are ignored. */
export function parseRemovals(text) {
  const ids = [];
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    if (!/^[a-z][a-z0-9-]*$/.test(trimmed)) {
      throw new Error(`authors.removals: "${trimmed}" is not an author id`);
    }
    ids.push(trimmed);
  }
  return ids;
}

/** Author ids present in `before` and missing from `after`, ignoring an explicit maintainer list. */
export function removedAuthorIds(before, after, allowed = []) {
  const allow = new Set(allowed);
  return Object.keys(before)
    .filter((id) => !Object.prototype.hasOwnProperty.call(after, id) && !allow.has(id))
    .sort();
}
