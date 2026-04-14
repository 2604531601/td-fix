#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";
import { buildDocsIndex } from "./build_docs_index.js";
import { buildCodeIndex } from "./build_code_index.js";
import { buildHistoryIndex } from "./build_history_index.js";

export function buildAllIndexes(options = {}) {
  const { cacheDir } = loadConfig(options);
  const docsIndex = buildDocsIndex(options);
  const codeIndex = buildCodeIndex(options);
  const historyIndex = buildHistoryIndex(options);

  return {
    status: "indexed",
    cache_dir: cacheDir,
    counts: {
      documents: docsIndex.documents?.length || 0,
      code_files: codeIndex.files?.length || 0,
      history_entries: historyIndex.changes?.length || 0
    },
    index_files: {
      docs: `${cacheDir}/docs-index.json`,
      code: `${cacheDir}/code-index.json`,
      history: `${cacheDir}/history-index.json`
    }
  };
}

function main() {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const result = buildAllIndexes({
    cwd: flags.cwd,
    configPath: flags.config
  });

  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
