import React, { useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { StatusMessage } from '@inkjs/ui';
import { Command } from 'commander';
import { App } from '../../components/App.js';
import { KeyValue } from '../../components/KeyValue.js';
import { getEnvironments, getActiveEnvironment } from '../../lib/config.js';
import { renderCommand, jsonError, stdoutWrite, setUsageError } from '../../lib/render.js';
import { isJsonMode } from '../../lib/cli-flags.js';

interface EnvShowCommandProps {
  nameArg?: string;
  json?: boolean;
}

function EnvShowCommandComponent({ nameArg, json: jsonProp }: EnvShowCommandProps): React.ReactElement {
  const json = jsonProp || isJsonMode();
  const { exit } = useApp();
  const envs = getEnvironments();
  const activeEnv = getActiveEnvironment();

  // Resolve which env to show: explicit arg or active env
  const targetName = nameArg || activeEnv;
  const targetEnv = targetName ? envs[targetName] : null;
  const isActive = targetName === activeEnv;

  // Error: explicit name not found
  const error =
    nameArg && !targetEnv
      ? `Environment "${nameArg}" not found`
      : !targetName
        ? 'No active environment set. Specify a name or use `unlayer env use` first.'
        : !targetEnv
          ? `Environment "${targetName}" not found (it may have been removed)`
          : null;

  // JSON output
  useEffect(() => {
    if (error) {
      jsonError(error);
    } else if (json && targetName && targetEnv) {
      stdoutWrite(
        JSON.stringify(
          {
            name: targetName,
            active: isActive,
            source: targetEnv.source,
            apiUrl: targetEnv.apiUrl,
            consoleUrl: targetEnv.consoleUrl,
            accountsUrl: targetEnv.accountsUrl,
          },
          null,
          2,
        ),
      );
    }
  }, [json, targetName, targetEnv, isActive, error]);

  // Exit
  useEffect(() => {
    if (error) {
      setUsageError();
      const timer = setTimeout(() => exit(new Error(error)), 100);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [exit, error]);

  if (error) {
    return (
      <App>
        <StatusMessage variant="error">{error}</StatusMessage>
      </App>
    );
  }

  if (json) return <></>;

  return (
    <App>
      <Box flexDirection="column" gap={1}>
        <Text bold> Environment: {targetName}</Text>
        <KeyValue
          pairs={[
            { key: 'Name', value: targetName },
            { key: 'Active', value: isActive },
            { key: 'Source', value: targetEnv!.source },
            { key: 'API URL', value: targetEnv!.apiUrl },
            { key: 'Console URL', value: targetEnv!.consoleUrl },
            { key: 'Accounts URL', value: targetEnv!.accountsUrl },
          ]}
        />
      </Box>
    </App>
  );
}

export const envShowCommand = new Command('show')
  .description('Show details of an environment')
  .argument('[name]', 'Environment name (defaults to active environment)')
  .option('--json', 'Output as JSON')
  .action((nameArg, options) => {
    const { waitUntilExit } = renderCommand(
      <EnvShowCommandComponent nameArg={nameArg} json={options.json} />,
    );
    waitUntilExit().catch((err) => {
      if (err) process.exit(process.exitCode || 1);
    });
  });
