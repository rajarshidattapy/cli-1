/**
 * E2E tests for `unlayer init`
 *
 * Strategy: Spawn the real built CLI binary via execSync and verify the
 * scaffolded output on disk and JSON stdout.  Uses --json, --skip-connect,
 * --no-install flags for non-interactive execution.
 *
 * Prerequisite: `pnpm build` must have been run before these tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Helpers ──────────────────────────────────────────────────────────────────

const CLI = path.resolve(__dirname, '..', '..', '..', 'dist', 'index.js');

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unlayer-e2e-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Run the CLI and return stdout (the JSON payload).
 * stderr is suppressed — it contains Ink UI output we don't need.
 */
function run(args: string, opts?: { cwd?: string }): string {
  return execSync(`node ${CLI} ${args}`, {
    cwd: opts?.cwd ?? tmpDir,
    timeout: 30_000,
    env: { ...process.env, NO_COLOR: '1', CI: '1' },
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'], // capture stdout, suppress stderr
  }).toString();
}

/**
 * Run the CLI expecting it to fail — returns { status, stderr }.
 */
function runExpectError(args: string, opts?: { cwd?: string }): { status: number; stderr: string } {
  try {
    execSync(`node ${CLI} ${args}`, {
      cwd: opts?.cwd ?? tmpDir,
      timeout: 30_000,
      env: { ...process.env, NO_COLOR: '1', CI: '1' },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    throw new Error('Expected command to fail but it succeeded');
  } catch (err: unknown) {
    const e = err as { status: number; stderr: string | Buffer };
    return { status: e.status, stderr: String(e.stderr) };
  }
}

/** Shorthand: does a file exist relative to the project dir? */
function exists(projectName: string, ...segments: string[]): boolean {
  return fs.existsSync(path.join(tmpDir, projectName, ...segments));
}

/** Read a file from the scaffolded project */
function readFile(projectName: string, ...segments: string[]): string {
  return fs.readFileSync(path.join(tmpDir, projectName, ...segments), 'utf-8');
}

/** Parse JSON from a scaffolded project file */
function readJson(projectName: string, ...segments: string[]): unknown {
  return JSON.parse(readFile(projectName, ...segments));
}

// ─────────────────────────────────────────────────────────────────────────────
// nextjs
// ─────────────────────────────────────────────────────────────────────────────

describe('unlayer init — nextjs', () => {
  const name = 'test-nextjs';
  const base = () => `init ${name} -f nextjs -t adventure --no-install --skip-connect --json`;

  it('scaffolds correct file structure', () => {
    run(base());
    expect(exists(name, 'app', 'editor', 'page.tsx')).toBe(true);
    expect(exists(name, 'app', 'page.tsx')).toBe(true);
    expect(exists(name, 'app', 'layout.tsx')).toBe(true);
    expect(exists(name, 'package.json')).toBe(true);
    expect(exists(name, 'next.config.js')).toBe(true);
    expect(exists(name, 'tsconfig.json')).toBe(true);
    expect(exists(name, '.gitignore')).toBe(true);
    expect(exists(name, 'output', '.gitkeep')).toBe(true);
  });

  it('adventure design template is valid JSON with body.rows', () => {
    run(base());
    const design = readJson(name, 'public', 'designs', 'sample.json') as Record<string, unknown>;
    expect(design).toHaveProperty('body');
    const body = design.body as Record<string, unknown>;
    expect(Array.isArray(body.rows)).toBe(true);
    expect((body.rows as unknown[]).length).toBeGreaterThan(0);
  });

  it('product design template is valid JSON with body.rows', () => {
    run(`init ${name} -f nextjs -t product --no-install --skip-connect --json`);
    const design = readJson(name, 'public', 'designs', 'sample.json') as Record<string, unknown>;
    expect(design).toHaveProperty('body');
    expect(design).toHaveProperty('counters');
    const body = design.body as Record<string, unknown>;
    expect(Array.isArray(body.rows)).toBe(true);
    expect((body.rows as unknown[]).length).toBeGreaterThan(0);
  });

  it('blank design template has minimal structure', () => {
    run(`init ${name} -f nextjs -t blank --no-install --skip-connect --json`);
    const design = readJson(name, 'public', 'designs', 'sample.json') as Record<string, unknown>;
    expect(design).toHaveProperty('body');
    expect(design).toHaveProperty('counters');
    const body = design.body as Record<string, unknown>;
    expect(Array.isArray(body.rows)).toBe(true);
    expect((body.rows as unknown[]).length).toBe(1);
  });

  it('replaces {{PROJECT_NAME}} in package.json', () => {
    run(base());
    const pkg = readJson(name, 'package.json') as Record<string, unknown>;
    expect(pkg.name).toBe(name);
  });

  it('editor page contains projectId: 0 (default with --skip-connect)', () => {
    run(base());
    const editor = readFile(name, 'app', 'editor', 'page.tsx');
    expect(editor).toContain('projectId: 0');
    expect(editor).not.toContain('{{PROJECT_ID}}');
  });

  it('unlayer.config.json is created correctly', () => {
    run(base());
    const config = readJson(name, 'unlayer.config.json') as Record<string, unknown>;
    expect(config.projectId).toBeNull();
    expect(config).toHaveProperty('defaults');
    const defaults = config.defaults as Record<string, unknown>;
    expect(defaults.outputDir).toBe('./output');
    expect(config.$schema).toBe('https://unlayer.com/cli/config-schema.json');
  });

  it('JSON stdout output has correct fields', () => {
    const stdout = run(base());
    const json = JSON.parse(stdout);
    expect(json.project).toBe(name);
    expect(json.framework).toBe('nextjs');
    expect(json.template).toBe('adventure');
    expect(json.typescript).toBe(true);
    // macOS: /var is a symlink to /private/var — the CLI resolves the real path
    expect(json.path).toBe(fs.realpathSync(path.join(tmpDir, name)));
    expect(json.workspace).toBeNull();
    expect(json.project_connection).toBeNull();
  });

  it('exits with code 0 on success', () => {
    // If run() doesn't throw, exit code is 0
    const stdout = run(base());
    expect(stdout).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// vite-react
// ─────────────────────────────────────────────────────────────────────────────

describe('unlayer init — vite-react', () => {
  const name = 'test-vite-react';

  it('scaffolds correct file structure', () => {
    run(`init ${name} -f vite-react -t adventure --no-install --skip-connect --json`);
    expect(exists(name, 'src', 'pages', 'Editor.tsx')).toBe(true);
    expect(exists(name, 'src', 'pages', 'Home.tsx')).toBe(true);
    expect(exists(name, 'package.json')).toBe(true);
    expect(exists(name, 'vite.config.ts')).toBe(true);
    expect(exists(name, 'index.html')).toBe(true);
    expect(exists(name, 'tsconfig.json')).toBe(true);
  });

  it('adventure design is valid JSON', () => {
    run(`init ${name} -f vite-react -t adventure --no-install --skip-connect --json`);
    const design = readJson(name, 'public', 'designs', 'sample.json') as Record<string, unknown>;
    expect(design).toHaveProperty('body');
    const body = design.body as Record<string, unknown>;
    expect(Array.isArray(body.rows)).toBe(true);
  });

  it('replaces placeholders in editor page', () => {
    run(`init ${name} -f vite-react -t adventure --no-install --skip-connect --json`);
    const editor = readFile(name, 'src', 'pages', 'Editor.tsx');
    expect(editor).toContain('projectId: 0');
    expect(editor).not.toContain('{{PROJECT_ID}}');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// vite-vue
// ─────────────────────────────────────────────────────────────────────────────

describe('unlayer init — vite-vue', () => {
  const name = 'test-vite-vue';

  it('scaffolds correct file structure', () => {
    run(`init ${name} -f vite-vue -t adventure --no-install --skip-connect --json`);
    expect(exists(name, 'src', 'pages', 'Editor.vue')).toBe(true);
    expect(exists(name, 'src', 'pages', 'Home.vue')).toBe(true);
    expect(exists(name, 'package.json')).toBe(true);
    expect(exists(name, 'vite.config.ts')).toBe(true);
  });

  it('adventure design is valid JSON', () => {
    run(`init ${name} -f vite-vue -t adventure --no-install --skip-connect --json`);
    const design = readJson(name, 'public', 'designs', 'sample.json') as Record<string, unknown>;
    expect(design).toHaveProperty('body');
    const body = design.body as Record<string, unknown>;
    expect(Array.isArray(body.rows)).toBe(true);
  });

  it('Vue editor uses :project-id="0" pattern', () => {
    run(`init ${name} -f vite-vue -t adventure --no-install --skip-connect --json`);
    const editor = readFile(name, 'src', 'pages', 'Editor.vue');
    expect(editor).toContain(':project-id="0"');
    expect(editor).not.toContain('{{PROJECT_ID}}');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// nuxt
// ─────────────────────────────────────────────────────────────────────────────

describe('unlayer init — nuxt', () => {
  const name = 'test-nuxt';

  it('scaffolds correct file structure', () => {
    run(`init ${name} -f nuxt -t adventure --no-install --skip-connect --json`);
    expect(exists(name, 'pages', 'editor.vue')).toBe(true);
    expect(exists(name, 'pages', 'index.vue')).toBe(true);
    expect(exists(name, 'package.json')).toBe(true);
    expect(exists(name, 'nuxt.config.ts')).toBe(true);
    expect(exists(name, 'app.vue')).toBe(true);
  });

  it('adventure design is valid JSON', () => {
    run(`init ${name} -f nuxt -t adventure --no-install --skip-connect --json`);
    const design = readJson(name, 'public', 'designs', 'sample.json') as Record<string, unknown>;
    expect(design).toHaveProperty('body');
    const body = design.body as Record<string, unknown>;
    expect(Array.isArray(body.rows)).toBe(true);
  });

  it('Nuxt editor uses :project-id="0" pattern', () => {
    run(`init ${name} -f nuxt -t adventure --no-install --skip-connect --json`);
    const editor = readFile(name, 'pages', 'editor.vue');
    expect(editor).toContain(':project-id="0"');
    expect(editor).not.toContain('{{PROJECT_ID}}');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// vanilla
// ─────────────────────────────────────────────────────────────────────────────

describe('unlayer init — vanilla', () => {
  const name = 'test-vanilla';

  it('scaffolds correct file structure (no package.json)', () => {
    run(`init ${name} -f vanilla -t adventure --skip-connect --json`);
    expect(exists(name, 'editor.html')).toBe(true);
    expect(exists(name, 'index.html')).toBe(true);
    expect(exists(name, 'unlayer.config.json')).toBe(true);
    // vanilla has no package.json
    expect(exists(name, 'package.json')).toBe(false);
  });

  it('designs go to designs/ (not public/designs/)', () => {
    run(`init ${name} -f vanilla -t adventure --skip-connect --json`);
    expect(exists(name, 'designs', 'sample.json')).toBe(true);
    expect(exists(name, 'public', 'designs', 'sample.json')).toBe(false);
  });

  it('adventure design is valid JSON', () => {
    run(`init ${name} -f vanilla -t adventure --skip-connect --json`);
    const design = readJson(name, 'designs', 'sample.json') as Record<string, unknown>;
    expect(design).toHaveProperty('body');
    const body = design.body as Record<string, unknown>;
    expect(Array.isArray(body.rows)).toBe(true);
  });

  it('editor.html contains projectId: 0', () => {
    run(`init ${name} -f vanilla -t adventure --skip-connect --json`);
    const editor = readFile(name, 'editor.html');
    expect(editor).toContain('projectId: 0');
    expect(editor).not.toContain('{{PROJECT_ID}}');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────

describe('unlayer init — error handling', () => {
  it('rejects non-empty directory', () => {
    const name = 'test-nonempty';
    const dir = path.join(tmpDir, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'existing-file.txt'), 'hello');

    const { status, stderr } = runExpectError(
      `init ${name} -f nextjs -t adventure --no-install --skip-connect --json`,
    );
    expect(status).not.toBe(0);
    expect(stderr).toContain('already exists and is not empty');
  });

  it('rejects invalid framework', () => {
    const { status, stderr } = runExpectError(
      'init test-bad -f badframework -t adventure --no-install --skip-connect --json',
    );
    expect(status).not.toBe(0);
    expect(stderr).toContain('Invalid framework');
  });

  it('rejects invalid template', () => {
    const { status, stderr } = runExpectError(
      'init test-bad -f nextjs -t badtemplate --no-install --skip-connect --json',
    );
    expect(status).not.toBe(0);
    expect(stderr).toContain('Invalid template');
  });

  it('requires project name in non-interactive mode', () => {
    const { status, stderr } = runExpectError(
      'init -f nextjs -t adventure --no-install --skip-connect --json',
    );
    expect(status).not.toBe(0);
    expect(stderr).toContain('Non-interactive mode');
  });
});
