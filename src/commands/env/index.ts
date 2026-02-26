import { Command } from 'commander';
import { envListCommand } from './list.js';
import { envUseCommand } from './use.js';
import { envAddCommand } from './add.js';
import { envRemoveCommand } from './remove.js';
import { envShowCommand } from './show.js';

export const envCommand = new Command('env')
  .description('Manage environment profiles')
  .addCommand(envListCommand)
  .addCommand(envUseCommand)
  .addCommand(envAddCommand)
  .addCommand(envRemoveCommand)
  .addCommand(envShowCommand)
  .action(() => {
    envCommand.help();
  });
