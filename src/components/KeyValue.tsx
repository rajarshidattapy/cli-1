import React from 'react';
import { Box, Text } from 'ink';

export interface KeyValuePair {
  key: string;
  value: string | number | boolean | null | undefined;
}

interface KeyValueProps {
  pairs: KeyValuePair[];
  indent?: number;
}

export function KeyValue({
  pairs,
  indent = 2,
}: KeyValueProps): React.ReactElement {
  const maxKeyLen = Math.max(...pairs.map((p) => p.key.length));
  const padding = ' '.repeat(indent);

  return (
    <Box flexDirection="column">
      {pairs.map((pair, index) => {
        const paddedKey = pair.key.padEnd(maxKeyLen);
        let displayValue: React.ReactElement;

        if (pair.value === null || pair.value === undefined) {
          displayValue = <Text dimColor>not set</Text>;
        } else if (typeof pair.value === 'boolean') {
          displayValue = pair.value ? (
            <Text color="green">yes</Text>
          ) : (
            <Text color="red">no</Text>
          );
        } else {
          displayValue = <Text>{String(pair.value)}</Text>;
        }

        return (
          <Box key={index}>
            <Text>
              {padding}
              <Text color="cyan">{paddedKey}</Text>
              {'  '}
            </Text>
            {displayValue}
          </Box>
        );
      })}
    </Box>
  );
}
