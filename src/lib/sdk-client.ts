/**
 * Unlayer SDK Client Wrapper for CLI
 *
 * Uses the official @unlayer/sdk package.
 *
 * Authentication uses a Personal Access Token (PAT) which identifies
 * the developer. Create one at https://console.unlayer.com/home/profile/tokens
 */
import Unlayer from '@unlayer/sdk';
import { getToken, getApiUrl, getProjectId } from './config.js';
import { isVerbose } from './cli-flags.js';

/**
 * Logger that routes all SDK output to stderr so stdout stays clean
 * for machine-readable data (JSON, HTML, URLs).
 */
const stderrLogger = {
  error: (...args: unknown[]) => process.stderr.write(`[sdk:error] ${args.map(String).join(' ')}\n`),
  warn: (...args: unknown[]) => process.stderr.write(`[sdk:warn] ${args.map(String).join(' ')}\n`),
  info: (...args: unknown[]) => process.stderr.write(`[sdk:info] ${args.map(String).join(' ')}\n`),
  debug: (...args: unknown[]) => process.stderr.write(`[sdk:debug] ${args.map(String).join(' ')}\n`),
};

/**
 * Create an Unlayer SDK client configured for CLI use.
 *
 * @param token - Personal Access Token (PAT) for authentication
 * @param baseUrl - API base URL (defaults to production)
 * @param projectIdOverride - Override the configured project ID for this request
 */
export function createSdkClient(
  token?: string,
  baseUrl?: string,
  projectIdOverride?: number | string,
): Unlayer {
  const bearerToken = token || getToken();
  if (!bearerToken) {
    throw new Error(
      'No authentication token found. Run `unlayer login` or set UNLAYER_TOKEN environment variable.',
    );
  }

  const apiUrl = baseUrl || getApiUrl();
  const resolvedProjectId =
    projectIdOverride !== undefined
      ? String(projectIdOverride)
      : getProjectId()
        ? String(getProjectId())
        : undefined;

  return new Unlayer({
    personalAccessToken: bearerToken,
    baseURL: apiUrl,
    projectID: resolvedProjectId,
    maxRetries: 3,
    timeout: 60_000,
    logLevel: isVerbose() ? 'debug' : 'warn',
    logger: stderrLogger,
  });
}

// Re-export the Unlayer class for error handling
export { Unlayer };
