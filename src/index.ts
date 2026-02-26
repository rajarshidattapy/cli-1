#!/usr/bin/env node

import { Command } from 'commander';
import updateNotifier from 'update-notifier';
import { initGlobalFlags } from './lib/cli-flags.js';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR } from './lib/exit-codes.js';
import { CLI_VERSION } from './lib/version.js';
import { getProjectConfig } from './lib/project-config.js';

// Check for updates in background — notification deferred to process exit
updateNotifier({
  pkg: { name: '@unlayer/cli', version: CLI_VERSION },
  updateCheckInterval: 1000 * 60 * 60 * 24, // 1 day
}).notify({ isGlobal: true });

// Auth commands
import {
  loginCommand,
  logoutCommand,
  whoamiCommand,
  signupCommand,
} from './commands/auth/index.js';

// Resource commands
import { workspaceCommand } from './commands/workspace/index.js';
import { projectCommand } from './commands/project/index.js';
import { templateCommand } from './commands/template/index.js';

// Workflow commands
import { pullCommand } from './commands/pull.js';
import { diffCommand } from './commands/diff.js';

// Config command
import { configCommand } from './commands/config.js';

// Env command
import { envCommand } from './commands/env/index.js';

// Init command
import { initCommand } from './commands/init.js';

// Status command
import { statusCommand } from './commands/status.js';

const program = new Command();

// ANSI color helpers (no external dependency needed)
const c = {
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  white: (s: string) => `\x1b[37m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// Custom help formatting - compact with logo
const formatHelp = () => {
  console.log();
  console.log(`  ${c.blue('█░█ █▄░█ █░░ ▄▀█ █▄█ █▀▀ █▀█')}  ${c.dim(`v${CLI_VERSION}`)}`);
  console.log(`  ${c.blue('█▄█ █░▀█ █▄▄ █▀█ ░█░ ██▄ █▀▄')}`);
  console.log();
  console.log(`  ${c.dim('Usage:')} ${c.cyan('unlayer')} ${c.dim('<command> [options]')}`);
  console.log();

  // Authentication
  console.log(`  ${c.yellow('Authentication')}`);
  console.log(`    ${c.white('signup')}        ${c.dim('Create an account and connect your CLI')}`);
  console.log(`    ${c.white('login')}         ${c.dim('Authenticate with your Personal Access Token')}`);
  console.log(`    ${c.white('logout')}        ${c.dim('Clear stored credentials')}`);
  console.log(`    ${c.white('whoami')}        ${c.dim('Show current user info')}`);
  console.log();

  // Content
  console.log(`  ${c.yellow('Content')}`);
  console.log(`    ${c.white('template')}      ${c.dim('List and view templates')}`);
  console.log(`    ${c.white('pull')}          ${c.dim('Pull templates to local files')}`);
  console.log(`    ${c.white('diff')}          ${c.dim('Compare local design against remote template')}`);
  console.log();

  // Management
  console.log(`  ${c.yellow('Management')}`);
  console.log(`    ${c.white('workspace')}     ${c.dim('List and switch workspaces')}`);
  console.log(`    ${c.white('project')}       ${c.dim('List and switch projects')}`);
  console.log(`    ${c.white('env')}           ${c.dim('Manage environment profiles')}`);
  console.log(`    ${c.white('config')}        ${c.dim('Manage CLI settings')}`);
  console.log(`    ${c.white('status')}        ${c.dim('Check CLI health and connectivity')}`);
  console.log();

  // Project Setup
  console.log(`  ${c.yellow('Project Setup')}`);
  console.log(`    ${c.white('init')}          ${c.dim('Create a new Unlayer project')}`);
  console.log();

  // Quick examples
  console.log(`  ${c.yellow('Quick Start')}`);
  console.log(`    ${c.dim('$')} ${c.cyan('unlayer signup')}                       ${c.dim('# Create account')}`);
  console.log(`    ${c.dim('$')} ${c.cyan('unlayer init my-app')}                  ${c.dim('# Create new project')}`);
  console.log(`    ${c.dim('$')} ${c.cyan('unlayer login')}                        ${c.dim('# Authenticate')}`);
  console.log(`    ${c.dim('$')} ${c.cyan('unlayer template list')}                ${c.dim('# List templates')}`);
  console.log(`    ${c.dim('$')} ${c.cyan('unlayer pull')}                         ${c.dim('# Pull all templates locally')}`);
  console.log(`    ${c.dim('$')} ${c.cyan('unlayer diff ./template.json')}         ${c.dim('# Compare local vs remote')}`);
  console.log();

  console.log(`  ${c.dim('Run')} ${c.cyan('unlayer <command> --help')} ${c.dim('for command details')}`);
  console.log();
};

program
  .name('unlayer')
  .description('Command-line interface for Unlayer APIs')
  .version(CLI_VERSION)
  .configureHelp({
    sortSubcommands: true,
    sortOptions: true,
  })
  .helpCommand(false) // Disable default help command
  .addHelpCommand('help [command]', 'Display help for a command');

// Authentication commands (top-level)
program.addCommand(signupCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(whoamiCommand);

// Resource commands (grouped)
program.addCommand(workspaceCommand);
program.addCommand(projectCommand);
program.addCommand(templateCommand);

// Workflow commands
program.addCommand(pullCommand);
program.addCommand(diffCommand);

// Configuration command
program.addCommand(configCommand);

// Environment profiles
program.addCommand(envCommand);

// Init command
program.addCommand(initCommand);

// Status command
program.addCommand(statusCommand);

// Global options
program
  .option('--json', 'Output as JSON')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--non-interactive', 'Disable interactive prompts (also enabled by CI env vars)')
  .option('-q, --quiet', 'Suppress decorative output (header, status messages)');

// Initialise global flags before any command runs
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.optsWithGlobals();
  initGlobalFlags({
    nonInteractive: opts.nonInteractive,
    quiet: opts.quiet,
    json: opts.json,
    verbose: opts.verbose,
  });
  // Warm project config cache (reads unlayer.config.json if present)
  getProjectConfig();
});

// Custom help display
program.on('--help', () => {});

// Error handling — apply exitOverride to every command (including subcommands)
// so that usage errors on nested commands (e.g. `template list --bad-flag`)
// also produce the correct exit code.
function applyExitOverride(cmd: Command): void {
  cmd.exitOverride((err) => {
    if (err.code === 'commander.help' || err.code === 'commander.helpDisplayed') process.exit(EXIT_SUCCESS);
    if (err.code === 'commander.version') process.exit(EXIT_SUCCESS);
    if (
      [
        'commander.unknownOption',
        'commander.missingArgument',
        'commander.missingMandatoryOptionValue',
        'commander.optionMissingArgument',
        'commander.unknownCommand',
        'commander.invalidArgument',
        'commander.excessArguments',
      ].includes(err.code || '')
    ) {
      process.exit(EXIT_USAGE_ERROR);
    }
    process.exit(process.exitCode || 1);
  });
  cmd.commands.forEach(applyExitOverride);
}
applyExitOverride(program);

// Parse arguments
const args = process.argv;

// Show custom help if no arguments or --help/-h
if (args.length === 2 || args.includes('--help') || args.includes('-h')) {
  if (
    args.length === 2 ||
    (args.length === 3 && (args[2] === '--help' || args[2] === '-h'))
  ) {
    formatHelp();
    process.exit(0);
  }
}

program.parse(args);
