#!/usr/bin/env node

import { execSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";

function sanitizeSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function extractGitUserDigits(cwd) {
  const candidates = [
    process.env.GIT_AUTHOR_NAME,
    process.env.GIT_COMMITTER_NAME
  ].filter(Boolean);

  try {
    const configured = execSync("git config user.name", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: true
    }).trim();

    if (configured) {
      candidates.push(configured);
    }
  } catch (error) {
    void error;
  }

  for (const candidate of candidates) {
    const match = candidate.match(/(\d+)/);
    if (match) {
      return match[1];
    }
  }

  return "";
}

function buildFallbackBranch(pattern, tdId, featureSlug) {
  return pattern
    .replace("{td_id}", tdId)
    .replace("{feature_slug}", featureSlug || "update");
}

export function createBranch(tdId, slug = "change-me", options = {}) {
  const { config } = loadConfig(options);
  const featureSlug = sanitizeSlug(slug) || "update";
  const fallbackPattern = config.branchNaming?.fallbackPattern || "fix/{td_id}-{feature_slug}";
  const targetBranch = config.defaultTargetBranch || "master";
  const mode = config.branchNaming?.mode || "from-target-branch-template";
  const repoCwd = options.cwd ?? process.cwd();

  if (mode !== "from-target-branch-template" || !targetBranch.includes("/")) {
    return {
      branch: buildFallbackBranch(fallbackPattern, tdId, featureSlug),
      strategy: "fallback"
    };
  }

  const segments = targetBranch.split("/").filter(Boolean);
  if (segments.length < 2) {
    return {
      branch: buildFallbackBranch(fallbackPattern, tdId, featureSlug),
      strategy: "fallback"
    };
  }

  const userDigits = extractGitUserDigits(repoCwd);
  const firstReplacement = config.branchNaming?.replaceFirstSegmentWith === "git-user-digits"
    ? (userDigits || segments[0])
    : segments[0];
  const lastReplacement = config.branchNaming?.replaceLastSegmentWith === "feature-slug"
    ? featureSlug
    : segments[segments.length - 1];

  const branchSegments = [...segments];
  branchSegments[0] = firstReplacement;
  branchSegments[branchSegments.length - 1] = lastReplacement;

  return {
    branch: branchSegments.join("/"),
    strategy: "target-branch-template",
    target_branch_template: targetBranch,
    git_user_digits: userDigits || null
  };
}

function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const tdId = positional[0] || "TD-XXXX";
  const slug = positional[1] || "change-me";

  console.log(JSON.stringify(createBranch(tdId, slug, {
    cwd: flags.cwd,
    configPath: flags.config
  }), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
