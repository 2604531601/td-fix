import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CONFIG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "config",
  "default.config.json"
);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isObject(base) || !isObject(override)) {
    return override;
  }

  const merged = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(base[key])) {
      merged[key] = deepMerge(base[key], value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function findRepoConfig(cwd = process.cwd()) {
  const localConfigPath = path.join(cwd, ".td-fix.json");
  if (fs.existsSync(localConfigPath)) {
    return localConfigPath;
  }

  return null;
}

export function loadConfig(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const explicitConfigPath = options.configPath
    ? path.resolve(cwd, options.configPath)
    : null;
  const repoConfigPath = explicitConfigPath ?? findRepoConfig(cwd);

  const defaultConfig = readJson(DEFAULT_CONFIG_PATH);
  const repoConfig = repoConfigPath && fs.existsSync(repoConfigPath)
    ? readJson(repoConfigPath)
    : {};

  const config = deepMerge(defaultConfig, repoConfig);

  return {
    config,
    configPaths: {
      defaultConfigPath: DEFAULT_CONFIG_PATH,
      repoConfigPath
    }
  };
}
