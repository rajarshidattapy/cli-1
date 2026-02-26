import React from 'react';
import { Box, Text } from 'ink';
import { CLI_VERSION } from '../lib/version.js';

interface HeaderProps {
  version?: string;
}

export function Header({ version = `v${CLI_VERSION}` }: HeaderProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>
        <Text color="blue">{'  █░█ █▄░█ █░░ ▄▀█ █▄█ █▀▀ █▀█'}</Text>
        <Text dimColor>{`  ${version}`}</Text>
      </Text>
      <Text color="blue">{'  █▄█ █░▀█ █▄▄ █▀█ ░█░ ██▄ █▀▄'}</Text>
    </Box>
  );
}
