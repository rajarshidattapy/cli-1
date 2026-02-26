/**
 * Shared type definitions for Unlayer API resources.
 *
 * These mirror the shapes returned by the @unlayer/sdk and are used
 * across multiple commands (auth, workspace, project, init).
 */

export interface Workspace {
  id?: number;
  name?: string;
}

export interface Project {
  id?: number;
  name?: string;
  status?: string;
}

export interface WorkspaceWithProjects extends Workspace {
  projects?: Project[];
}
