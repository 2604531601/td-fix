const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "into",
  "then",
  "when",
  "where",
  "what",
  "why",
  "how",
  "todo",
  "fix",
  "bug",
  "issue",
  "task",
  "td"
]);

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .trim();
}

export function tokenize(value) {
  return slugify(value)
    .split(/\s+/)
    .filter((token) => token && token.length >= 2 && !STOP_WORDS.has(token));
}

export function summarizeText(value, maxLength = 220) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}

export function uniqueTokens(...groups) {
  return [...new Set(groups.flatMap((group) => tokenize(group || "")))];
}
