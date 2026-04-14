import fs from "node:fs";
import path from "node:path";

const DEFAULT_IGNORED_SEGMENTS = new Set([
  ".git",
  "node_modules",
  ".td-fix-cache",
  "dist",
  "build",
  "coverage"
]);

export function normalizeRelativePath(repoRoot, targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

export function pathExists(targetPath) {
  return fs.existsSync(targetPath);
}

export function readTextFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return "";
  }
}

export function walkFiles(rootDir, options = {}) {
  const results = [];
  const allowedExtensions = options.allowedExtensions
    ? new Set(options.allowedExtensions.map((item) => item.toLowerCase()))
    : null;
  const ignoredSegments = new Set([
    ...DEFAULT_IGNORED_SEGMENTS,
    ...(options.ignoredSegments || [])
  ]);

  function visit(currentDir) {
    if (!fs.existsSync(currentDir)) {
      return;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (ignoredSegments.has(entry.name)) {
          continue;
        }

        visit(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (allowedExtensions) {
        const extension = path.extname(entry.name).toLowerCase();
        if (!allowedExtensions.has(extension)) {
          continue;
        }
      }

      results.push(fullPath);
    }
  }

  visit(rootDir);
  return results;
}

export function uniqueNormalizedPaths(items) {
  return [...new Set(items.filter(Boolean))];
}
