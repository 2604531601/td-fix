#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";

function buildSkillInvocation(payload, skillName) {
  return {
    status: "skill-required",
    source: "installed-skill",
    skillName,
    payload,
    notes: [
      `Use the installed skill "${skillName}" conversationally to create or update the GitLab MR.`,
      "Do not assume the MR creation skill can be executed as a shell command.",
      "Pass the MR payload fields as structured context when invoking the installed skill."
    ]
  };
}

export function createMr(payload, options = {}) {
  const { config } = loadConfig(options);
  const skillName = process.env.TD_FIX_CREATE_MR_SKILL
    || config.installedSkills?.createMr?.name
    || "create-mr";

  return buildSkillInvocation(payload, skillName);
}

function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const payloadPath = flags["payload-file"] || positional[0];

  if (!payloadPath) {
    console.error("Usage: node ./scripts/create_mr.js --payload-file <path>");
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  const result = createMr(payload, {
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
