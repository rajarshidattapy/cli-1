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
} from '../config.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  it('returns default prod URL when nothing is configured', () => {
    expect(getApiUrl()).toBe(DEFAULT_API_URL);
  });

  it('returns env var when UNLAYER_API_URL is set', () => {
    process.env.UNLAYER_API_URL = 'https://custom-api.example.com';
    expect(getApiUrl()).toBe('https://custom-api.example.com');
  });

  it('returns stored config apiUrl when no env var', () => {
    store.set('apiUrl', 'https://stored-api.example.com');
    expect(getApiUrl()).toBe('https://stored-api.example.com');
  });
});

describe('getConsoleUrl()', () => {
  it('returns default prod URL when nothing is configured', () => {
    expect(getConsoleUrl()).toBe('https://console.unlayer.com');
  });

  it('returns env var when UNLAYER_CONSOLE_URL is set', () => {
    process.env.UNLAYER_CONSOLE_URL = 'https://custom-console.example.com';
    expect(getConsoleUrl()).toBe('https://custom-console.example.com');
  });

  it('strips trailing slash from env var', () => {
    process.env.UNLAYER_CONSOLE_URL = 'https://console.example.com///';
    expect(getConsoleUrl()).toBe('https://console.example.com');
  });
});

describe('getAccountsUrl()', () => {
  it('returns default prod URL when nothing is configured', () => {
    expect(getAccountsUrl()).toBe('https://accounts.unlayer.com');
  });

  it('returns env var when UNLAYER_ACCOUNTS_URL is set', () => {
    process.env.UNLAYER_ACCOUNTS_URL = 'https://custom-accounts.example.com';
    expect(getAccountsUrl()).toBe('https://custom-accounts.example.com');
  });

  it('strips trailing slash from env var', () => {
    process.env.UNLAYER_ACCOUNTS_URL = 'https://accounts.example.com/';
    expect(getAccountsUrl()).toBe('https://accounts.example.com');
  });
});
