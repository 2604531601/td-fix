#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";

export function buildContext(tdId, options = {}) {
  void options;

  return {
    td_id: tdId,
    repo: "",
    candidate_files: [],
    related_tests: [],
    similar_changes: [],
    doc_context: [
      "项目概述.md",
      "系统架构设计.md"
    ],
    constraints: [],
    risk_notes: [],
    status: "todo"
  };
}

function main() {
  const { positional } = parseCliArgs(process.argv.slice(2));
  const tdId = positional[0] || "TD-XXXX";

  console.log(JSON.stringify(buildContext(tdId), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
