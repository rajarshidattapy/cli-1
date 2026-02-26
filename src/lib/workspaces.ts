/**
 * Shared workspace helpers.
 *
 * The pattern of listing workspaces then retrieving each one for its
 * project details is used across login, signup, init, and project commands.
 */

import type Unlayer from '@unlayer/sdk';
import type { WorkspaceWithProjects } from './types.js';

/**
 * Fetch all workspaces with their nested project lists.
 *
 * The SDK's `workspaces.list()` returns workspace summaries without
 * projects. This helper retrieves each workspace individually to get
 * the full detail including `projects[]`.
 */
export async function fetchWorkspacesWithProjects(
  client: Unlayer,
): Promise<WorkspaceWithProjects[]> {
  const response = await client.workspaces.list();
  const wsList = response.data || [];
  return Promise.all(
    wsList.map(async (ws) => {
      try {
        const detail = await client.workspaces.retrieve(String(ws.id));
        return detail.data as WorkspaceWithProjects;
      } catch {
        return { ...ws, projects: [] } as WorkspaceWithProjects;
      }
    }),
  );
}
