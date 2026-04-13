#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";
import { runJsonCommand } from "./lib/external_skill.js";

function normalizeTaskSpec(tdId, rawTaskSpec = {}) {
  return {
    td_id: rawTaskSpec.td_id || tdId,
    title: rawTaskSpec.title || "",
    description: rawTaskSpec.description || "",
    acceptance_criteria: Array.isArray(rawTaskSpec.acceptance_criteria)
      ? rawTaskSpec.acceptance_criteria
      : [],
    repo: rawTaskSpec.repo || "",
    target_branch: rawTaskSpec.target_branch || "master",
    module_hint: Array.isArray(rawTaskSpec.module_hint)
      ? rawTaskSpec.module_hint
      : [],
    priority: rawTaskSpec.priority || "",
    risk_level: rawTaskSpec.risk_level || "medium",
    source: rawTaskSpec.source || "td-query-skill"
  };
}

function buildMockTaskSpec(tdId, command) {
  return normalizeTaskSpec(tdId, {
    source: "td-query-skill",
    command,
    title: "",
    description: ""
  });
}

export async function queryTd(tdId, options = {}) {
  const { config } = loadConfig(options);
  const baseCommand = process.env.TD_FIX_TD_QUERY_CMD
    || config.integrations?.tdQuery?.command
    || "";

  if (!baseCommand) {
    return buildMockTaskSpec(tdId, baseCommand);
  }

  const command = `${baseCommand} ${tdId}`;
  const result = await runJsonCommand(command, { cwd: options.cwd });

  return normalizeTaskSpec(tdId, result);
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const tdId = positional[0] || "TD-XXXX";
  const taskSpec = await queryTd(tdId, {
    cwd: flags.cwd,
    configPath: flags.config
  });

  console.log(JSON.stringify(taskSpec, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
