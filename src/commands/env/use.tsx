import React, { useState, useEffect, useCallback } from 'react';
import { Text, useApp } from 'ink';
import { StatusMessage } from '@inkjs/ui';
import { Command } from 'commander';
import { App } from '../../components/App.js';
import { KeyValue } from '../../components/KeyValue.js';
import { InteractiveList } from '../../components/InteractiveList.js';
import {
  getEnvironments,
  getActiveEnvironment,
  setActiveEnvironment,
} from '../../lib/config.js';
import { renderCommand, jsonError, stdoutWrite, setUsageError } from '../../lib/render.js';
import { isNonInteractive, isJsonMode } from '../../lib/cli-flags.js';
import { formatSelectLabel } from '../../lib/format-option-label.js';
import type { EnvironmentUrls } from '../../lib/config.js';

type Step = 'init' | 'selectEnv' | 'done' | 'cancelled' | 'error';

interface EnvUseCommandProps {
  nameArg?: string;
  none?: boolean;
  json?: boolean;
}

function EnvUseCommandComponent({ nameArg, none, json: jsonProp }: EnvUseCommandProps): React.ReactElement {
  const json = jsonProp || isJsonMode();
  const { exit } = useApp();
  const [step, setStep] = useState<Step>('init');
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<EnvironmentUrls | null>(null);

  const envs = getEnvironments();
  const currentActive = getActiveEnvironment();
  const envNames = Object.keys(envs);

  // Init logic
  useEffect(() => {
    if (none) {
      // Clear active environment
      setActiveEnvironment(null);
      setSelectedName(null);
      setStep('done');
      return;
    }

    if (nameArg) {
      // Direct switch by name
      const env = envs[nameArg];
      if (!env) {
        setUsageError();
        setError(`Environment "${nameArg}" not found. Available: ${envNames.join(', ') || 'none'}`);
        setStep('error');
        return;
      }
      setActiveEnvironment(nameArg);
      setSelectedName(nameArg);
      setSelectedUrls({ apiUrl: env.apiUrl, consoleUrl: env.consoleUrl, accountsUrl: env.accountsUrl });
      setStep('done');
      return;
    }

    // No arg — need interactive selection
    if (envNames.length === 0) {
      setError('No environments defined. Use `unlayer env add` to create one.');
      setStep('error');
      return;
    }

    if (isNonInteractive()) {
      setUsageError();
      setError(`Non-interactive mode: provide an environment name argument. Available: ${envNames.join(', ')}`);
      setStep('error');
      return;
    }

    setStep('selectEnv');
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback(
    (value: string) => {
      const env = envs[value];
      if (env) {
        setActiveEnvironment(value);
        setSelectedName(value);
        setSelectedUrls({ apiUrl: env.apiUrl, consoleUrl: env.consoleUrl, accountsUrl: env.accountsUrl });
        setStep('done');
      }
    },
    [envs],
  );

  const handleCancel = useCallback(() => {
    setStep('cancelled');
  }, []);

  // JSON output
  useEffect(() => {
    if (step === 'done' && json) {
      if (selectedName && selectedUrls) {
        stdoutWrite(JSON.stringify({ activeEnvironment: selectedName, ...selectedUrls }, null, 2));
      } else {
        stdoutWrite(JSON.stringify({ activeEnvironment: null }, null, 2));
      }
    }
  }, [step, json, selectedName, selectedUrls]);

  // Exit effects
  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
    if (step === 'cancelled') {
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

  // Build items for interactive list
  const items = (() => {
    const maxNameLen = Math.max(1, ...envNames.map((n) => n.length));
    return envNames.map((name) => ({
      label: formatSelectLabel([
        { text: name, width: maxNameLen },
        { text: envs[name].source, width: 7 },
      ]),
      value: name,
      isCurrent: name === currentActive,
    }));
  })();

  return (
    <App>
      {step === 'selectEnv' && !isNonInteractive() && (
        <InteractiveList
          title="Select an environment"
          items={items}
          onSelect={handleSelect}
          onCancel={handleCancel}
        />
      )}

      {step === 'cancelled' && (
        <Text dimColor>  Cancelled</Text>
      )}

      {step === 'done' && !json && selectedName && selectedUrls && (
        <>
          <StatusMessage variant="success">
            Switched to environment &quot;{selectedName}&quot;
          </StatusMessage>
          <KeyValue
            pairs={[
              { key: 'API URL', value: selectedUrls.apiUrl },
              { key: 'Console URL', value: selectedUrls.consoleUrl },
              { key: 'Accounts URL', value: selectedUrls.accountsUrl },
            ]}
          />
        </>
      )}

      {step === 'done' && !json && !selectedName && (
        <StatusMessage variant="success">
          Active environment cleared (using defaults)
        </StatusMessage>
      )}

      {step === 'error' && error && (
        <StatusMessage variant="error">{error}</StatusMessage>
      )}
    </App>
  );
}

export const envUseCommand = new Command('use')
  .description('Switch the active environment')
  .argument('[name]', 'Environment name to activate')
  .option('--none', 'Clear active environment (back to defaults)')
  .option('--json', 'Output as JSON')
  .action((nameArg, options) => {
    const { waitUntilExit } = renderCommand(
      <EnvUseCommandComponent nameArg={nameArg} none={options.none} json={options.json} />,
    );
    waitUntilExit().catch((err) => {
      if (err) process.exit(process.exitCode || 1);
    });
  });
