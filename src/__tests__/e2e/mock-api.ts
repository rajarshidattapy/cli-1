/**
 * Mock HTTP server that mimics the Unlayer API for E2E testing.
 *
 * Handles the two SDK endpoints used by the connect flow:
 *   GET /v3/workspaces        → list workspace summaries
 *   GET /v3/workspaces/:id    → retrieve workspace with projects
 *
 * Validates the Bearer token from the Authorization header.
 */

import * as http from 'http';

export interface MockProject {
  id: number;
  name: string;
  status?: string;
}

export interface MockWorkspace {
  id: number;
  name: string;
  projects: MockProject[];
}

export interface MockApiOptions {
  /** Valid Bearer token the server will accept. */
  validToken: string;
  /** Workspaces (with nested projects) to return. */
  workspaces: MockWorkspace[];
}

export interface MockApiServer {
  /** The port the server is listening on. */
  port: number;
  /** Base URL for the mock server (e.g. http://localhost:12345). */
  url: string;
  /** Stop the server. */
  stop: () => Promise<void>;
}

/**
 * Start a mock API server on a random available port.
 */
export function startMockApi(options: MockApiOptions): Promise<MockApiServer> {
  const { validToken, workspaces } = options;

  const server = http.createServer((req, res) => {
    // ── Auth check ──────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${validToken}`) {
      res.writeHead(401, {
        'Content-Type': 'application/json',
        'x-should-retry': 'false',
      });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    // ── GET /v3/workspaces ──────────────────────────────
    if (req.method === 'GET' && pathname === '/v3/workspaces') {
      const summaries = workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: summaries }));
      return;
    }

    // ── GET /v3/workspaces/:id ──────────────────────────
    const wsMatch = pathname.match(/^\/v3\/workspaces\/(\d+)$/);
    if (req.method === 'GET' && wsMatch) {
      const wsId = parseInt(wsMatch[1]!, 10);
      const ws = workspaces.find((w) => w.id === wsId);
      if (!ws) {
        res.writeHead(404, {
          'Content-Type': 'application/json',
          'x-should-retry': 'false',
        });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          data: {
            id: ws.id,
            name: ws.name,
            projects: ws.projects,
          },
        }),
      );
      return;
    }

    // ── Fallback 404 ────────────────────────────────────
    res.writeHead(404, {
      'Content-Type': 'application/json',
      'x-should-retry': 'false',
    });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }
      const port = addr.port;
      resolve({
        port,
        url: `http://127.0.0.1:${port}`,
        stop: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
    server.on('error', reject);
  });
}
