import React, { useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { StatusMessage } from '@inkjs/ui';
import { Command } from 'commander';
import { App } from '../../components/App.js';
import { DataTable } from '../../components/DataTable.js';
import { getEnvironments, getActiveEnvironment } from '../../lib/config.js';
import { renderCommand, stdoutWrite } from '../../lib/render.js';
import { isJsonMode } from '../../lib/cli-flags.js';

interface EnvListCommandProps {
  json?: boolean;
}

function EnvListCommandComponent({ json: jsonProp }: EnvListCommandProps): React.ReactElement {
  const json = jsonProp || isJsonMode();
  const { exit } = useApp();
  const envs = getEnvironments();
  const activeEnv = getActiveEnvironment();
  const envNames = Object.keys(envs);

  // JSON output
  useEffect(() => {
    if (json) {
      const output = envNames.map((name) => ({
        name,
        active: name === activeEnv,
        source: envs[name].source,
        apiUrl: envs[name].apiUrl,
        consoleUrl: envs[name].consoleUrl,
        accountsUrl: envs[name].accountsUrl,
      }));
      stdoutWrite(JSON.stringify(output, null, 2));
    }
  }, [json]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exit
  useEffect(() => {
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [exit]);

  if (json) return <></>;

  if (envNames.length === 0) {
    return (
      <App>
        <StatusMessage variant="info">
          No environments defined. Use `unlayer env add` to create one.
        </StatusMessage>
      </App>
    );
  }

  const tableData = envNames.map((name) => ({
    ' ': name === activeEnv ? '\u25CF' : ' ',
    Name: name,
    Source: envs[name].source,
    'API URL': envs[name].apiUrl,
    'Console URL': envs[name].consoleUrl,
    'Accounts URL': envs[name].accountsUrl,
  }));

  return (
    <App>
      <Box flexDirection="column" gap={1}>
        <Text bold> Environments</Text>
        <DataTable
          data={tableData}
          columns={[' ', 'Name', 'Source', 'API URL', 'Console URL', 'Accounts URL']}
        />
        <Text>
          {'  '}
          <Text color="green">{'\u25CF'}</Text>
          <Text dimColor> = active environment</Text>
        </Text>
      </Box>
    </App>
  );
}

export const envListCommand = new Command('list')
  .description('List all environments')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const { waitUntilExit } = renderCommand(
      <EnvListCommandComponent json={options.json} />,
    );
    waitUntilExit().catch((err) => {
      if (err) process.exit(process.exitCode || 1);
    });
  });
