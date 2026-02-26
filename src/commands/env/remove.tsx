import React, { useState, useEffect } from 'react';
import { useApp } from 'ink';
import { StatusMessage } from '@inkjs/ui';
import { Command } from 'commander';
import { App } from '../../components/App.js';
import { removeEnvironment } from '../../lib/config.js';
import { renderCommand, jsonError, stdoutWrite, setUsageError } from '../../lib/render.js';
import { isJsonMode } from '../../lib/cli-flags.js';

interface EnvRemoveCommandProps {
  name: string;
  json?: boolean;
}

function EnvRemoveCommandComponent({ name, json: jsonProp }: EnvRemoveCommandProps): React.ReactElement {
  const json = jsonProp || isJsonMode();
  const { exit } = useApp();
  const [result, setResult] = useState<'removed' | 'not-found' | null>(null);

  useEffect(() => {
    const removed = removeEnvironment(name);
    setResult(removed ? 'removed' : 'not-found');
  }, [name]);

  // JSON output
  useEffect(() => {
    if (result === 'removed' && json) {
      stdoutWrite(JSON.stringify({ name, status: 'removed' }, null, 2));
    }
    if (result === 'not-found' && json) {
      jsonError(`Environment "${name}" not found`);
    }
  }, [result, json, name]);

  // Exit
  useEffect(() => {
    if (result === 'removed') {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
    if (result === 'not-found') {
      setUsageError();
      const timer = setTimeout(() => exit(new Error(`Environment "${name}" not found`)), 100);
      return () => clearTimeout(timer);
    }
    return;
  }, [result, exit, name]);

  if (result === 'removed' && !json) {
    return (
      <App>
        <StatusMessage variant="success">
          Environment &quot;{name}&quot; removed
        </StatusMessage>
      </App>
    );
  }

  if (result === 'not-found' && !json) {
    return (
      <App>
        <StatusMessage variant="error">
          Environment &quot;{name}&quot; not found
        </StatusMessage>
      </App>
    );
  }

  return <></>;
}

export const envRemoveCommand = new Command('remove')
  .description('Remove a named environment from global config')
  .argument('<name>', 'Environment name to remove')
  .option('--json', 'Output as JSON')
  .action((name, options) => {
    const { waitUntilExit } = renderCommand(
      <EnvRemoveCommandComponent name={name} json={options.json} />,
    );
    waitUntilExit().catch((err) => {
      if (err) process.exit(process.exitCode || 1);
    });
  });
