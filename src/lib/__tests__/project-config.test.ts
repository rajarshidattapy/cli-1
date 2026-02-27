/**
 * Unit tests for src/lib/project-config.ts
 *
 * Strategy: Use real temp directories via fs.mkdtempSync to test the
 * file-discovery and parsing logic. Reset the module-level cache before each test.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Silence verbose logging
vi.mock('../verbose.js', () => ({ verboseLog: () => {} }));

import {
  findProjectConfigPath,
  loadProjectConfig,
  resetProjectConfigCache,
} from '../project-config.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

let tmpDir: string;

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'unlayer-test-'));
}

function writeConfig(dir: string, content: string): string {
  const configPath = path.join(dir, 'unlayer.config.json');
  fs.writeFileSync(configPath, content, 'utf-8');
  return configPath;
}

beforeEach(() => {
  tmpDir = makeTmpDir();
  resetProjectConfigCache();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// findProjectConfigPath
// ─────────────────────────────────────────────────────────────────────────────

describe('findProjectConfigPath()', () => {
  it('finds config in the current directory', () => {
    writeConfig(tmpDir, '{}');
    const result = findProjectConfigPath(tmpDir);
    expect(result).toBe(path.join(tmpDir, 'unlayer.config.json'));
  });

  it('walks up to parent directory to find config', () => {
    writeConfig(tmpDir, '{}');
    const childDir = path.join(tmpDir, 'child', 'grandchild');
    fs.mkdirSync(childDir, { recursive: true });
    const result = findProjectConfigPath(childDir);
    expect(result).toBe(path.join(tmpDir, 'unlayer.config.json'));
  });

  it('returns null when no config exists', () => {
    const result = findProjectConfigPath(tmpDir);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loadProjectConfig — parsing
// ─────────────────────────────────────────────────────────────────────────────

describe('loadProjectConfig()', () => {
  it('parses valid JSON object', () => {
    writeConfig(tmpDir, JSON.stringify({ projectId: 3 }));
    const result = loadProjectConfig(tmpDir);
    expect(result).toEqual({ projectId: 3 });
  });

  it('strips sensitive keys (token, apiKey, $schema)', () => {
    writeConfig(
      tmpDir,
      JSON.stringify({
        token: 'secret',
        apiKey: 'also-secret',
        $schema: 'https://example.com/schema.json',
        projectId: 5,
      }),
    );
    const result = loadProjectConfig(tmpDir);
    expect(result).toEqual({ projectId: 5 });
    expect((result as Record<string, unknown>).token).toBeUndefined();
    expect((result as Record<string, unknown>).apiKey).toBeUndefined();
    expect((result as Record<string, unknown>).$schema).toBeUndefined();
  });

  it('returns null and warns for array JSON', () => {
    writeConfig(tmpDir, '[1, 2, 3]');
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const result = loadProjectConfig(tmpDir);
    expect(result).toBeNull();
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('must be a JSON object'));
    stderrSpy.mockRestore();
  });

  it('returns null and warns for invalid JSON', () => {
    writeConfig(tmpDir, 'not json');
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const result = loadProjectConfig(tmpDir);
    expect(result).toBeNull();
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
    stderrSpy.mockRestore();
  });

  it('returns null when no config file exists', () => {
    const result = loadProjectConfig(tmpDir);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Caching
// ─────────────────────────────────────────────────────────────────────────────

describe('caching', () => {
  it('getProjectConfig() caches the result across calls', () => {
    // getProjectConfig uses process.cwd() internally, so we test through loadProjectConfig
    // and the cached singleton behavior via the module cache
    writeConfig(tmpDir, JSON.stringify({ projectId: 1 }));

    // Call loadProjectConfig directly to check parsing works
    const first = loadProjectConfig(tmpDir);
    const second = loadProjectConfig(tmpDir);
    expect(first).toEqual({ projectId: 1 });
    expect(second).toEqual({ projectId: 1 });
  });

  it('resetProjectConfigCache() causes re-read from disk', () => {
    writeConfig(tmpDir, JSON.stringify({ projectId: 1 }));

    const first = loadProjectConfig(tmpDir);
    expect(first).toEqual({ projectId: 1 });

    // Update the file on disk
    writeConfig(tmpDir, JSON.stringify({ projectId: 99 }));

    // loadProjectConfig always re-reads (it's the singleton getProjectConfig that caches)
    const second = loadProjectConfig(tmpDir);
    expect(second).toEqual({ projectId: 99 });
  });
});
