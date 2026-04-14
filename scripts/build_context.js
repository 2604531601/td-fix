#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";
import { getCachePaths, readJson } from "./lib/cache.js";
import { uniqueTokens } from "./lib/text.js";
import { buildDocsIndex } from "./build_docs_index.js";
import { buildCodeIndex } from "./build_code_index.js";
import { buildHistoryIndex } from "./build_history_index.js";

function scoreByKeywords(itemKeywords, queryKeywords) {
  const keywordSet = new Set(itemKeywords || []);
  return queryKeywords.reduce((score, keyword) => {
    if (keywordSet.has(keyword)) {
      return score + 2;
    }

    return score;
  }, 0);
}

function loadOrBuildIndexes(options) {
  const { cacheDir } = loadConfig(options);
  const cachePaths = getCachePaths(cacheDir);

  const docsIndex = readJson(cachePaths.docsIndex) || buildDocsIndex(options);
  const codeIndex = readJson(cachePaths.codeIndex) || buildCodeIndex(options);
  const historyIndex = readJson(cachePaths.historyIndex) || buildHistoryIndex(options);

  return { docsIndex, codeIndex, historyIndex };
}

function rankDocuments(documents, queryKeywords) {
  return [...documents]
    .map((item) => ({
      ...item,
      _score: scoreByKeywords(item.keywords, queryKeywords)
    }))
    .filter((item) => item._score > 0 || queryKeywords.length === 0)
    .sort((left, right) => right._score - left._score);
}

function rankFiles(files, queryKeywords) {
  return [...files]
    .map((item) => ({
      ...item,
      _score: scoreByKeywords(item.keywords, queryKeywords)
        + scoreByKeywords(item.symbols || [], queryKeywords)
    }))
    .filter((item) => item._score > 0 || queryKeywords.length === 0)
    .sort((left, right) => right._score - left._score);
}

function rankChanges(changes, queryKeywords) {
  return [...changes]
    .map((item) => ({
      ...item,
      _score: scoreByKeywords(item.keywords, queryKeywords)
    }))
    .filter((item) => item._score > 0 || queryKeywords.length === 0)
    .sort((left, right) => right._score - left._score);
}

export function buildContext(tdId, options = {}) {
  const { config } = loadConfig(options);
  const { docsIndex, codeIndex, historyIndex } = loadOrBuildIndexes(options);
  const queryKeywords = uniqueTokens(
    tdId,
    options.taskSpec?.title || "",
    options.taskSpec?.description || "",
    (options.taskSpec?.module_hint || []).join(" ")
  );
  const rankedDocs = rankDocuments(docsIndex.documents || [], queryKeywords);
  const rankedFiles = rankFiles(codeIndex.files || [], queryKeywords);
  const rankedChanges = rankChanges(historyIndex.changes || [], queryKeywords);
  const maxCandidateFiles = config.knowledgeBase?.maxCandidateFiles || 12;
  const maxSimilarChanges = config.knowledgeBase?.maxSimilarChanges || 5;
  const candidateFiles = rankedFiles.slice(0, maxCandidateFiles);
  const relatedTests = [...new Set(candidateFiles.flatMap((item) => item.related_tests || []))];

  return {
    td_id: tdId,
    repo: config.repo || "",
    doc_context: rankedDocs.slice(0, 5).map((item) => item.path),
    doc_context_details: rankedDocs.slice(0, 5).map((item) => ({
      path: item.path,
      category: item.category || "repository",
      title: item.title || item.path,
      summary: item.summary || ""
    })),
    candidate_files: candidateFiles.map((item) => item.path),
    candidate_file_details: candidateFiles.map((item) => ({
      path: item.path,
      module: item.module || "general",
      symbols: (item.symbols || []).slice(0, 3),
      related_tests: item.related_tests || []
    })),
    related_tests: relatedTests,
    similar_changes: rankedChanges.slice(0, maxSimilarChanges).map((item) => ({
      id: item.id,
      title: item.title,
      files: item.files.slice(0, 5)
    })),
    constraints: [
      `Do not exceed ${config.riskRules?.maxChangedFiles || 8} changed files without confirmation.`
    ],
    risk_notes: [
      ...(config.riskRules?.forbiddenPaths || []).map(
        (item) => `Avoid changing forbidden path without confirmation: ${item}`
      )
    ],
    status: "indexed",
    query_keywords: queryKeywords
  };
}

function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const tdId = positional[0] || "TD-XXXX";
  const taskSpec = flags["task-file"]
    ? readJson(flags["task-file"], {})
    : null;

  console.log(JSON.stringify(buildContext(tdId, {
    cwd: flags.cwd,
    configPath: flags.config,
    taskSpec
  }), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
