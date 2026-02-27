import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';

export interface AuthResult {
  token: string;
  tokenId: number | null;
  email: string;
}

export interface AuthServer {
  port: number;
  state: string;
  waitForAuth: () => Promise<AuthResult>;
  close: () => void;
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Unlayer CLI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f8f9fa;
      color: #333;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .checkmark {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">&#10003;</div>
    <h1>Authenticated!</h1>
    <p>You can close this tab and return to the terminal.</p>
  </div>
</body>
</html>`;

const ERROR_HTML = (message: string) => `<!DOCTYPE html>
<html>
<head>
  <title>Unlayer CLI - Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f8f9fa;
      color: #333;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #dc3545; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10007;</div>
    <h1>Authentication Failed</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;

/** Escape HTML special characters to prevent XSS in error pages. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Start a localhost HTTP server that waits for an auth callback.
 *
 * The server:
 * - Binds to 127.0.0.1 only (not exposed to network)
 * - Uses a random OS-assigned port (no conflicts)
 * - Generates a cryptographic state parameter for CSRF prevention
 * - Listens for GET /callback?token=...&state=...&email=...
 * - Validates state matches to prevent CSRF
 * - Responds with an HTML success page
 * - Times out after 5 minutes (configurable)
 */
export async function startAuthServer(options?: {
  timeout?: number;
}): Promise<AuthServer> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const state = randomBytes(32).toString('hex');

  let server: Server;
  let resolveAuth: (result: AuthResult) => void;
  let rejectAuth: (error: Error) => void;
  let timeoutId: ReturnType<typeof setTimeout>;

  const authPromise = new Promise<AuthResult>((resolve, reject) => {
    resolveAuth = resolve;
    rejectAuth = reject;
  });

  server = createServer((req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1`);

    // Only handle GET /callback
    if (req.method !== 'GET' || url.pathname !== '/callback') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const callbackToken = url.searchParams.get('token');
    const callbackState = url.searchParams.get('state');
    const callbackEmail = url.searchParams.get('email') || '';
    const callbackTokenId = url.searchParams.get('tokenId');

    // Validate state parameter
    if (callbackState !== state) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(ERROR_HTML('Invalid state parameter. Please try logging in again.'));
      return;
    }

    // Validate token presence
    if (!callbackToken) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(ERROR_HTML('No token received. Please try logging in again.'));
      return;
    }

    // Success - send HTML response and resolve
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(SUCCESS_HTML);

    clearTimeout(timeoutId);
    const parsedTokenId = callbackTokenId ? parseInt(callbackTokenId, 10) : null;
    resolveAuth!({
      token: callbackToken,
      tokenId: Number.isNaN(parsedTokenId) ? null : parsedTokenId,
      email: callbackEmail,
    });
  });

  // Bind to localhost only
  await new Promise<void>((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });

  const address = server.address();
  const port =
    typeof address === 'object' && address !== null ? address.port : 0;

  // Set up timeout
  timeoutId = setTimeout(() => {
    rejectAuth!(
      new Error(
        `Authentication timed out after ${Math.round(timeout / 1000 / 60)} minutes. Please try again.`,
      ),
    );
    server.close();
  }, timeout);

  return {
    port,
    state,
    waitForAuth: () => authPromise,
    close: () => {
      clearTimeout(timeoutId);
      server.close();
    },
  };
}
