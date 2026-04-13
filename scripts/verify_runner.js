#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { loadConfig } from "./lib/config.js";

export function runVerify(options = {}) {
  const { config } = loadConfig(options);

  return {
    status: "todo",
    commands: {
      lint: config.verify?.lint || "",
      typecheck: config.verify?.typecheck || "",
      test: config.verify?.test || ""
    },
    passed: false,
    notes: [
      "wire repository-level verify commands from .td-fix.json"
    ]
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(runVerify(), null, 2));
}
