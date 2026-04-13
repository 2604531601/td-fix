#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { buildContext } from "./build_context.js";
import { parseCliArgs } from "./lib/cli.js";
import { createMr } from "./create_mr.js";
import { collectMrPayload } from "./collect_mr_payload.js";
import { queryTd } from "./query_td.js";
import { createBranch } from "./create_branch.js";
import { runVerify } from "./verify_runner.js";

function usage() {
  console.error("Usage: td-fix <plan|run> TD-1234 [--create-mr] [--cwd <path>] [--config <path>]");
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const action = positional[0] || "plan";
  const tdId = positional[1] || "";

  if (!["plan", "run"].includes(action)) {
    usage();
    process.exit(1);
  }

  if (!tdId && action === "run") {
    usage();
    process.exit(1);
  }

  const sharedOptions = {
    cwd: flags.cwd,
    configPath: flags.config
  };

  const taskSpec = tdId
    ? await queryTd(tdId, sharedOptions)
    : null;
  const context = tdId
    ? buildContext(tdId, sharedOptions)
    : null;

  if (action === "plan") {
    console.log(JSON.stringify({
      action,
      tdId,
      status: "planned",
      taskSpec,
      context,
      nextSteps: [
        "fill real repository context builder",
        "generate code fix plan",
        "connect repository-specific verify commands"
      ]
    }, null, 2));
    return;
  }

  const branchResult = createBranch(tdId, taskSpec?.title || tdId, sharedOptions);
  const verifyResult = runVerify(sharedOptions);
  const mrPayload = collectMrPayload(tdId, branchResult.branch, sharedOptions);
  const createMrRequested = Boolean(flags["create-mr"]);
  const mrResult = createMrRequested
    ? await createMr(mrPayload, sharedOptions)
    : {
        status: "skipped",
        reason: "Pass --create-mr to invoke the external create-mr skill.",
        payload: mrPayload
      };

  console.log(JSON.stringify({
    action,
    tdId,
    status: "scaffold",
    taskSpec,
    context,
    branch: branchResult,
    verify: verifyResult,
    mr: mrResult,
    nextSteps: [
      "wire code modification step",
      "wire real verify commands",
      "replace placeholder MR title and description"
    ]
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
