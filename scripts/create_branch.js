#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseCliArgs } from "./lib/cli.js";

export function createBranch(tdId, slug = "change-me") {
  const sanitizedSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const branch = `fix/${tdId}-${sanitizedSlug || "update"}`;

  return { branch };
}

function main() {
  const { positional } = parseCliArgs(process.argv.slice(2));
  const tdId = positional[0] || "TD-XXXX";
  const slug = positional[1] || "change-me";

  console.log(JSON.stringify(createBranch(tdId, slug), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
