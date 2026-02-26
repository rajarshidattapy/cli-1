import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import { ConfirmInput, StatusMessage } from '@inkjs/ui';
import { Command } from 'commander';
import { App } from '../../components/App.js';
import { clearToken, getToken, clearAll } from '../../lib/config.js';
import { renderCommand, jsonError, stdoutWrite, setUsageError } from '../../lib/render.js';
import { isNonInteractive, isJsonMode } from '../../lib/cli-flags.js';

type Step = 'confirm' | 'done' | 'cancelled' | 'notLoggedIn' | 'error';

interface LogoutCommandProps {
  all?: boolean;
  force?: boolean;
  json?: boolean;
}

function LogoutCommand({ all, force, json: jsonProp }: LogoutCommandProps): React.ReactElement {
  const { exit } = useApp();
  const existingToken = getToken();
  const json = jsonProp || isJsonMode();

  const [step, setStep] = useState<Step>(() => {
    if (!existingToken) return 'notLoggedIn';
    if (force) return 'done';
    if (isNonInteractive()) return 'error';
    return 'confirm';
  });
  const [error] = useState<string | null>(() => {
    if (existingToken && !force && isNonInteractive()) {
      setUsageError();
      return 'Non-interactive mode: use --force to skip confirmation.';
    }
    return null;
  });

  // Perform the logout action if forced
  useEffect(() => {
    if (step === 'done' && force) {
      if (all) {
        clearAll();
      } else {
        clearToken();
      }
    }
  }, [step, force, all]);

  const handleConfirm = useCallback(() => {
    if (all) {
      clearAll();
    } else {
      clearToken();
    }
    setStep('done');
  }, [all]);

  const handleCancel = useCallback(() => {
    setStep('cancelled');
  }, []);

  // JSON output
  useEffect(() => {
    if (step === 'done' && json) {
      stdoutWrite(JSON.stringify({ status: 'logged_out', all: !!all }, null, 2));
    }
    if (step === 'notLoggedIn' && json) {
      stdoutWrite(JSON.stringify({ status: 'not_logged_in' }, null, 2));
    }
  }, [step, json, all]);

  useEffect(() => {
    if (step === 'done' || step === 'cancelled' || step === 'notLoggedIn') {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
    if (step === 'error' && error) {
      jsonError(error);
      const timer = setTimeout(() => exit(new Error(error)), 100);
      return () => clearTimeout(timer);
    }
    return;
  }, [step, exit, error]);

  return (
    <App>
      {step === 'notLoggedIn' && (
        <StatusMessage variant="info">
          You are not currently logged in.
        </StatusMessage>
      )}

      {step === 'confirm' && !isNonInteractive() && (
        <Box>
          <Text>
            {'  '}
            {all
              ? 'This will clear all credentials and settings. Continue? '
              : 'Are you sure you want to log out? '}
          </Text>
          <ConfirmInput
            defaultChoice="cancel"
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </Box>
      )}

      {step === 'done' && (
        <Box flexDirection="column" gap={1}>
          <StatusMessage variant="success">
            {all
              ? 'All credentials and settings cleared.'
              : 'Successfully logged out.'}
          </StatusMessage>
          <StatusMessage variant="warning">
            You will need to login again to use API commands.
          </StatusMessage>
        </Box>
      )}

      {step === 'cancelled' && (
        <StatusMessage variant="info">Logout cancelled</StatusMessage>
      )}

      {step === 'error' && error && (
        <StatusMessage variant="error">{error}</StatusMessage>
      )}
    </App>
  );
}

export const logoutCommand = new Command('logout')
  .description('Log out and clear stored credentials')
  .option(
    '-a, --all',
    'Clear all configuration including workspace and project settings',
  )
  .option('-f, --force', 'Skip confirmation prompt')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const { waitUntilExit } = renderCommand(
      <LogoutCommand all={options.all} force={options.force} json={options.json} />,
    );
    waitUntilExit().catch(() => {
      process.exit(process.exitCode || 1);
    });
  });
