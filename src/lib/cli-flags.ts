/**
 * Global CLI flags singleton.
 *
 * Detects non-interactive / quiet / JSON mode so every command
 * can adapt its behaviour for agents, CI, and piped environments.
 *
 * Call `initGlobalFlags()` once from the Commander preAction hook
 * (in index.ts) before any command runs.
 */

interface GlobalFlags {
  nonInteractive: boolean;
  quiet: boolean;
  json: boolean;
  verbose: boolean;
}

let flags: GlobalFlags = {
  nonInteractive: false,
  quiet: false,
  json: false,
  verbose: false,
};

/**
 * Initialise the global flags singleton.
 * Called once from the Commander preAction hook.
 */
export function initGlobalFlags(opts: {
  nonInteractive?: boolean;
  quiet?: boolean;
  json?: boolean;
  verbose?: boolean;
}): void {
  const ciDetected =
    !!process.env.CI ||
    !!process.env.CONTINUOUS_INTEGRATION ||
    !!process.env.UNLAYER_NON_INTERACTIVE ||
    !process.stdin.isTTY;

  const ni = !!(opts.nonInteractive || ciDetected);

  flags = {
    nonInteractive: ni,
    quiet: !!(opts.quiet || ni),
    json: !!opts.json,
    verbose: !!opts.verbose,
  };
}

/** True when the CLI should never prompt the user. */
export function isNonInteractive(): boolean {
  return flags.nonInteractive;
}

/** True when decorative output (header, status messages) should be suppressed. */
export function isQuiet(): boolean {
  return flags.quiet;
}

/** True when the user requested JSON output (--json global flag). */
export function isJsonMode(): boolean {
  return flags.json;
}

/** True when the user requested verbose output (--verbose / -v flag). */
export function isVerbose(): boolean {
  return flags.verbose;
}
