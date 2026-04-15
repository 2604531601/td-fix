#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";
import { getCachePaths, readJson } from "./lib/cache.js";
import { validateDocsIndex } from "./lib/docs_index_validation.js";

export function validateDocsIndexFile(options = {}) {
  const { cacheDir } = loadConfig(options);
  const cachePaths = getCachePaths(cacheDir);
  const explicitPath = options.filePath
    ? path.resolve(options.filePath)
    : cachePaths.docsIndex;
  const index = readJson(explicitPath, null);

  if (!index) {
    return {
      ok: false,
      file: explicitPath,
      errors: [{
        level: "error",
        path: explicitPath,
        field: "file",
        message: "docs-index file could not be read."
      }],
      warnings: [],
      issueCount: 1
    };
  }

  return {
    file: explicitPath,
    ...validateDocsIndex(index)
  };
}

function main() {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const result = validateDocsIndexFile({
    cwd: flags.cwd,
    configPath: flags.config,
    filePath: flags.file
  });

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
