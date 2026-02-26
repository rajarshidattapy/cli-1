import { Command } from 'commander';
import { listTemplatesCommand } from './list.js';
import { getTemplateCommand } from './get.js';
import { searchTemplatesCommand } from './search.js';
import { requireAuth } from '../../lib/config.js';

export const templateCommand = new Command('template')
  .description('Manage templates')
  .addCommand(listTemplatesCommand)
  .addCommand(getTemplateCommand)
  .addCommand(searchTemplatesCommand)
  .action(() => {
    requireAuth();
    templateCommand.help();
  });
