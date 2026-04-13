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
2. Build a focused repository context packet before modifying code.
3. Generate a repair plan with expected file scope, tests, and risk notes.
4. Create a dedicated fix branch before editing files.
5. Modify code only within the planned scope.
6. Run repository validation commands.
7. Prepare MR title and description.
8. Use the installed MR creation skill only after validation is acceptable.

## Required Checks

- Do not skip TD parsing.
- Do not skip context building.
- Do not create an MR when validation clearly fails.
- Pause for human confirmation when the change exceeds configured risk rules.

## Tooling And Resources

Use these local resources:

- `scripts/build_context.js` to assemble the fix context packet
- `scripts/create_branch.js` to generate the fix branch name
- `scripts/verify_runner.js` to load repository validation commands
- `scripts/collect_mr_payload.js` to assemble MR metadata
- `scripts/query_td.js` to document and normalize TD skill usage
- `scripts/create_mr.js` to document and normalize MR skill usage

Use these configuration sources:

- `assets/default.config.json` for defaults
- target repository `.td-fix.json` for overrides
- `installedSkills.tdQuery.name` for the installed TD query skill name
- `installedSkills.createMr.name` for the installed MR creation skill name
- `orchestration.mode` for the default agent strategy

Read these references only when needed:

- `references/repository-setup.md` when wiring the skill into a target repository
- `assets/plan.prompt.md` when you need a structured repair-plan template
- `assets/mr_description.md` when you need a draft MR description template
- `assets/review_fix.prompt.md` when you need a review-fix template

## Failure Handling

- If TD parsing fails, stop and report the blocker.
- If repository context is too weak, stop and ask for the missing repository context.
- If validation fails, keep working locally and do not create the MR yet.
- If the requested repair is high risk, pause and ask for confirmation before continuing.

## Orchestration Guidance

Default to a single orchestrating agent. This workflow does not require multi-agent coordination in the first version.

Introduce multi-agent only when there is a clear, bounded benefit such as:

- parallel repository context gathering
- a separate review-only pass after coding
- a separate verification-only pass after coding
