import { Command } from 'commander';
import { listProjectsCommand } from './list.js';
import { useProjectCommand } from './use.js';
import { infoProjectCommand } from './info.js';
import { requireAuth } from '../../lib/config.js';

export const projectCommand = new Command('project')
  .description('Manage projects')
  .addCommand(listProjectsCommand)
  .addCommand(useProjectCommand)
  .addCommand(infoProjectCommand)
  .action(() => {
    requireAuth();
    projectCommand.help();
  });
