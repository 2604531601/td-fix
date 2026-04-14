#!/usr/bin/env node

import { execSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";
import { getCachePaths, writeJson } from "./lib/cache.js";
import { uniqueTokens } from "./lib/text.js";

function readGitHistory(repoRoot, maxCommits) {
  const format = ["%H", "%s", "%b", "__TD_FIX_FILES__"].join("%n");
  const command = `git log --max-count=${maxCommits} --name-only --pretty=format:${JSON.stringify(format)}`;

  try {
    return execSync(command, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: true
    });
  } catch (error) {
    return "";
  }
}

function parseGitHistory(rawHistory) {
  if (!rawHistory.trim()) {
    return [];
  }

  const blocks = rawHistory.split(/\n(?=[0-9a-f]{40}\n)/).filter(Boolean);

  return blocks.map((block) => {
    const lines = block.split(/\r?\n/);
    const sha = lines[0] || "";
    const title = lines[1] || "";
    const fileMarkerIndex = lines.indexOf("__TD_FIX_FILES__");
    const bodyLines = fileMarkerIndex >= 0
      ? lines.slice(2, fileMarkerIndex)
      : lines.slice(2);
    const fileLines = fileMarkerIndex >= 0
      ? lines.slice(fileMarkerIndex + 1).filter(Boolean)
      : [];

    return {
      id: sha,
      title,
      summary: bodyLines.join(" ").trim(),
      files: fileLines,
      keywords: uniqueTokens(title, bodyLines.join(" "), fileLines.join(" "))
    };
  });
}

export function buildHistoryIndex(options = {}) {
  const { config, repoRoot, cacheDir } = loadConfig(options);
  const cachePaths = getCachePaths(cacheDir);
  const maxCommits = config.history?.maxCommits || 200;
  const rawHistory = readGitHistory(repoRoot, maxCommits);
  const changes = parseGitHistory(rawHistory);

  const index = {
    generatedAt: new Date().toISOString(),
    repoRoot,
    changes
  };

  writeJson(cachePaths.historyIndex, index);
  return index;
}

function main() {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const index = buildHistoryIndex({
    cwd: flags.cwd,
    configPath: flags.config
  });

  console.log(JSON.stringify(index, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
