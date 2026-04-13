#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";

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
    source: rawTaskSpec.source || "td-query-skill",
    notes: Array.isArray(rawTaskSpec.notes) ? rawTaskSpec.notes : []
  };
}

function buildSkillInvocation(tdId, skillName) {
  return normalizeTaskSpec(tdId, {
    source: "installed-skill",
    notes: [
      `Use the installed skill "${skillName}" conversationally to fetch TD details.`,
      "Do not assume the TD query skill can be executed as a shell command.",
      "After the skill returns the TD details, normalize them into this task object shape."
    ]
  });
}

export function queryTd(tdId, options = {}) {
  const { config } = loadConfig(options);
  const skillName = process.env.TD_FIX_TD_QUERY_SKILL
    || config.installedSkills?.tdQuery?.name
    || "td-detail-query";

  if (options.rawTaskSpec) {
    return normalizeTaskSpec(tdId, options.rawTaskSpec);
  }

  return buildSkillInvocation(tdId, skillName);
}

function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const tdId = positional[0] || "TD-XXXX";
  const rawTaskSpec = flags["input-file"]
    ? JSON.parse(fs.readFileSync(flags["input-file"], "utf8"))
    : null;
  const taskSpec = queryTd(tdId, {
    cwd: flags.cwd,
    configPath: flags.config,
    rawTaskSpec
  });

  console.log(JSON.stringify(taskSpec, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
