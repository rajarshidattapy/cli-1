import React from 'react';
import { Box } from 'ink';
import { Header } from './Header.js';
import { isQuiet } from '../lib/cli-flags.js';

interface AppProps {
  children: React.ReactNode;
  showHeader?: boolean;
  version?: string;
}

export function App({
  children,
  showHeader = true,
  version,
}: AppProps): React.ReactElement {
  const shouldShowHeader = showHeader && !isQuiet();
  return (
    <Box flexDirection="column">
      {shouldShowHeader && <Header version={version} />}
      {children}
    </Box>
  );
}
