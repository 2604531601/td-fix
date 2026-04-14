import fs from "node:fs";
import path from "node:path";

export function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeJson(filePath, data) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function getCachePaths(cacheDir) {
  return {
    docsIndex: path.join(cacheDir, "docs-index.json"),
    codeIndex: path.join(cacheDir, "code-index.json"),
    historyIndex: path.join(cacheDir, "history-index.json")
  };
}
