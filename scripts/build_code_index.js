#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";
import { getCachePaths, writeJson } from "./lib/cache.js";
import {
  normalizeRelativePath,
  pathExists,
  readTextFileSafe,
  walkFiles
} from "./lib/repo_fs.js";
import { uniqueTokens } from "./lib/text.js";

function extractSymbols(content) {
  const matches = [
    ...content.matchAll(/\b(?:class|interface|function|const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)/g),
    ...content.matchAll(/\b([A-Z][A-Za-z0-9_]+)\b/g)
  ];

  return [...new Set(matches.map((match) => match[1]).filter(Boolean))].slice(0, 20);
}

function inferModule(relativePath, srcRoots) {
  for (const srcRoot of srcRoots) {
    const normalizedRoot = srcRoot.split(path.sep).join("/");
    if (relativePath.startsWith(`${normalizedRoot}/`)) {
      const remainder = relativePath.slice(normalizedRoot.length + 1);
      return remainder.split("/")[0] || normalizedRoot;
    }
  }

  return relativePath.split("/")[0] || "general";
}

function buildTestLookup(testFiles, repoRoot) {
  const lookup = new Map();

  for (const absolutePath of testFiles) {
    const relativePath = normalizeRelativePath(repoRoot, absolutePath);
    const fileName = path.basename(relativePath).toLowerCase();
    const base = fileName
      .replace(/(\.test|\.spec)?\.[^.]+$/, "")
      .replace(/[^a-z0-9]/g, "");

    if (!lookup.has(base)) {
      lookup.set(base, []);
    }

    lookup.get(base).push(relativePath);
  }

  return lookup;
}

export function buildCodeIndex(options = {}) {
  const { config, repoRoot, cacheDir } = loadConfig(options);
  const cachePaths = getCachePaths(cacheDir);
  const codeExtensions = config.knowledgeBase?.codeExtensions
    || [".js", ".jsx", ".ts", ".tsx", ".java", ".py", ".go"];
  const srcRoots = config.paths?.src || [];
  const testRoots = config.paths?.tests || [];
  const sourceFiles = [];
  const testFiles = [];

  for (const srcRoot of srcRoots) {
    const absoluteRoot = path.resolve(repoRoot, srcRoot);
    if (!pathExists(absoluteRoot)) {
      continue;
    }

    sourceFiles.push(...walkFiles(absoluteRoot, { allowedExtensions: codeExtensions }));
  }

  for (const testRoot of testRoots) {
    const absoluteRoot = path.resolve(repoRoot, testRoot);
    if (!pathExists(absoluteRoot)) {
      continue;
    }

    testFiles.push(...walkFiles(absoluteRoot, { allowedExtensions: codeExtensions }));
  }

  const testLookup = buildTestLookup(testFiles, repoRoot);
  const files = sourceFiles.map((absolutePath) => {
    const relativePath = normalizeRelativePath(repoRoot, absolutePath);
    const content = readTextFileSafe(absolutePath);
    const fileName = path.basename(relativePath).toLowerCase();
    const normalizedBase = fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9]/g, "");

    return {
      path: relativePath,
      module: inferModule(relativePath, srcRoots),
      symbols: extractSymbols(content),
      keywords: uniqueTokens(relativePath, content.slice(0, 1200)),
      related_tests: testLookup.get(normalizedBase) || []
    };
  });

  const index = {
    generatedAt: new Date().toISOString(),
    repoRoot,
    files
  };

  writeJson(cachePaths.codeIndex, index);
  return index;
}

function main() {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const index = buildCodeIndex({
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
