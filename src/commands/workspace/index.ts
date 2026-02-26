import { Command } from 'commander';
import { listWorkspacesCommand } from './list.js';
import { useWorkspaceCommand } from './use.js';
import { requireAuth } from '../../lib/config.js';

export const workspaceCommand = new Command('workspace')
  .description('Manage workspaces')
  .addCommand(listWorkspacesCommand)
  .addCommand(useWorkspaceCommand)
  .action(() => {
    requireAuth();
    workspaceCommand.help();
  });
