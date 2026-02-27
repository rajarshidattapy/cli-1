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

const SUCCESS_HTML = (email: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unlayer CLI — Authenticated</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #F7F8F9;
      color: #172029;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      padding: 1.5rem;
      animation: fadeIn 600ms ease-out both;
    }

    .card {
      position: relative;
      background: #FFFFFF;
      border: 1px solid #EAEEF1;
      border-radius: 16px;
      padding: 2.5rem 3rem 2rem;
      text-align: center;
      max-width: 420px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
    }

    .card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: #0087EE;
      border-radius: 16px 16px 0 0;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      margin-bottom: 1.5rem;
    }
    .logo svg { display: block; flex-shrink: 0; }
    .logo-text {
      font-size: 1.1rem;
      font-weight: 600;
      color: #172029;
      letter-spacing: -.01em;
    }

    .icon-circle {
      display: flex;
      justify-content: center;
      margin-bottom: 1.25rem;
    }

    .icon-circle svg { display: block; }

    .circle-ring { stroke-dasharray: 166; stroke-dashoffset: 166; animation: drawCircle 400ms ease-out 200ms forwards; }
    .checkmark-path { stroke-dasharray: 48; stroke-dashoffset: 48; animation: drawCheck 300ms ease-out 500ms forwards; }

    @keyframes drawCircle { to { stroke-dashoffset: 0; } }
    @keyframes drawCheck  { to { stroke-dashoffset: 0; } }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px) scale(.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: .375rem;
      color: #172029;
    }

    .email {
      font-size: .9rem;
      color: #55667B;
      margin-bottom: 1.25rem;
      word-break: break-all;
    }

    .divider {
      height: 1px;
      background: #EAEEF1;
      margin-bottom: 1.25rem;
    }

    .hint {
      font-size: .85rem;
      color: #76889F;
      line-height: 1.45;
    }

    .footer {
      font-size: .75rem;
      color: #76889F;
      letter-spacing: .02em;
    }

    /* ---- Dark mode ---- */
    @media (prefers-color-scheme: dark) {
      body { background: #0B1120; color: #F1F5F9; }
      .card { background: #1E293B; border-color: #334155; box-shadow: 0 1px 3px rgba(0,0,0,.2), 0 4px 12px rgba(0,0,0,.15); }
      .logo svg { filter: brightness(0) invert(1); }
      .logo-text { color: #F1F5F9; }
      h1 { color: #F1F5F9; }
      .email { color: #94A3B8; }
      .divider { background: #334155; }
      .hint { color: #64748B; }
      .footer { color: #64748B; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">
        <svg width="22" height="22" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.489 15.672H.601v6.23h5.888v-6.23Z" fill="#061E33"/>
          <path d="M13.688 18.218H7.799v6.229h5.889v-6.23Z" fill="#061E33"/>
          <path d="M20.943 15.672h-5.889v6.23h5.889v-6.23Z" fill="#061E33"/>
          <path d="M6.489 25.77H.601V32h5.888v-6.23Z" fill="#061E33"/>
          <path d="M13.689 25.77H7.8V32h5.889v-6.23Z" fill="#061E33"/>
          <path d="M20.943 23.033h-5.889v6.23h5.889v-6.23Z" fill="#061E33"/>
          <path d="M20.943 5.667h-5.889v6.23h5.889v-6.23Z" fill="#061E33"/>
          <path d="M13.834 10.763H7.945v6.23h5.889v-6.23Z" fill="#061E33"/>
          <path d="M6.489 0H.601v6.23h5.888V0Z" fill="#061E33"/>
        </svg>
        <span class="logo-text">Unlayer</span>
      </div>

      <div class="icon-circle">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="28" cy="28" r="26" stroke="#22C55E" stroke-width="2.5" fill="none" class="circle-ring" />
          <path d="M17 28.5L24 35.5L39 20.5" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" class="checkmark-path" />
        </svg>
      </div>

      <h1>Authenticated!</h1>
      ${email ? `<p class="email">Signed in as ${email}</p>` : '<div style="margin-bottom:1.25rem"></div>'}
      <div class="divider"></div>
      <p class="hint">You can close this tab and return to the terminal.</p>
    </div>

    <span class="footer">Unlayer CLI</span>
  </div>
</body>
</html>`;

const ERROR_HTML = (message: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unlayer CLI — Error</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #F7F8F9;
      color: #172029;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      padding: 1.5rem;
      animation: fadeIn 600ms ease-out both;
    }

    .card {
      position: relative;
      background: #FFFFFF;
      border: 1px solid #EAEEF1;
      border-radius: 16px;
      padding: 2.5rem 3rem 2rem;
      text-align: center;
      max-width: 420px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
    }

    .card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: #DC2626;
      border-radius: 16px 16px 0 0;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      margin-bottom: 1.5rem;
    }
    .logo svg { display: block; flex-shrink: 0; }
    .logo-text {
      font-size: 1.1rem;
      font-weight: 600;
      color: #172029;
      letter-spacing: -.01em;
    }

    .icon-circle {
      display: flex;
      justify-content: center;
      margin-bottom: 1.25rem;
    }

    .icon-circle svg { display: block; }

    .circle-ring { stroke-dasharray: 166; stroke-dashoffset: 166; animation: drawCircle 400ms ease-out 200ms forwards; }
    .x-path { stroke-dasharray: 30; stroke-dashoffset: 30; animation: drawX 300ms ease-out 500ms forwards; }

    @keyframes drawCircle { to { stroke-dashoffset: 0; } }
    @keyframes drawX      { to { stroke-dashoffset: 0; } }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px) scale(.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: .375rem;
      color: #DC2626;
    }

    .message {
      font-size: .9rem;
      color: #55667B;
      margin-bottom: 1.25rem;
      line-height: 1.45;
    }

    .divider {
      height: 1px;
      background: #EAEEF1;
      margin-bottom: 1.25rem;
    }

    .hint {
      font-size: .85rem;
      color: #76889F;
      line-height: 1.45;
    }

    .footer {
      font-size: .75rem;
      color: #76889F;
      letter-spacing: .02em;
    }

    /* ---- Dark mode ---- */
    @media (prefers-color-scheme: dark) {
      body { background: #0B1120; color: #F1F5F9; }
      .card { background: #1E293B; border-color: #334155; box-shadow: 0 1px 3px rgba(0,0,0,.2), 0 4px 12px rgba(0,0,0,.15); }
      .card::before { background: #EF4444; }
      .logo svg { filter: brightness(0) invert(1); }
      .logo-text { color: #F1F5F9; }
      h1 { color: #EF4444; }
      .message { color: #94A3B8; }
      .divider { background: #334155; }
      .hint { color: #64748B; }
      .footer { color: #64748B; }
      .circle-ring { stroke: #EF4444; }
      .x-path { stroke: #EF4444; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">
        <svg width="22" height="22" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.489 15.672H.601v6.23h5.888v-6.23Z" fill="#061E33"/>
          <path d="M13.688 18.218H7.799v6.229h5.889v-6.23Z" fill="#061E33"/>
          <path d="M20.943 15.672h-5.889v6.23h5.889v-6.23Z" fill="#061E33"/>
          <path d="M6.489 25.77H.601V32h5.888v-6.23Z" fill="#061E33"/>
          <path d="M13.689 25.77H7.8V32h5.889v-6.23Z" fill="#061E33"/>
          <path d="M20.943 23.033h-5.889v6.23h5.889v-6.23Z" fill="#061E33"/>
          <path d="M20.943 5.667h-5.889v6.23h5.889v-6.23Z" fill="#061E33"/>
          <path d="M13.834 10.763H7.945v6.23h5.889v-6.23Z" fill="#061E33"/>
          <path d="M6.489 0H.601v6.23h5.888V0Z" fill="#061E33"/>
        </svg>
        <span class="logo-text">Unlayer</span>
      </div>

      <div class="icon-circle">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="28" cy="28" r="26" stroke="#DC2626" stroke-width="2.5" fill="none" class="circle-ring" />
          <path d="M21 21L35 35" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" fill="none" class="x-path" />
          <path d="M35 21L21 35" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" fill="none" class="x-path" />
        </svg>
      </div>

      <h1>Authentication Failed</h1>
      <p class="message">${escapeHtml(message)}</p>
      <div class="divider"></div>
      <p class="hint">Please return to the terminal and try again.</p>
    </div>

    <span class="footer">Unlayer CLI</span>
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
    res.end(SUCCESS_HTML(escapeHtml(callbackEmail)));

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
