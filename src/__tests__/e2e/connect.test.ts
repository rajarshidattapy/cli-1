/**
 * E2E tests for `unlayer init` connect flow
 *
 * Strategy: Spawn the real built CLI binary with --workspace-id and
 * --project-id flags, pointed at a local mock API server.
 *
 * IMPORTANT: We use child_process.exec (async) instead of execSync because
 * the mock HTTP server runs on the same Node.js event loop.  execSync would
 * block the event loop and prevent the server from responding.
 *
 * Prerequisite: `pnpm build` must have been run before these tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { startMockApi, type MockApiServer } from './mock-api.js';

// ── Constants ────────────────────────────────────────────────────────────────

const CLI = path.resolve(__dirname, '..', '..', '..', 'dist', 'index.js');
const VALID_TOKEN = 'unlayer_pat_test_e2e_token';

const MOCK_WORKSPACES = [
  {
    id: 1,
    name: 'Test Workspace',
    projects: [
      { id: 42, name: 'Email Campaign', status: 'active' },
      { id: 43, name: 'Newsletter', status: 'active' },
    ],
  },
  {
    id: 2,
    name: 'Second Workspace',
    projects: [
      { id: 100, name: 'Landing Page', status: 'active' },
    ],
  },
  {
    id: 3,
    name: 'Empty Workspace',
    projects: [],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

let mockApi: MockApiServer;
let tmpDir: string;

beforeAll(async () => {
  mockApi = await startMockApi({
    validToken: VALID_TOKEN,
    workspaces: MOCK_WORKSPACES,
  });
});

afterAll(async () => {
  await mockApi.stop();
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unlayer-e2e-connect-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Build env vars for CLI with mock API. */
function mockEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: Record<string, string | undefined> = {
    ...process.env,
    NO_COLOR: '1',
    CI: '1',
    UNLAYER_TOKEN: VALID_TOKEN,
    UNLAYER_API_URL: mockApi.url,
    // Prevent the SDK from picking up env vars meant for the real API
    UNLAYER_PERSONAL_ACCESS_TOKEN: undefined,
    UNLAYER_BASE_URL: undefined,
    ...overrides,
  };
  // Remove undefined values (exec doesn't handle them)
  for (const key of Object.keys(env)) {
    if (env[key] === undefined) delete env[key];
  }
  return env as NodeJS.ProcessEnv;
}

/** Result from a failed CLI run. */
interface CliError {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

/** Run the CLI asynchronously (keeps event loop alive for mock server). */
function runAsync(
  args: string,
  opts?: { env?: NodeJS.ProcessEnv },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(
      `node ${CLI} ${args}`,
      {
        cwd: tmpDir,
        timeout: 30_000,
        env: opts?.env ?? mockEnv(),
        encoding: 'utf-8',
      },
      (error, stdout, stderr) => {
        if (error) {
          const cliErr: CliError = {
            exitCode: error.code ?? null,
            stdout: String(stdout),
            stderr: String(stderr),
          };
          reject(cliErr);
        } else {
          resolve({ stdout: String(stdout), stderr: String(stderr) });
        }
      },
    );
  });
}

/** Run the CLI expecting it to fail. */
async function runExpectError(
  args: string,
  opts?: { env?: NodeJS.ProcessEnv },
): Promise<CliError> {
  try {
    await runAsync(args, opts);
    throw new Error('Expected command to fail but it succeeded');
  } catch (err: unknown) {
    if (err instanceof Error) throw err;
    return err as CliError;
  }
}

/** Read a file from the scaffolded project. */
function readFile(projectName: string, ...segments: string[]): string {
  return fs.readFileSync(path.join(tmpDir, projectName, ...segments), 'utf-8');
}

/** Parse JSON from a scaffolded project file. */
function readJson(projectName: string, ...segments: string[]): unknown {
  return JSON.parse(readFile(projectName, ...segments));
}

// ─────────────────────────────────────────────────────────────────────────────
// Happy path
// ─────────────────────────────────────────────────────────────────────────────

describe('unlayer init — connect flow (happy path)', () => {
  const name = 'test-connect';

  it('patches unlayer.config.json with the correct projectId', async () => {
    await runAsync(
      `init ${name} -f nextjs -t adventure --no-install --workspace-id 1 --project-id 42 --json`,
    );
    const config = readJson(name, 'unlayer.config.json') as Record<string, unknown>;
    expect(config.projectId).toBe(42);
  });

  it('patches nextjs editor source with projectId', async () => {
    await runAsync(
      `init ${name} -f nextjs -t adventure --no-install --workspace-id 1 --project-id 42 --json`,
    );
    const editor = readFile(name, 'app', 'editor', 'page.tsx');
    expect(editor).toContain('projectId: 42');
    expect(editor).not.toContain('projectId: 0');
  });

  it('patches vite-vue editor source with :project-id="42"', async () => {
    await runAsync(
      `init ${name} -f vite-vue -t adventure --no-install --workspace-id 1 --project-id 42 --json`,
    );
    const editor = readFile(name, 'src', 'pages', 'Editor.vue');
    expect(editor).toContain(':project-id="42"');
    expect(editor).not.toContain(':project-id="0"');
  });

  it('JSON stdout includes workspace and project_connection', async () => {
    const { stdout } = await runAsync(
      `init ${name} -f nextjs -t adventure --no-install --workspace-id 1 --project-id 42 --json`,
    );
    const json = JSON.parse(stdout);
    expect(json.workspace).toEqual({ id: 1, name: 'Test Workspace' });
    expect(json.project_connection).toEqual({ id: 42, name: 'Email Campaign' });
  });

  it('selects the correct workspace when multiple exist', async () => {
    const { stdout } = await runAsync(
      `init ${name} -f nextjs -t adventure --no-install --workspace-id 2 --project-id 100 --json`,
    );
    const json = JSON.parse(stdout);
    expect(json.workspace).toEqual({ id: 2, name: 'Second Workspace' });
    expect(json.project_connection).toEqual({ id: 100, name: 'Landing Page' });
  });

  it('selects a different project within the same workspace', async () => {
    const { stdout } = await runAsync(
      `init ${name} -f nextjs -t adventure --no-install --workspace-id 1 --project-id 43 --json`,
    );
    const json = JSON.parse(stdout);
    expect(json.project_connection).toEqual({ id: 43, name: 'Newsletter' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error cases
// ─────────────────────────────────────────────────────────────────────────────

describe('unlayer init — connect flow (error cases)', () => {
  const name = 'test-connect-err';

  it('fails when token is invalid (401)', async () => {
    const { exitCode, stderr } = await runExpectError(
      `init ${name} -f nextjs -t adventure --no-install --workspace-id 1 --project-id 42 --json`,
      { env: mockEnv({ UNLAYER_TOKEN: 'unlayer_pat_bad_token' }) },
    );
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('Failed to connect');
  });

  it('fails when workspace is not found', async () => {
    const { exitCode, stderr } = await runExpectError(
      `init ${name} -f nextjs -t adventure --no-install --workspace-id 999 --project-id 42 --json`,
    );
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('Workspace 999 not found');
  });

  it('fails when project is not found in the workspace', async () => {
    const { exitCode, stderr } = await runExpectError(
      `init ${name} -f nextjs -t adventure --no-install --workspace-id 1 --project-id 999 --json`,
    );
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('Project 999 not found');
    expect(stderr).toContain('Test Workspace');
  });

  it('falls through to done (skip-connect behavior) when token is missing', async () => {
    // Without UNLAYER_TOKEN and no stored token, hasAutoConnect is false
    // → falls to normal non-interactive path → done
    const { stdout } = await runAsync(
      `init ${name} -f nextjs -t adventure --no-install --skip-connect --json`,
      { env: mockEnv({ UNLAYER_TOKEN: undefined }) },
    );
    const json = JSON.parse(stdout);
    expect(json.workspace).toBeNull();
    expect(json.project_connection).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('unlayer init — connect flow (edge cases)', () => {
  const name = 'test-connect-edge';

  it('fails for project not found when workspace has no projects', async () => {
    const { exitCode, stderr } = await runExpectError(
      `init ${name} -f nextjs -t adventure --no-install --workspace-id 3 --project-id 1 --json`,
    );
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('Project 1 not found');
    expect(stderr).toContain('Empty Workspace');
  });

  it('patches vanilla editor.html with projectId', async () => {
    await runAsync(
      `init ${name} -f vanilla -t adventure --workspace-id 1 --project-id 42 --json`,
    );
    const editor = readFile(name, 'editor.html');
    expect(editor).toContain('projectId: 42');
    expect(editor).not.toContain('projectId: 0');
  });
});
