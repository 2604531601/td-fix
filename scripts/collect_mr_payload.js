#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";

export function collectMrPayload(tdId, branch, options = {}) {
  const { config } = loadConfig(options);
  const targetBranch = options.targetBranch || config.defaultTargetBranch || "master";
  const labels = config.mr?.labels || ["ai-fix", "td"];
  const repo = config.repo || "";

  return {
    repo,
    source_branch: branch,
    target_branch: targetBranch,
    title: `[${tdId}] TODO: fill MR title`,
    description: "TODO: summarize changes, verification results, and risks.",
    labels,
    reviewers: []
  };
}

function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const tdId = positional[0] || "TD-XXXX";
  const branch = positional[1] || "fix/TD-XXXX-update";
  const payload = collectMrPayload(tdId, branch, {
    cwd: flags.cwd,
    configPath: flags.config,
    targetBranch: flags["target-branch"]
  });

  console.log(JSON.stringify(payload, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
