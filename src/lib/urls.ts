/**
 * Centralized URL construction for Unlayer console and accounts.
 *
 * URLs are resolved in this order:
 *   1. Environment variables (UNLAYER_CONSOLE_URL, UNLAYER_ACCOUNTS_URL)
 *   2. Production defaults
 */

import { getConsoleUrl, getAccountsUrl } from './config.js';

/** Personal Access Tokens page */
export function getTokenPageUrl(): string {
  return `${getConsoleUrl()}/home/profile/tokens`;
}

/** Create new workspace page */
export function getWorkspaceCreateUrl(): string {
  return `${getConsoleUrl()}/workspaces/new`;
}

/** Create new project page (within a workspace) */
export function getProjectCreateUrl(workspaceId: number | string): string {
  return `${getConsoleUrl()}/workspaces/${workspaceId}/setup`;
}

/** CLI auth API route on the console (creates PAT and redirects to localhost callback) */
export function getCliAuthUrl(port: number, state: string): string {
  return `${getConsoleUrl()}/api/cli-auth?port=${port}&state=${encodeURIComponent(state)}`;
}

/** Accounts login page with returnUrl pointing to cli-auth (chains: login → PAT → localhost) */
export function getLoginWithCliAuthUrl(port: number, state: string): string {
  const cliAuthUrl = getCliAuthUrl(port, state);
  return `${getAccountsUrl()}/?returnUrl=${encodeURIComponent(cliAuthUrl)}`;
}

/** Accounts signup page with returnUrl pointing to cli-auth (chains: signup → PAT → localhost) */
export function getSignupWithCliAuthUrl(port: number, state: string): string {
  const cliAuthUrl = getCliAuthUrl(port, state);
  return `${getAccountsUrl()}/signup?returnUrl=${encodeURIComponent(cliAuthUrl)}`;
}

/** Console template editor page */
export function getTemplateEditorUrl(
  projectId: number | string,
  templateId: string,
  displayMode?: string,
): string {
  const prefix = displayMode === 'web' ? 'pages'
    : displayMode === 'document' ? 'documents'
    : 'emails';
  return `${getConsoleUrl()}/${prefix}/${projectId}/templates/${templateId}`;
}
