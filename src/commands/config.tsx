import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { ConfirmInput, StatusMessage } from '@inkjs/ui';
import { Command } from 'commander';
import { App } from '../components/App.js';
import { KeyValue } from '../components/KeyValue.js';
import {
  getConfig,
  getConfigPath,
  getTokenEnvVar,
  getConsoleUrl,
  getAccountsUrl,
  getApiUrl,
  getActiveEnvironment,
  getActiveEnvironmentUrls,
  setApiUrl,
  setTokenEnvVar,
  clearAll,
} from '../lib/config.js';
import { renderCommand, jsonError, stdoutWrite, setUsageError } from '../lib/render.js';
import { isNonInteractive, isJsonMode } from '../lib/cli-flags.js';
import { verboseLog } from '../lib/verbose.js';

// ─── Config Show ────────────────────────────────────────────
interface ConfigShowCommandProps {
  json?: boolean;
}

function ConfigShowCommand({ json: jsonProp }: ConfigShowCommandProps): React.ReactElement {
  const { exit } = useApp();
  const json = jsonProp || isJsonMode();
  verboseLog('Loading configuration...');
  const config = getConfig();
  const tokenEnvVar = getTokenEnvVar();

  const activeEnvName = getActiveEnvironment();
  const activeEnvUrls = getActiveEnvironmentUrls();

  useEffect(() => {
    if (json) {
      stdoutWrite(JSON.stringify({
        configPath: getConfigPath(),
        activeEnvironment: activeEnvName || null,
        apiUrl: getApiUrl(),
        consoleUrl: getConsoleUrl(),
        accountsUrl: getAccountsUrl(),
        token: config.token ? config.token.substring(0, 20) + '...' : null,
        tokenEnvVar,
        workspaceId: config.workspaceId || null,
        projectId: config.projectId || null,
      }, null, 2));
    }
  }, [json, config, tokenEnvVar, activeEnvName]);

  useEffect(() => {
    const timer = setTimeout(() => exit(), 100);
    return () => clearTimeout(timer);
  }, [exit]);

  if (json) return <></>;

  return (
    <App>
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold> Configuration</Text>
          <KeyValue
            pairs={[
              { key: 'Config File', value: getConfigPath() },
            ]}
          />
        </Box>

        <Box flexDirection="column">
          <Text bold> URLs</Text>
          <KeyValue
            pairs={[
              {
                key: 'API URL',
                value: getApiUrl(),
              },
              { key: 'Console URL', value: getConsoleUrl() },
              { key: 'Accounts URL', value: getAccountsUrl() },
            ]}
          />
        </Box>

        <Box flexDirection="column">
          <Text bold> Environment</Text>
          <KeyValue
            pairs={[
              { key: 'Active Env', value: activeEnvName || undefined },
              ...(activeEnvUrls
                ? [
                    { key: 'Env API URL', value: activeEnvUrls.apiUrl },
                    { key: 'Env Console URL', value: activeEnvUrls.consoleUrl },
                    { key: 'Env Accounts URL', value: activeEnvUrls.accountsUrl },
                  ]
                : []),
            ]}
          />
        </Box>

        <Box flexDirection="column">
          <Text bold> Authentication</Text>
          <KeyValue
            pairs={[
              {
                key: 'PAT (Token)',
                value: config.token
                  ? config.token.substring(0, 20) + '...'
                  : null,
              },
              { key: 'Token Env Var', value: tokenEnvVar },
            ]}
          />
        </Box>

        <Box flexDirection="column">
          <Text bold> Context</Text>
          <KeyValue
            pairs={[
              { key: 'Workspace ID', value: config.workspaceId },
              { key: 'Project ID', value: config.projectId },
            ]}
          />
        </Box>

        <Box flexDirection="column">
          <Text bold> Environment Variables</Text>
          <KeyValue
            pairs={[
              {
                key: tokenEnvVar,
                value: process.env[tokenEnvVar] ? '(set)' : null,
              },
              {
                key: 'UNLAYER_API_URL',
                value: process.env.UNLAYER_API_URL || null,
              },
            ]}
          />
        </Box>

        <Text color="green">  Configuration loaded</Text>
      </Box>
    </App>
  );
}

// ─── Config Set ─────────────────────────────────────────────
interface ConfigSetCommandProps {
  configKey: string;
  configValue: string;
}

function ConfigSetCommand({
  configKey,
  configValue,
}: ConfigSetCommandProps): React.ReactElement {
  const { exit } = useApp();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    switch (configKey) {
      case 'api-url':
        try {
          new URL(configValue);
          setApiUrl(configValue);
          setMessage({ type: 'success', text: `API URL set to: ${configValue}` });
        } catch {
          setMessage({ type: 'error', text: 'Invalid URL format' });
        }
        break;
      case 'token-env-var':
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(configValue)) {
          setMessage({
            type: 'error',
            text: 'Invalid environment variable name.',
          });
        } else {
          setTokenEnvVar(configValue);
          setMessage({
            type: 'success',
            text: `Token environment variable set to: ${configValue}`,
          });
        }
        break;
      default:
        setMessage({ type: 'error', text: `Unknown configuration key: ${configKey}` });
    }
  }, [configKey, configValue]);

  useEffect(() => {
    if (message) {
      if (message.type === 'success' && isJsonMode()) {
        stdoutWrite(JSON.stringify({ key: configKey, value: configValue, status: 'set' }));
      }
      const timer = setTimeout(() => {
        if (message.type === 'error') {
          jsonError(message.text);
          exit(new Error(message.text));
        } else {
          exit();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    return;
  }, [message, exit, configKey, configValue]);

  if (!message) return <></>;

  return (
    <App>
      <StatusMessage variant={message.type === 'success' ? 'success' : 'error'}>
        {message.text}
      </StatusMessage>
    </App>
  );
}

// ─── Config Reset ───────────────────────────────────────────
interface ConfigResetCommandProps {
  force?: boolean;
  json?: boolean;
}

function ConfigResetCommand({ force, json: jsonProp }: ConfigResetCommandProps): React.ReactElement {
  const json = jsonProp || isJsonMode();
  const { exit } = useApp();
  const [confirmed, setConfirmed] = useState(force || false);
  const [cancelled, setCancelled] = useState(false);
  const [error] = useState<string | null>(() => {
    if (!force && isNonInteractive()) {
      setUsageError();
      return 'Non-interactive mode: use --force to skip confirmation.';
    }
    return null;
  });

  useEffect(() => {
    if (confirmed) {
      clearAll();
      if (json) {
        stdoutWrite(JSON.stringify({ status: 'reset' }));
      }
    }
  }, [confirmed, json]);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
  }, []);

  const handleCancel = useCallback(() => {
    setCancelled(true);
  }, []);

  useEffect(() => {
    if (confirmed || cancelled) {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
    if (error) {
      jsonError(error);
      const timer = setTimeout(() => exit(new Error(error)), 100);
      return () => clearTimeout(timer);
    }
    return;
  }, [confirmed, cancelled, error, exit]);

  if (error) {
    return (
      <App>
        <StatusMessage variant="error">{error}</StatusMessage>
      </App>
    );
  }

  if (confirmed) {
    return (
      <App>
        <StatusMessage variant="success">
          Configuration reset to defaults
        </StatusMessage>
      </App>
    );
  }

  if (cancelled) {
    return (
      <App>
        <StatusMessage variant="info">Reset cancelled</StatusMessage>
      </App>
    );
  }

  if (isNonInteractive()) return <></>;

  return (
    <App>
      <Box>
        <Text>
          {'  '}This will clear all configuration and credentials. Continue?{' '}
        </Text>
        <ConfirmInput
          defaultChoice="cancel"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </Box>
    </App>
  );
}

// ─── Commander Setup ────────────────────────────────────────
export const configCommand = new Command('config')
  .description('Manage CLI configuration')
  .addCommand(
    new Command('show').description('Show current configuration').option('--json', 'Output as JSON').action((options) => {
      const { waitUntilExit } = renderCommand(<ConfigShowCommand json={options.json} />);
      waitUntilExit().catch(() => process.exit(process.exitCode || 1));
    }),
  )
  .addCommand(
    new Command('set')
      .description('Set a configuration value')
      .argument(
        '<key>',
        'Configuration key (api-url, token-env-var)',
      )
      .argument('<value>', 'Configuration value')
      .option('--json', 'Output as JSON')
      .action((key, value) => {
        const { waitUntilExit } = renderCommand(
          <ConfigSetCommand configKey={key} configValue={value} />,
        );
        waitUntilExit().catch(() => process.exit(process.exitCode || 1));
      }),
  )
  .addCommand(
    new Command('reset')
      .description('Reset all configuration to defaults')
      .option('-f, --force', 'Skip confirmation prompt')
      .option('--json', 'Output as JSON')
      .action((options) => {
        const { waitUntilExit } = renderCommand(
          <ConfigResetCommand force={options.force} json={options.json} />,
        );
        waitUntilExit().catch(() => process.exit(process.exitCode || 1));
      }),
  )
  .addCommand(
    new Command('path')
      .description('Show configuration file path')
      .option('--json', 'Output as JSON')
      .action((options) => {
        const configPath = getConfigPath();
        if (options.json || isJsonMode()) {
          stdoutWrite(JSON.stringify({ path: configPath }));
        } else {
          stdoutWrite(configPath);
        }
      }),
  );
