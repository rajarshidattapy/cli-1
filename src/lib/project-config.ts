/**
 * Project-level configuration file support.
 *
 * Walks up from cwd() looking for `unlayer.config.json` (like .gitignore resolution).
 * Results are cached for the process lifetime.
 *
 * Security: `token`, `apiKey`, and `$schema` keys are stripped from the parsed object
 * so that project config files checked into source control cannot leak credentials.
 */

import * as fs from 'fs';
import * as path from 'path';
import { verboseLog } from './verbose.js';

export interface ProjectConfig {
  projectId?: number | null;
  defaults?: {
    outputDir?: string;
  };
  environments?: Record<string, {
    apiUrl: string;
    consoleUrl: string;
    accountsUrl: string;
  }>;
}

const CONFIG_FILENAME = 'unlayer.config.json';

/** Keys that must never be read from a project config file. */
const STRIPPED_KEYS = ['token', 'apiKey', '$schema'];

let cachedConfig: ProjectConfig | null | undefined; // undefined = not yet loaded
let cachedConfigPath: string | null | undefined;

/**
 * Walk up the directory tree from `startDir` looking for `unlayer.config.json`.
 * Returns the full path if found, null otherwise.
 */
export function findProjectConfigPath(startDir?: string): string | null {
  let dir = startDir || process.cwd();

  while (true) {
    const candidate = path.join(dir, CONFIG_FILENAME);
    try {
      fs.accessSync(candidate, fs.constants.R_OK);
      return candidate;
    } catch {
      // Not found at this level — go up
    }

    const parent = path.dirname(dir);
    if (parent === dir) break; // reached root
    dir = parent;
  }

  return null;
}

/**
 * Load and parse the nearest `unlayer.config.json`.
 * Returns null if not found or on parse error (warns to stderr).
 */
export function loadProjectConfig(startDir?: string): ProjectConfig | null {
  const configPath = findProjectConfigPath(startDir);
  if (!configPath) {
    return null;
  }

  verboseLog(`Found project config: ${configPath}`);

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      process.stderr.write(`Warning: ${configPath} must be a JSON object, ignoring.\n`);
      return null;
    }

    // Strip sensitive / schema keys
    for (const key of STRIPPED_KEYS) {
      delete parsed[key];
    }

    return parsed as ProjectConfig;
  } catch (err) {
    process.stderr.write(
      `Warning: Failed to parse ${configPath}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return null;
  }
}

/**
 * Get the project config (cached singleton).
 * First call loads from disk; subsequent calls return the cached result.
 */
export function getProjectConfig(): ProjectConfig | null {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }
  cachedConfig = loadProjectConfig();
  return cachedConfig;
}

/**
 * Get the path to the discovered project config file (cached).
 */
export function getProjectConfigPath(): string | null {
  if (cachedConfigPath !== undefined) {
    return cachedConfigPath;
  }
  cachedConfigPath = findProjectConfigPath();
  return cachedConfigPath;
}

/**
 * Reset the cache — useful for testing.
 */
export function resetProjectConfigCache(): void {
  cachedConfig = undefined;
  cachedConfigPath = undefined;
}
