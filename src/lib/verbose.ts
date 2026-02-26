import { isVerbose } from './cli-flags.js';

/**
 * Write a verbose-level message to stderr.
 * Only outputs when --verbose / -v is active.
 */
export function verboseLog(message: string): void {
  if (isVerbose()) {
    process.stderr.write(`[verbose] ${message}\n`);
  }
}
