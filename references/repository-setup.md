# Repository Setup

Read this reference when you need to configure `td-fix` for a target repository or wire the installed TD and MR skills.

## Required Repository File

Create `.td-fix.json` in the target repository root.

Example:

```json
{
  "repo": "group/project",
  "defaultTargetBranch": "master",
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
  "orchestration": {
    "mode": "single-agent"
  },
  "mr": {
    "draft": true,
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

## Orchestration Recommendation

Start with:

```json
{
  "orchestration": {
    "mode": "single-agent"
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
