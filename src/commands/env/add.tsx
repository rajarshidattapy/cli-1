import React, { useState, useEffect } from 'react';
import { useApp } from 'ink';
import { StatusMessage } from '@inkjs/ui';
import { Command } from 'commander';
import { App } from '../../components/App.js';
import { KeyValue } from '../../components/KeyValue.js';
import { addEnvironment } from '../../lib/config.js';
import { renderCommand, jsonError, stdoutWrite, setUsageError } from '../../lib/render.js';
import { isJsonMode } from '../../lib/cli-flags.js';

interface EnvAddCommandProps {
  name: string;
  apiUrl: string;
  consoleUrl: string;
  accountsUrl: string;
  json?: boolean;
}

function EnvAddCommandComponent({
  name,
  apiUrl,
  consoleUrl,
  accountsUrl,
  json: jsonProp,
}: EnvAddCommandProps): React.ReactElement {
  const json = jsonProp || isJsonMode();
  const { exit } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Validate URLs
    for (const [label, url] of [
      ['--api-url', apiUrl],
      ['--console-url', consoleUrl],
      ['--accounts-url', accountsUrl],
    ] as const) {
      try {
        new URL(url);
      } catch {
        setUsageError();
        setError(`Invalid URL for ${label}: ${url}`);
        return;
      }
    }

    addEnvironment(name, { apiUrl, consoleUrl, accountsUrl });
    setDone(true);
  }, [name, apiUrl, consoleUrl, accountsUrl]);

  // JSON output
  useEffect(() => {
    if (done && json) {
      stdoutWrite(
        JSON.stringify(
          { name, apiUrl, consoleUrl, accountsUrl, status: 'saved' },
          null,
          2,
        ),
      );
    }
  }, [done, json, name, apiUrl, consoleUrl, accountsUrl]);

  // Exit
  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
    if (error) {
      jsonError(error);
      const timer = setTimeout(() => exit(new Error(error)), 100);
      return () => clearTimeout(timer);
    }
    return;
  }, [done, error, exit]);

  if (error) {
    return (
      <App>
        <StatusMessage variant="error">{error}</StatusMessage>
      </App>
    );
  }

  if (done && !json) {
    return (
      <App>
        <StatusMessage variant="success">
          Environment &quot;{name}&quot; saved
        </StatusMessage>
        <KeyValue
          pairs={[
            { key: 'API URL', value: apiUrl },
            { key: 'Console URL', value: consoleUrl },
            { key: 'Accounts URL', value: accountsUrl },
          ]}
        />
      </App>
    );
  }

  return <></>;
}

export const envAddCommand = new Command('add')
  .description('Add or update a named environment')
  .argument('<name>', 'Environment name (e.g. dev, qa, production)')
  .requiredOption('--api-url <url>', 'API base URL')
  .requiredOption('--console-url <url>', 'Console base URL')
  .requiredOption('--accounts-url <url>', 'Accounts base URL')
  .option('--json', 'Output as JSON')
  .action((name, options) => {
    const { waitUntilExit } = renderCommand(
      <EnvAddCommandComponent
        name={name}
        apiUrl={options.apiUrl}
        consoleUrl={options.consoleUrl}
        accountsUrl={options.accountsUrl}
        json={options.json}
      />,
    );
    waitUntilExit().catch((err) => {
      if (err) process.exit(process.exitCode || 1);
    });
  });
