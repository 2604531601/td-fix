#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";
import { runJsonCommand } from "./lib/external_skill.js";

function buildMockResult(payload, command) {
  return {
    status: "mock",
    source: "create-mr-skill",
    command,
    payload,
    result: {
      mr_url: "",
      mr_iid: "",
      state: "not-created"
    }
  };
}

export async function createMr(payload, options = {}) {
  const { config } = loadConfig(options);
  const command = process.env.TD_FIX_CREATE_MR_CMD
    || config.integrations?.createMr?.command
    || "";

  if (!command) {
    return buildMockResult(payload, command);
  }

  const result = await runJsonCommand(command, {
    cwd: options.cwd,
    stdin: JSON.stringify(payload, null, 2)
  });

  return {
    status: "ok",
    source: "create-mr-skill",
    command,
    payload,
    result
  };
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const payloadPath = flags["payload-file"] || positional[0];

  if (!payloadPath) {
    console.error("Usage: node ./scripts/create_mr.js --payload-file <path>");
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  const result = await createMr(payload, {
    cwd: flags.cwd,
    configPath: flags.config
  });

  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
