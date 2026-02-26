import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useApp } from 'ink';
import { Select, Spinner, StatusMessage } from '@inkjs/ui';
import { Command } from 'commander';
import { App } from '../../components/App.js';
import { KeyValue } from '../../components/KeyValue.js';
import { setToken, setApiUrl, setWorkspaceId, setProjectId, getApiUrl } from '../../lib/config.js';
import { createSdkClient } from '../../lib/sdk-client.js';
import { fetchWorkspacesWithProjects } from '../../lib/workspaces.js';
import type { Project, WorkspaceWithProjects } from '../../lib/types.js';
import { openWithFallback } from '../../lib/browser.js';
import {
  getSignupWithCliAuthUrl,
  getWorkspaceCreateUrl,
  getProjectCreateUrl,
} from '../../lib/urls.js';
import { startAuthServer, type AuthServer } from '../../lib/auth-server.js';
import { renderCommand, jsonError, stdoutWrite, setUsageError } from '../../lib/render.js';
import { isNonInteractive, isJsonMode } from '../../lib/cli-flags.js';

type Step =
  | 'browserAuth'
  | 'verifying'
  | 'verified'
  | 'selectWorkspace'
  | 'selectProject'
  | 'done'
  | 'error';

interface SignupCommandProps {
  token?: string;
  skipContext?: boolean;
  skipVerify?: boolean;
  workspaceId?: string;
  projectId?: string;
  json?: boolean;
}

function SignupCommand({ token: tokenFlag, skipContext, skipVerify, workspaceId: wsIdFlag, projectId: projIdFlag, json: jsonProp }: SignupCommandProps): React.ReactElement {
  const json = jsonProp || isJsonMode();
  const { exit } = useApp();
  const [step, setStep] = useState<Step>(() => {
    if (tokenFlag) return 'verifying';
    if (isNonInteractive()) return 'error';
    return 'browserAuth';
  });
  const [token, setTokenValue] = useState(tokenFlag || '');
  const [error, setError] = useState<string | null>(null);

  // Set error for NI mode without token
  useEffect(() => {
    if (step === 'error' && !tokenFlag && isNonInteractive() && !error) {
      setUsageError();
      setError('Signup requires a browser. In non-interactive mode, use: unlayer login --token <pat>');
    }
  }, [step, tokenFlag, error]);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithProjects[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceWithProjects | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [authUrl, setAuthUrl] = useState<string>('');
  const authServerRef = useRef<AuthServer | null>(null);

  // Step: Browser auth — single browser open does signup + auth via returnUrl chain
  useEffect(() => {
    if (step !== 'browserAuth') return;

    let cancelled = false;

    (async () => {
      try {
        const server = await startAuthServer();
        if (cancelled) {
          server.close();
          return;
        }

        authServerRef.current = server;

        // Single browser open: signup page with returnUrl → cli-auth → localhost callback
        const url = getSignupWithCliAuthUrl(server.port, server.state);
        setAuthUrl(url);

        await openWithFallback(url);

        const result = await server.waitForAuth();
        if (cancelled) return;

        setTokenValue(result.token);
        setStep('verifying');
        server.close();
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Authentication failed';
        setError(msg);
        setStep('error');
      }
    })();

    return () => {
      cancelled = true;
      authServerRef.current?.close();
    };
  }, [step]);

  // Verify token
  useEffect(() => {
    if (step === 'verifying' && token) {
      if (skipVerify) {
        setToken(token);
        setApiUrl(getApiUrl());
        setStep('done');
        return;
      }
      const apiUrl = getApiUrl();
      const client = createSdkClient(token, apiUrl);
      fetchWorkspacesWithProjects(client)
        .then((detailed) => {
          setWorkspaces(detailed);
          setToken(token);
          setApiUrl(apiUrl);
          setStep('verified');
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : 'Verification failed';
          if (msg.includes('401') || msg.includes('Unauthorized')) {
            setError('Invalid token. Please check your token and try again.');
          } else {
            setError(msg);
          }
          setStep('error');
        });
    }
  }, [step, token]);

  // After verified, decide next step — auto-select when possible
  useEffect(() => {
    if (step !== 'verified') return;

    if (skipContext) {
      setStep('done');
      return;
    }

    if (workspaces.length === 0) {
      setStep('done');
      return;
    }

    // Auto-select workspace: flag > single workspace > interactive
    let ws: WorkspaceWithProjects | undefined;
    if (wsIdFlag) {
      const id = parseInt(wsIdFlag, 10);
      ws = workspaces.find((w) => w.id === id);
      if (!ws) {
        setError(`Workspace ID ${wsIdFlag} not found. Available: ${workspaces.map((w) => `${w.id} (${w.name})`).join(', ')}`);
        setStep('error');
        return;
      }
    } else if (workspaces.length === 1) {
      ws = workspaces[0];
    }

    if (ws) {
      setSelectedWorkspace(ws);
      setWorkspaceId(ws.id!);
      setProjectId(null);

      const projects = ws.projects || [];

      // Auto-select project: flag > single project > interactive
      if (projIdFlag) {
        const id = parseInt(projIdFlag, 10);
        const proj = projects.find((p) => p.id === id);
        if (!proj) {
          setError(`Project ID ${projIdFlag} not found in workspace "${ws.name}". Available: ${projects.map((p) => `${p.id} (${p.name})`).join(', ') || 'none'}`);
          setStep('error');
          return;
        }
        setSelectedProject(proj);
        setProjectId(proj.id!);
        setStep('done');
      } else if (projects.length === 1) {
        setSelectedProject(projects[0]);
        setProjectId(projects[0].id!);
        setStep('done');
      } else if (projects.length > 1) {
        if (isNonInteractive()) {
          setUsageError();
          setError(`Non-interactive mode: use --project-id <id> to select a project. Available: ${projects.map((p) => `${p.id} (${p.name})`).join(', ')}`);
          setStep('error');
          return;
        }
        setStep('selectProject');
      } else {
        setStep('done');
      }
    } else {
      if (isNonInteractive()) {
        setUsageError();
        setError(`Non-interactive mode: use --workspace-id <id> to select a workspace. Available: ${workspaces.map((w) => `${w.id} (${w.name})`).join(', ')}`);
        setStep('error');
        return;
      }
      setStep('selectWorkspace');
    }
  }, [step, skipContext, workspaces, wsIdFlag, projIdFlag]);

  const handleWorkspaceSelect = useCallback((value: string) => {
    if (value === '__create__') {
      openWithFallback(getWorkspaceCreateUrl());
      return;
    }
    const wsId = parseInt(value, 10);
    const ws = workspaces.find((w) => w.id === wsId);
    if (ws) {
      setSelectedWorkspace(ws);
      setWorkspaceId(wsId);
      setProjectId(null);
      if (ws.projects && ws.projects.length > 0) {
        setStep('selectProject');
      } else {
        setStep('done');
      }
    }
  }, [workspaces]);

  const handleProjectSelect = useCallback((value: string) => {
    if (value === '__create__' && selectedWorkspace) {
      openWithFallback(
        getProjectCreateUrl(selectedWorkspace.id!),
      );
      return;
    }
    const projId = parseInt(value, 10);
    const proj = selectedWorkspace?.projects?.find((p) => p.id === projId);
    if (proj) {
      setSelectedProject(proj);
      setProjectId(projId);
      setStep('done');
    }
  }, [selectedWorkspace]);

  // JSON output on success
  useEffect(() => {
    if (step === 'done' && json) {
      stdoutWrite(JSON.stringify({
        status: 'authenticated',
        apiUrl: getApiUrl(),
        workspace: selectedWorkspace ? { id: selectedWorkspace.id, name: selectedWorkspace.name } : null,
        project: selectedProject ? { id: selectedProject.id, name: selectedProject.name } : null,
      }, null, 2));
    }
  }, [step, json, selectedWorkspace, selectedProject]);

  // Auto-exit after done
  useEffect(() => {
    if (step === 'done') {
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
      {/* Step: Browser auth — single open for signup + auth */}
      {step === 'browserAuth' && (
        <Box flexDirection="column" gap={1}>
          <StatusMessage variant="info">
            Opening browser for signup...
          </StatusMessage>
          <Spinner label="Waiting for authentication..." />
          {authUrl ? (
            <>
              <Box marginLeft={4}>
                <Text dimColor>If the browser didn't open, visit:</Text>
              </Box>
              <Box marginLeft={4}>
                <Text dimColor>{authUrl}</Text>
              </Box>
            </>
          ) : null}
        </Box>
      )}

      {/* Step: Verifying */}
      {step === 'verifying' && (
        <Spinner label="Verifying credentials..." />
      )}

      {/* Step: Select workspace */}
      {step === 'selectWorkspace' && !isNonInteractive() && (
        <Box flexDirection="column" gap={1}>
          <StatusMessage variant="success">Credentials verified</StatusMessage>
          <Box>
            <Text>  Select a workspace:</Text>
          </Box>
          <Select
            options={[
              ...workspaces.map((ws) => ({
                label: ws.name || 'Unnamed',
                value: String(ws.id),
              })),
              {
                label: '+ Create new workspace (opens browser)',
                value: '__create__',
              },
            ]}
            onChange={handleWorkspaceSelect}
          />
        </Box>
      )}

      {/* Step: Select project */}
      {step === 'selectProject' && !isNonInteractive() && selectedWorkspace && (
        <Box flexDirection="column" gap={1}>
          <StatusMessage variant="success">Credentials verified</StatusMessage>
          <StatusMessage variant="info">
            {`Workspace: ${selectedWorkspace.name}`}
          </StatusMessage>
          <Box>
            <Text>  Select a project:</Text>
          </Box>
          <Select
            options={[
              ...(selectedWorkspace.projects || []).map((proj) => ({
                label: proj.name || 'Unnamed',
                value: String(proj.id),
              })),
              {
                label: '+ Create new project (opens browser)',
                value: '__create__',
              },
            ]}
            onChange={handleProjectSelect}
          />
        </Box>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <Box flexDirection="column" gap={1}>
          <StatusMessage variant="success">Credentials verified</StatusMessage>
          {selectedWorkspace && selectedProject && (
            <Box flexDirection="column">
              <Box
                flexDirection="column"
                borderStyle="round"
                borderColor="cyan"
                paddingX={2}
              >
                <Text bold>Context Updated</Text>
                <KeyValue
                  pairs={[
                    { key: 'Workspace', value: selectedWorkspace.name },
                    { key: 'Project', value: selectedProject.name },
                  ]}
                  indent={0}
                />
              </Box>
            </Box>
          )}
          <Box marginTop={1}>
            <StatusMessage variant="success">Welcome to Unlayer!</StatusMessage>
          </Box>
        </Box>
      )}

      {/* Step: Error */}
      {step === 'error' && error && (
        <Box flexDirection="column" gap={1}>
          <StatusMessage variant="error">{error}</StatusMessage>
          <Box marginLeft={4}>
            <Text dimColor>
              You can also authenticate manually: unlayer login --manual
            </Text>
          </Box>
        </Box>
      )}
    </App>
  );
}

export const signupCommand = new Command('signup')
  .description('Create an Unlayer account and connect your CLI')
  .option('-t, --token <token>', 'Personal Access Token (skip signup, just authenticate)')
  .option('--workspace-id <id>', 'Auto-select workspace by ID (agent-friendly)')
  .option('--project-id <id>', 'Auto-select project by ID (agent-friendly)')
  .option('--skip-context', 'Skip workspace/project selection')
  .option('--skip-verify', 'Skip token verification (for local development)')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const { waitUntilExit } = renderCommand(
      <SignupCommand
        token={options.token}
        workspaceId={options.workspaceId}
        projectId={options.projectId}
        skipContext={options.skipContext}
        skipVerify={options.skipVerify}
        json={options.json}
      />,
    );
    waitUntilExit().catch((err) => {
      if (err) {
        process.exit(process.exitCode || 1);
      }
    });
  });
