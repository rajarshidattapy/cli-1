/**
 * CLI version injected at build time by tsup/esbuild.
 * The `__CLI_VERSION__` constant is replaced with the value
 * from package.json during the build step (see tsup.config.ts).
 */
declare const __CLI_VERSION__: string;

export const CLI_VERSION: string =
  typeof __CLI_VERSION__ !== 'undefined' ? __CLI_VERSION__ : '0.0.0-dev';
