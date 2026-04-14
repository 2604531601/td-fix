---
name: td-fix
description: Handle a TD-driven GitLab code-fix workflow in an AI CLI. Use when the user asks to fix a TD or defect ticket and wants the standard flow of querying the TD, building repository context, creating a fix branch, validating changes, and preparing a merge request.
metadata:
  short-description: Fix a TD with the standard workflow
---

# TD Fix

Use this skill when the user wants to fix a TD or defect ticket in a GitLab repository through a standard AI-assisted workflow.

## When To Use

Trigger this skill when the user asks for any of the following:

- fix a TD such as `TD-1234`
- handle a defect ticket with the normal repair flow
- create a fix branch, validate changes, and prepare a GitLab MR
- continue a TD repair workflow that already started

Do not use this skill for:

- broad repository exploration without a TD or defect target
- CI-only debugging with no TD context
- publishing unrelated local changes

## Workflow

Follow this order strictly:

1. Use the installed TD query skill to fetch the TD details and normalize the result into a structured task object.
2. Resolve `skill_root` as the directory that contains this `SKILL.md`.
3. Treat every bundled path such as `scripts/...`, `assets/...`, and `references/...` as relative to `skill_root`, never relative to the target repository.
4. Run `<skill_root>/scripts/build_docs_index.js`, `<skill_root>/scripts/build_code_index.js`, and `<skill_root>/scripts/build_history_index.js` before planning. Pass the target repository root with `--cwd` when needed.
5. Build a focused repository context packet with `<skill_root>/scripts/build_context.js`.
6. Generate a repair plan with expected file scope, tests, and risk notes.
7. Present the repair plan to the user and stop. Do not modify code in the same turn.
8. Only after explicit approval, create a dedicated fix branch before editing files.
9. Modify code only within the approved plan scope.
10. Run repository validation commands.
11. Prepare MR title and description.
12. Ask the user which target branch should receive the merge request.
13. Use the installed MR creation skill only after validation is acceptable and the target branch is confirmed.

## Required Checks

- Do not skip TD parsing.
- Do not skip repository indexing.
- Do not skip context building.
- Do not modify code before the user confirms the repair plan.
- Do not create an MR when validation clearly fails.
- Do not create an MR before the user confirms the target branch.
- Pause for human confirmation when the change exceeds configured risk rules.

## Tooling And Resources

Use these local resources:

- `scripts/build_kb_all.js` to build all repository indexes before planning
- `scripts/build_context.js` to assemble the fix context packet
- `scripts/create_branch.js` to generate the fix branch name
- `scripts/verify_runner.js` to load repository validation commands
- `scripts/collect_mr_payload.js` to assemble MR metadata
- `scripts/query_td.js` to document and normalize TD skill usage
- `scripts/create_mr.js` to document and normalize MR skill usage

## Script Execution Rule

- Never assume bundled scripts live in the target repository.
- Always resolve bundled script paths from this skill folder first.
- If the current terminal directory is the target repository, invoke bundled scripts with `<skill_root>/scripts/... --cwd <target-repo-root>`.
- Do not run `node scripts/...` from the target repository unless the target repository is itself the skill repository.

Use this pattern:

1. Determine `skill_root` from the directory containing this `SKILL.md`.
2. Determine `target_repo_root` from the current task context.
3. Invoke bundled scripts as `node <skill_root>/scripts/<script>.js --cwd <target_repo_root>`.

Use these configuration sources:

- `assets/default.config.json` for defaults
- target repository `.td-fix.json` for overrides
- `installedSkills.tdQuery.name` for the installed TD query skill name
- `installedSkills.createMr.name` for the installed MR creation skill name
- `orchestration.mode` for the default agent strategy
- `planConfirmation.required` to decide whether user confirmation is required after planning

Read these references only when needed:

- `references/repository-setup.md` when wiring the skill into a target repository
- `assets/plan.prompt.md` when you need a structured repair-plan template
- `assets/mr_description.md` when you need a draft MR description template
- `assets/review_fix.prompt.md` when you need a review-fix template

## Failure Handling

- If TD parsing fails, stop and report the blocker.
- If repository indexing fails, stop and report the indexing blocker before planning.
- If repository context is too weak, stop and ask for the missing repository context.
- If plan confirmation is required, stop after presenting the plan and wait for approval before editing code.
- If validation fails, keep working locally and do not create the MR yet.
- If target branch confirmation is required, stop after validation and ask which branch should receive the MR.
- If the requested repair is high risk, pause and ask for confirmation before continuing.

## Execution Rule

When the user first asks to fix a TD:

1. Run the planning phase only.
2. Present the plan.
3. Stop and wait for approval.

Only after the user explicitly confirms should you continue with the execute phase.

## Orchestration Guidance

Default to a single orchestrating agent. This workflow does not require multi-agent coordination in the first version.

Introduce multi-agent only when there is a clear, bounded benefit such as:

- parallel repository context gathering
- a separate review-only pass after coding
- a separate verification-only pass after coding
