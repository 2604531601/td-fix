# Repository Setup

Read this reference when you need to configure `td-fix` for a target repository or wire the installed TD and MR skills.

## Required Repository File

Create `.td-fix.json` in the target repository root.

Example:

```json
{
  "repo": "group/project",
  "defaultTargetBranch": "master",
  "branchNaming": {
    "mode": "from-target-branch-template",
    "replaceFirstSegmentWith": "git-user-digits",
    "replaceLastSegmentWith": "feature-slug",
    "fallbackPattern": "fix/{td_id}-{feature_slug}"
  },
  "verify": {
    "lint": "npm run lint",
    "typecheck": "npm run typecheck",
    "test": "npm test"
  },
  "installedSkills": {
    "tdQuery": {
      "name": "td-detail-query"
    },
    "createMr": {
      "name": "create-mr"
    }
  },
  "paths": {
    "docs": ["doc/kb"]
  },
  "knowledgeBase": {
    "docFiles": [
      "doc/kb/业务知识库",
      "doc/kb/技术知识库",
      "doc/kb/测试知识库",
      "doc/kb/仓库概览.md",
      "doc/kb/仓库架构.md",
      "doc/kb/仓库依赖.md",
      "doc/kb/外部接入指南.md"
    ]
  },
  "orchestration": {
    "mode": "single-agent"
  },
  "planConfirmation": {
    "required": true
  },
  "mr": {
    "draft": true,
    "targetBranchConfirmation": true,
    "labels": ["ai-fix", "td"]
  }
}
```

## Installed Skill Contract

- `installedSkills.tdQuery.name`
  The installed skill that the AI should invoke conversationally to fetch and summarize TD details.
- `installedSkills.createMr.name`
  The installed skill that the AI should invoke conversationally to create or update the GitLab MR.

`td-fix` should not assume these skills can be executed as shell commands. In the AI CLI, the orchestration skill should directly use the installed skills during the conversation flow.

## Knowledge Base Entries

`knowledgeBase.docFiles` supports both:

- a single file path such as `doc/kb/仓库架构.md`
- a directory path such as `doc/kb/业务知识库`

When a directory is provided, `td-fix` indexes all supported documentation files under that directory.

## Orchestration Recommendation

Start with:

```json
{
  "orchestration": {
    "mode": "single-agent"
  },
  "planConfirmation": {
    "required": true
  },
  "mr": {
    "targetBranchConfirmation": true
  }
}
```

Use multi-agent only after the single-agent workflow is stable and only for bounded side tasks such as:

- parallel repository context gathering
- separate verification or review passes
- summarizing large TD context in parallel

## Default Assets

- `assets/default.config.json`
- `assets/plan.prompt.md`
- `assets/mr_description.md`
- `assets/review_fix.prompt.md`

## Plan Confirmation

If you want the user to approve every repair before code changes start, set:

```json
{
  "planConfirmation": {
    "required": true
  }
}
```

This is the recommended default for TD repair workflows that still require human sign-off.

## Target Branch Confirmation

If you want the user to confirm which target branch should receive the MR, set:

```json
{
  "mr": {
    "targetBranchConfirmation": true
  }
}
```

When enabled, `td-fix` should stop after validation and ask which branch should receive the MR.

## Branch Naming

If your target branch looks like `A/B/C` and you want the new fix branch to become `60583/B/fix_bug`, configure:

```json
{
  "defaultTargetBranch": "A/B/C",
  "branchNaming": {
    "mode": "from-target-branch-template",
    "replaceFirstSegmentWith": "git-user-digits",
    "replaceLastSegmentWith": "feature-slug",
    "fallbackPattern": "fix/{td_id}-{feature_slug}"
  }
}
```

`td-fix` will:

- keep the middle path segments
- replace the first segment with the numeric part of `git config user.name`
- replace the last segment with the current repair feature slug

## Repository Cache

`td-fix` writes repository-specific indexes to:

```text
.td-fix-cache/
  docs-index.json
  code-index.json
  history-index.json
```

These cache files belong to the target repository, not to the `td-fix` skill repository.

## Index Commands

If you are manually testing from the target repository, call the scripts from the `td-fix` skill directory and pass the target repository root with `--cwd`.

Do not run `node scripts/...` from the target repository unless that repository is itself the `td-fix` skill repository.

Use these commands:

```bash
node /path/to/td-fix/scripts/build_docs_index.js --cwd /path/to/target-repo
node /path/to/td-fix/scripts/build_code_index.js --cwd /path/to/target-repo
node /path/to/td-fix/scripts/build_history_index.js --cwd /path/to/target-repo
node /path/to/td-fix/scripts/build_kb_all.js --cwd /path/to/target-repo
node /path/to/td-fix/scripts/build_context.js TD-1234 --cwd /path/to/target-repo
```

## Workflow Commands

Use the two-phase flow:

```bash
node /path/to/td-fix/scripts/td_fix_entry.js plan TD-1234 --cwd /path/to/target-repo
node /path/to/td-fix/scripts/td_fix_entry.js execute TD-1234 --approved --cwd /path/to/target-repo
node /path/to/td-fix/scripts/td_fix_entry.js execute TD-1234 --approved --target-branch release/2026.04 --cwd /path/to/target-repo
```

The planning phase builds the indexes, constructs context, and stops for confirmation. The execute phase stops again to ask for the target branch before preparing the MR payload unless `--target-branch` is explicitly provided.
