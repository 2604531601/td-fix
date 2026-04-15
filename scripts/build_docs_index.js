#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";
import { getCachePaths, writeJson } from "./lib/cache.js";
import {
  normalizeRelativePath,
  pathExists,
  readTextFileSafe,
  uniqueNormalizedPaths,
  walkFiles
} from "./lib/repo_fs.js";
import { summarizeText, uniqueTokens } from "./lib/text.js";

function inferDocTags(relativePath) {
  const lower = relativePath.toLowerCase();
  const tags = [];

  if (lower.includes("架构") || lower.includes("architecture")) {
    tags.push("architecture");
  }
  if (lower.includes("部署") || lower.includes("deploy")) {
    tags.push("deployment");
  }
  if (lower.includes("服务") || lower.includes("service")) {
    tags.push("service");
  }
  if (lower.includes("概述") || lower.includes("overview")) {
    tags.push("overview");
  }

  const segments = lower.split("/");
  if (segments.length > 1) {
    tags.push(segments[segments.length - 2]);
  }

  return [...new Set(tags.filter(Boolean))];
}

function inferCategory(relativePath) {
  const normalized = relativePath.split("\\").join("/");

  if (normalized.includes("/业务知识库/")) {
    return "business";
  }
  if (normalized.includes("/技术知识库/")) {
    return "technical";
  }
  if (normalized.includes("/测试知识库/")) {
    return "testing";
  }
  if (normalized.includes("/doc/kb/") || normalized.startsWith("doc/kb/")) {
    return "repository";
  }

  return "general";
}

function inferAppliesTo(category) {
  switch (category) {
    case "business":
      return ["业务异常", "流程定位", "模块初筛"];
    case "technical":
      return ["接口异常", "字段缺失", "数据结构定位"];
    case "testing":
      return ["测试补充", "回归分析"];
    case "repository":
      return ["模块初筛", "配置排查"];
    default:
      return ["模块初筛"];
  }
}

function inferModuleHint(relativePath) {
  const segments = relativePath.split("/");
  if (segments.length >= 2) {
    return segments[segments.length - 2];
  }

  return "general";
}

function buildExcerpt(lines, maxLines = 12) {
  return lines
    .slice(0, maxLines)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

export function buildDocsIndex(options = {}) {
  const { config, repoRoot, cacheDir } = loadConfig(options);
  const cachePaths = getCachePaths(cacheDir);
  const docExtensions = config.knowledgeBase?.docExtensions || [".md", ".mdx"];
  const configuredDocEntries = config.knowledgeBase?.docFiles || [];
  const docRoots = config.paths?.docs || [];
  const files = [];

  for (const docRoot of docRoots) {
    const absoluteRoot = path.resolve(repoRoot, docRoot);
    if (!pathExists(absoluteRoot)) {
      continue;
    }

    files.push(...walkFiles(absoluteRoot, { allowedExtensions: docExtensions }));
  }

  for (const docEntry of configuredDocEntries) {
    const absolutePath = path.resolve(repoRoot, docEntry);
    if (!pathExists(absolutePath)) {
      continue;
    }

    const stats = fs.statSync(absolutePath);
    if (stats.isDirectory()) {
      files.push(...walkFiles(absolutePath, { allowedExtensions: docExtensions }));
      continue;
    }

    files.push(absolutePath);
  }

  const documents = uniqueNormalizedPaths(
    files.map((filePath) => normalizeRelativePath(repoRoot, filePath))
  ).map((relativePath) => {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const content = readTextFileSafe(absolutePath);
    const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const title = lines[0]?.replace(/^#+\s*/, "") || path.basename(relativePath);
    const summary = summarizeText(lines.slice(0, 6).join(" "), 260);
    const moduleHint = inferModuleHint(relativePath);
    const tags = inferDocTags(relativePath);
    const relatedCodeHints = uniqueTokens(title, relativePath)
      .filter((item) => !["doc", "kb", "md"].includes(item))
      .slice(0, 5);

    return {
      path: relativePath,
      title,
      category: inferCategory(relativePath),
      module: moduleHint,
      module_hint: moduleHint,
      tags,
      summary,
      keywords: uniqueTokens(title, summary, relativePath),
      applies_to: inferAppliesTo(inferCategory(relativePath)),
      related_code_hints: relatedCodeHints,
      confidence: 0.35,
      excerpt: buildExcerpt(lines),
      generation: {
        method: "fallback-rule-based",
        status: "needs-ai-enrichment"
      }
    };
  });

  const index = {
    generatedAt: new Date().toISOString(),
    repoRoot,
    documents
  };

  writeJson(cachePaths.docsIndex, index);
  return index;
}

function main() {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const index = buildDocsIndex({
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
