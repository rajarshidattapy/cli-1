/**
 * Unit tests for src/lib/config.ts
 *
 * Strategy: We mock `conf` so the real Conf singleton never touches disk, and
 * mock `../project-config.js` so we can inject project-level env data.
 * process.env is saved/restored around every test.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

// In-memory store that replaces the Conf instance
const store = new Map<string, unknown>();

vi.mock('conf', () => {
  return {
    default: class FakeConf {
      constructor() {
        // start fresh per import (reset is handled in beforeEach)
      }
      get(key: string) {
        return store.get(key);
      }
      set(key: string, value: unknown) {
        store.set(key, value);
      }
      delete(key: string) {
        store.delete(key);
      }
      clear() {
        store.clear();
      }
      get path() {
        return '/fake/config/path.json';
      }
    },
  };
});

// Controllable project config mock
let mockProjectConfig: Record<string, unknown> | null = null;
vi.mock('../project-config.js', () => ({
  getProjectConfig: () => mockProjectConfig,
}));

// Silence verbose logging and cli-flags
vi.mock('../verbose.js', () => ({ verboseLog: () => {} }));
vi.mock('../cli-flags.js', () => ({
  isJsonMode: () => false,
  isVerbose: () => false,
}));

// ── Import SUT after mocks are registered ────────────────────────────────────

import {
  DEFAULT_API_URL,
  getApiUrl,
  getConsoleUrl,
  getAccountsUrl,
  getEnvironments,
  getActiveEnvironment,
  setActiveEnvironment,
  addEnvironment,
  removeEnvironment,
  getActiveEnvironmentUrls,
} from '../config.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEV_ENV = {
  apiUrl: 'https://api.dev.unlayer.com',
  consoleUrl: 'https://console.dev.unlayer.com',
  accountsUrl: 'https://accounts.dev.unlayer.com',
};

const STAGING_ENV = {
  apiUrl: 'https://api.staging.unlayer.com',
  consoleUrl: 'https://console.staging.unlayer.com',
  accountsUrl: 'https://accounts.staging.unlayer.com',
};

let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
  store.clear();
  mockProjectConfig = null;
});

afterEach(() => {
  process.env = savedEnv;
});

// ─────────────────────────────────────────────────────────────────────────────
// URL Resolution Chain
// ─────────────────────────────────────────────────────────────────────────────

describe('getApiUrl()', () => {
  it('returns env var when UNLAYER_API_URL is set', () => {
    process.env.UNLAYER_API_URL = 'https://custom-api.example.com';
    expect(getApiUrl()).toBe('https://custom-api.example.com');
  });

  it('returns active environment URL when no env var', () => {
    addEnvironment('dev', DEV_ENV);
    setActiveEnvironment('dev');
    expect(getApiUrl()).toBe('https://api.dev.unlayer.com');
  });

  it('returns stored config apiUrl when no env var and no active env', () => {
    store.set('apiUrl', 'https://stored-api.example.com');
    expect(getApiUrl()).toBe('https://stored-api.example.com');
  });

  it('returns default when nothing is configured', () => {
    expect(getApiUrl()).toBe(DEFAULT_API_URL);
  });

  it('env var wins over active environment', () => {
    process.env.UNLAYER_API_URL = 'https://env-var-api.example.com';
    addEnvironment('dev', DEV_ENV);
    setActiveEnvironment('dev');
    expect(getApiUrl()).toBe('https://env-var-api.example.com');
  });
});

describe('getConsoleUrl()', () => {
  it('returns env var when UNLAYER_CONSOLE_URL is set', () => {
    process.env.UNLAYER_CONSOLE_URL = 'https://custom-console.example.com';
    expect(getConsoleUrl()).toBe('https://custom-console.example.com');
  });

  it('returns active environment URL when no env var', () => {
    addEnvironment('dev', DEV_ENV);
    setActiveEnvironment('dev');
    expect(getConsoleUrl()).toBe('https://console.dev.unlayer.com');
  });

  it('returns default when nothing is configured', () => {
    expect(getConsoleUrl()).toBe('https://console.unlayer.com');
  });

  it('strips trailing slash from env var', () => {
    process.env.UNLAYER_CONSOLE_URL = 'https://console.example.com///';
    expect(getConsoleUrl()).toBe('https://console.example.com');
  });

  it('strips trailing slash from active environment URL', () => {
    addEnvironment('dev', {
      ...DEV_ENV,
      consoleUrl: 'https://console.dev.unlayer.com/',
    });
    setActiveEnvironment('dev');
    expect(getConsoleUrl()).toBe('https://console.dev.unlayer.com');
  });
});

describe('getAccountsUrl()', () => {
  it('returns env var when UNLAYER_ACCOUNTS_URL is set', () => {
    process.env.UNLAYER_ACCOUNTS_URL = 'https://custom-accounts.example.com';
    expect(getAccountsUrl()).toBe('https://custom-accounts.example.com');
  });

  it('returns active environment URL when no env var', () => {
    addEnvironment('dev', DEV_ENV);
    setActiveEnvironment('dev');
    expect(getAccountsUrl()).toBe('https://accounts.dev.unlayer.com');
  });

  it('returns default when nothing is configured', () => {
    expect(getAccountsUrl()).toBe('https://accounts.unlayer.com');
  });

  it('strips trailing slash from env var', () => {
    process.env.UNLAYER_ACCOUNTS_URL = 'https://accounts.example.com/';
    expect(getAccountsUrl()).toBe('https://accounts.example.com');
  });

  it('strips trailing slash from active environment URL', () => {
    addEnvironment('dev', {
      ...DEV_ENV,
      accountsUrl: 'https://accounts.dev.unlayer.com/',
    });
    setActiveEnvironment('dev');
    expect(getAccountsUrl()).toBe('https://accounts.dev.unlayer.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Environment CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe('addEnvironment()', () => {
  it('stores an environment retrievable via getEnvironments()', () => {
    addEnvironment('dev', DEV_ENV);
    const envs = getEnvironments();
    expect(envs.dev).toMatchObject(DEV_ENV);
  });

  it('overwrites an existing environment with the same name', () => {
    addEnvironment('dev', DEV_ENV);
    const updated = {
      apiUrl: 'https://api.dev2.unlayer.com',
      consoleUrl: 'https://console.dev2.unlayer.com',
      accountsUrl: 'https://accounts.dev2.unlayer.com',
    };
    addEnvironment('dev', updated);
    const envs = getEnvironments();
    expect(envs.dev).toMatchObject(updated);
  });
});

describe('removeEnvironment()', () => {
  it('returns true and removes an existing environment', () => {
    addEnvironment('dev', DEV_ENV);
    expect(removeEnvironment('dev')).toBe(true);
    expect(getEnvironments().dev).toBeUndefined();
  });

  it('returns false for a non-existent environment', () => {
    expect(removeEnvironment('nope')).toBe(false);
  });

  it('clears active environment when the active one is removed', () => {
    addEnvironment('dev', DEV_ENV);
    setActiveEnvironment('dev');
    removeEnvironment('dev');
    expect(getActiveEnvironment()).toBeNull();
  });
});

describe('setActiveEnvironment()', () => {
  it('persists the active environment name', () => {
    addEnvironment('dev', DEV_ENV);
    setActiveEnvironment('dev');
    expect(getActiveEnvironment()).toBe('dev');
  });

  it('clears active environment when set to null', () => {
    setActiveEnvironment('dev');
    setActiveEnvironment(null);
    expect(getActiveEnvironment()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Environment Merge (getEnvironments)
// ─────────────────────────────────────────────────────────────────────────────

describe('getEnvironments()', () => {
  it('returns global environments with source "global"', () => {
    addEnvironment('dev', DEV_ENV);
    const envs = getEnvironments();
    expect(envs.dev.source).toBe('global');
  });

  it('returns project environments with source "project"', () => {
    mockProjectConfig = {
      environments: { staging: STAGING_ENV },
    };
    const envs = getEnvironments();
    expect(envs.staging).toMatchObject({ ...STAGING_ENV, source: 'project' });
  });

  it('global overrides project when both have the same name', () => {
    mockProjectConfig = {
      environments: { dev: STAGING_ENV },
    };
    addEnvironment('dev', DEV_ENV);
    const envs = getEnvironments();
    expect(envs.dev.apiUrl).toBe(DEV_ENV.apiUrl);
    expect(envs.dev.source).toBe('global');
  });

  it('skips malformed entries missing required fields', () => {
    mockProjectConfig = {
      environments: {
        good: STAGING_ENV,
        bad: { apiUrl: 'https://api.bad.com' }, // missing consoleUrl, accountsUrl
      },
    };
    const envs = getEnvironments();
    expect(envs.good).toBeDefined();
    expect(envs.bad).toBeUndefined();
  });

  it('returns empty object when no environments exist', () => {
    expect(getEnvironments()).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getActiveEnvironmentUrls()
// ─────────────────────────────────────────────────────────────────────────────

describe('getActiveEnvironmentUrls()', () => {
  it('returns EnvironmentUrls when an active environment exists', () => {
    addEnvironment('dev', DEV_ENV);
    setActiveEnvironment('dev');
    expect(getActiveEnvironmentUrls()).toEqual(DEV_ENV);
  });

  it('returns null when no active environment is set', () => {
    addEnvironment('dev', DEV_ENV);
    expect(getActiveEnvironmentUrls()).toBeNull();
  });

  it('returns null when active environment references a deleted env', () => {
    store.set('activeEnvironment', 'deleted');
    expect(getActiveEnvironmentUrls()).toBeNull();
  });
});
