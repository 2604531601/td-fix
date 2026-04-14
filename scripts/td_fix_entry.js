#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { buildAllIndexes } from "./build_kb_all.js";
import { buildContext } from "./build_context.js";
import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";
import { createMr } from "./create_mr.js";
import { collectMrPayload } from "./collect_mr_payload.js";
import { queryTd } from "./query_td.js";
import { createBranch } from "./create_branch.js";
import { runVerify } from "./verify_runner.js";

function usage() {
  console.error("Usage: td-fix <plan|execute|run> TD-1234 [--approved] [--target-branch <name>] [--debug] [--cwd <path>] [--config <path>]");
}

function inferChangeFocus(fileDetail) {
  const symbols = (fileDetail.symbols || []).slice(0, 3);
  if (symbols.length > 0) {
    return `Adjust logic around ${symbols.join(", ")}.`;
  }

  const segments = fileDetail.path.split("/");
  return `Adjust logic in ${segments.slice(-2).join("/")}.`;
}

function buildPlanSummary(taskSpec, context) {
  const fileChanges = (context.candidate_file_details || []).slice(0, 8).map((fileDetail) => ({
    path: fileDetail.path,
    module: fileDetail.module || "general",
    focus: inferChangeFocus(fileDetail),
    related_tests: fileDetail.related_tests || []
  }));
  const tests = (context.related_tests || []).slice(0, 5);
  const risks = context.risk_notes || [];
  const docs = (context.doc_context_details || []).slice(0, 3).map((doc) => ({
    path: doc.path,
    category: doc.category,
    purpose: doc.summary || `Use this ${doc.category} knowledge document as supporting context.`
  }));

  return {
    problem: taskSpec?.title || taskSpec?.description || "Repair the TD issue in the identified repository scope.",
    planned_changes: fileChanges.length > 0
      ? fileChanges
      : [{
        path: "No candidate file was retrieved",
        module: "general",
        focus: "Review the TD scope and identify the first concrete change point before editing code.",
        related_tests: []
      }],
    supporting_docs: docs,
    tests: tests.length > 0
      ? tests
      : ["No existing repository tests were retrieved. Prepare self-authored verification if needed."],
    risks: risks.length > 0
      ? risks
      : ["No special repository risk notes were retrieved from the current context."]
  };
}

function withDebug(payload, flags, debugPayload) {
  if (!flags.debug) {
    return payload;
  }

  return {
    ...payload,
    debug: debugPayload
  };
}

function buildPlanPayload(action, tdId, config, taskSpec, kb, context, flags) {
  return withDebug({
    action,
    tdId,
    status: config.planConfirmation?.required !== false
      ? "awaiting_confirmation"
      : "planned",
    confirmation_required: config.planConfirmation?.required !== false,
    plan_summary: buildPlanSummary(taskSpec, context),
    nextSteps: [
      "review the repair plan summary",
      "confirm before any code modification starts",
      "after approval, run the execute phase"
    ],
    confirmation_prompt: "Please review the repair plan above. Reply with approval before code changes begin."
  }, flags, { taskSpec, kb, context });
}

function buildConfirmationGate(action, tdId, taskSpec, kb, context, flags) {
  return withDebug({
    action,
    tdId,
    status: "awaiting_confirmation",
    confirmation_required: true,
    plan_summary: buildPlanSummary(taskSpec, context),
    message: "Execution is blocked until the user confirms the repair plan.",
    required_reply: "confirm"
  }, flags, { taskSpec, kb, context });
}

function buildTargetBranchGate(action, tdId, config, branchResult, verifyResult, mrPayload, taskSpec, kb, context, flags) {
  return withDebug({
    action,
    tdId,
    status: "awaiting_target_branch",
    confirmation_required: true,
    plan_summary: buildPlanSummary(taskSpec, context),
    branch: branchResult,
    verify: verifyResult,
    mr_request: {
      source_branch: mrPayload.source_branch,
      suggested_target_branch: mrPayload.target_branch,
      draft: config.mr?.draft !== false
    },
    message: `Validation finished. Please confirm which target branch to use for the merge request. Suggested target branch: ${mrPayload.target_branch}.`,
    required_reply: "target branch name"
  }, flags, { taskSpec, kb, context, mrPayload });
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const rawAction = positional[0] || "plan";
  const action = rawAction === "run" ? "plan" : rawAction;
  const tdId = positional[1] || "";

  if (!["plan", "execute"].includes(action)) {
    usage();
    process.exit(1);
  }

  if (!tdId) {
    usage();
    process.exit(1);
  }

  const sharedOptions = {
    cwd: flags.cwd,
    configPath: flags.config
  };
  const { config } = loadConfig(sharedOptions);
  const taskSpec = queryTd(tdId, sharedOptions);
  const kb = buildAllIndexes(sharedOptions);
  const context = buildContext(tdId, {
    ...sharedOptions,
    taskSpec
  });

  if (action === "plan") {
    console.log(JSON.stringify(
      buildPlanPayload(action, tdId, config, taskSpec, kb, context, flags),
      null,
      2
    ));
    return;
  }

  if (config.planConfirmation?.required !== false && !flags.approved) {
    console.log(JSON.stringify(
      buildConfirmationGate(action, tdId, taskSpec, kb, context, flags),
      null,
      2
    ));
    return;
  }

  const branchResult = createBranch(tdId, taskSpec?.title || tdId, sharedOptions);
  const verifyResult = runVerify(sharedOptions);
  const mrPayload = collectMrPayload(tdId, branchResult.branch, {
    ...sharedOptions,
    targetBranch: flags["target-branch"]
  });

  if (config.mr?.targetBranchConfirmation !== false && !flags["target-branch"]) {
    console.log(JSON.stringify(
      buildTargetBranchGate(
        action,
        tdId,
        config,
        branchResult,
        verifyResult,
        mrPayload,
        taskSpec,
        kb,
        context,
        flags
      ),
      null,
      2
    ));
    return;
  }

  const mrResult = createMr(mrPayload, sharedOptions);

  console.log(JSON.stringify(withDebug({
    action,
    tdId,
    status: "execution-ready",
    confirmation_required: config.planConfirmation?.required !== false,
    plan_summary: buildPlanSummary(taskSpec, context),
    branch: branchResult,
    verify: verifyResult,
    mr: mrResult,
    nextSteps: [
      "modify code within the approved plan scope",
      "run the required validation",
      "use the installed MR creation skill with the confirmed target branch"
    ]
  }, flags, { taskSpec, kb, context, mrPayload }), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
